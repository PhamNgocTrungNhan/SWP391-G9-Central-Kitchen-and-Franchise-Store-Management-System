using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;

namespace Shop2026.DLL
{
    public class ProductionBatchService
    {
        private readonly ProductionBatchRepository _repo;
        private readonly InventoryService _inventoryService;

        public ProductionBatchService(ProductionBatchRepository repo, InventoryService inventoryService)
        {
            _repo = repo;
            _inventoryService = inventoryService;
        }

        public ProductionBatch? GetById(int batchId) => _repo.GetById(batchId);

        public IEnumerable<BatchResponse> GetAll()
        {
            var batches = _repo.GetAll();
            return batches.Select(b => new BatchResponse
            {
                BatchId = b.BatchId,
                ProductId = b.ProductId,
                ProductName = b.Product?.ProductName,
                BatchCode = b.BatchCode,
                QuantityPlanned = b.QuantityPlanned,
                QuantityActual = b.QuantityActual,
                MfgDate = b.MfgDate.HasValue ? b.MfgDate.Value.ToDateTime(TimeOnly.MinValue) : null,
                ExpDate = b.ExpDate.HasValue ? b.ExpDate.Value.ToDateTime(TimeOnly.MinValue) : null,
                Status = b.Status,
                OrderIds = b.ProductionBatchOrders.Select(pbo => pbo.OrderId).ToList()
            }).ToList();
        }

        public IEnumerable<BatchResponse> GetBatchesByOrderId(int orderId)
        {
            var batches = _repo.GetBatchesByOrderId(orderId);
            return batches.Select(b => new BatchResponse
            {
                BatchId = b.BatchId,
                ProductId = b.ProductId,
                ProductName = b.Product?.ProductName,
                BatchCode = b.BatchCode,
                QuantityPlanned = b.QuantityPlanned,
                QuantityActual = b.QuantityActual,
                MfgDate = b.MfgDate.HasValue ? b.MfgDate.Value.ToDateTime(TimeOnly.MinValue) : null,
                ExpDate = b.ExpDate.HasValue ? b.ExpDate.Value.ToDateTime(TimeOnly.MinValue) : null,
                Status = b.Status,
                OrderIds = b.ProductionBatchOrders.Select(pbo => pbo.OrderId).ToList()
            }).ToList();
        }

        public ProductionBatch CreateBatch(BatchCreateRequest request)
        {
            if (request.QuantityPlanned <= 0)
                throw new Exception("Số lượng dự kiến phải lớn hơn 0");

            var batch = new ProductionBatch
            {
                ProductId = request.ProductId,
                BatchCode = "BCH" + DateTime.Now.ToString("yyyyMMddHHmmss"),
                QuantityPlanned = request.QuantityPlanned,
                MfgDate = DateOnly.FromDateTime(request.MfgDate),
                ExpDate = request.ExpDate.HasValue ? DateOnly.FromDateTime(request.ExpDate.Value) : null,
                Status = "SCHEDULED"
            };

            _repo.Add(batch);

            if (request.OrderId.HasValue && request.OrderId.Value > 0)
            {
                var allocation = new ProductionBatchOrder
                {
                    BatchId = batch.BatchId,
                    OrderId = request.OrderId.Value,
                    AllocatedQuantity = request.QuantityPlanned
                };
                _repo.AllocateOrders(new List<ProductionBatchOrder> { allocation });

                var order = _repo.GetContext().InternalOrders
                    .Include(o => o.InternalOrderDetails)
                    .FirstOrDefault(o => o.OrderId == request.OrderId.Value);

                if (order != null && order.OrderStatus == "APPROVED")
                {
                    var distinctProductCountInOrder = order.InternalOrderDetails
                        .Select(d => d.ProductId)
                        .Distinct()
                        .Count();

                    var batchesForOrder = _repo.GetContext().ProductionBatchOrders
                        .Where(pbo => pbo.OrderId == request.OrderId.Value)
                        .Select(pbo => pbo.BatchId)
                        .ToList();

                    var distinctProductsWithBatch = _repo.GetContext().ProductionBatches
                        .Where(pb => batchesForOrder.Contains(pb.BatchId))
                        .Select(pb => pb.ProductId)
                        .Distinct()
                        .Count();

                    if (distinctProductsWithBatch == distinctProductCountInOrder)
                    {
                        order.OrderStatus = "PROCESSING";
                        order.UpdatedAt = DateTime.Now;
                        _repo.GetContext().SaveChanges();
                    }
                }
            }

            return batch;
        }

        public void UpdateStatus(int batchId, BatchStatusUpdateRequest request)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");
            var normalizedStatus = request.Status?.ToUpper();

            if (normalizedStatus == "IN_PROGRESS")
            {
                if (batch.Status != "SCHEDULED")
                    throw new Exception("Chỉ có thể bắt đầu mẻ khi đang ở trạng thái SCHEDULED");

                batch.Status = "IN_PROGRESS";
                _repo.Update(batch);
            }
            else if (normalizedStatus == "COMPLETED")
            {
                if (batch.Status != "IN_PROGRESS")
                    throw new Exception("Mẻ phải ở trạng thái Đang sản xuất (IN_PROGRESS) mới có thể Hoàn thành!");
                if (request.QuantityActual == null || request.QuantityActual <= 0)
                    throw new Exception("Phải nhập số lượng thực tế (lớn hơn 0) khi hoàn thành mẻ!");

                using var transaction = _repo.GetContext().Database.BeginTransaction();
                try
                {
                    batch.QuantityActual = request.QuantityActual;
                    batch.Status = "COMPLETED";
                    _repo.GetContext().ProductionBatches.Update(batch);

                    _inventoryService.DeductMaterialForBatch(batch, 1, true);

                    if (request.AdditionalMaterials != null && request.AdditionalMaterials.Any())
                    {
                        foreach (var extra in request.AdditionalMaterials)
                        {
                            _inventoryService.UpdateStockAndLog(
                                extra.ProductId, "KITCHEN", 1, -extra.QuantityUsed,
                                "Sử dụng thêm ngoài công thức", batch.BatchId, "EXTRA_MATERIAL", null
                            );
                        }
                    }

                    _inventoryService.AddFinishedProduct(batch, 1, true);

                    _repo.GetContext().SaveChanges();
                    transaction.Commit();
                }
                catch (Exception)
                {
                    transaction.Rollback();
                    throw;
                }
            }
            else
            {
                batch.Status = normalizedStatus ?? request.Status;
                _repo.Update(batch);
            }
        }

        public void AllocateBatchToOrders(int batchId, List<BatchAllocationRequest> requests)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");
            var allocations = requests.Select(r => new ProductionBatchOrder
            {
                BatchId = batchId,
                OrderId = r.OrderId,
                AllocatedQuantity = r.AllocatedQuantity
            }).ToList();
            _repo.AllocateOrders(allocations);
        }

        public void CancelBatch(int batchId)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");
            if (batch.Status == "IN_PROGRESS" || batch.Status == "COMPLETED")
                throw new Exception("Không thể hủy mẻ đang sản xuất hoặc đã hoàn thành!");

            batch.Status = "CANCELLED";
            _repo.Update(batch);
        }

        // ========================================================
        // 🔥 HÀM MỚI: XỬ LÝ NỘP BÁO CÁO HAO HỤT VÀ HOÀN THÀNH MẺ
        // ========================================================
        public void CompleteBatch(int batchId, CompleteBatchRequest request, int kitchenId = 1)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");

            if (batch.Status != "IN_PROGRESS")
                throw new Exception("Mẻ phải ở trạng thái Đang sản xuất (IN_PROGRESS) mới có thể Hoàn thành!");

            if (request.QuantityActual <= 0)
                throw new Exception("Số lượng thực tế phải lớn hơn 0!");

            // Lấy toàn bộ công thức gốc của sản phẩm này để đối chiếu
            var recipes = _repo.GetContext().RecipesBoms.Where(r => r.ParentProductId == batch.ProductId).ToList();

            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {
                batch.QuantityActual = request.QuantityActual;
                batch.Status = "COMPLETED";
                _repo.Update(batch);

                foreach (var usage in request.MaterialUsages)
                {
                    var recipeLine = recipes.FirstOrDefault(r => r.MaterialId == usage.MaterialId);
                    if (recipeLine == null)
                        throw new Exception($"LỖI: Nguyên liệu ID {usage.MaterialId} không có trong công thức của sản phẩm này.");

                    // 1. Tính định mức tịnh (Net) dựa trên số lượng bánh thực tế làm ra
                    decimal standardNetQty = request.QuantityActual * recipeLine.QuantityRequired;

                    // 2. Tính định mức hao hụt tối đa cho phép (Max Waste Allowed)
                    decimal maxWastePercent = recipeLine.MaxWastePercent ?? 0m;
                    decimal grossQtyAllowed = (maxWastePercent > 0 && maxWastePercent < 100)
                                              ? standardNetQty / (1m - (maxWastePercent / 100m))
                                              : standardNetQty;

                    decimal maxWasteAllowed = grossQtyAllowed - standardNetQty;

                    // 3. SO SÁNH VỚI THỰC TẾ BẾP BÁO CÁO (Nghiệp vụ yêu cầu)
                    if (usage.ActualWasted > maxWasteAllowed)
                    {
                        throw new Exception($"Nghi vấn thất thoát! Hao hụt của nguyên liệu ID {usage.MaterialId} ({usage.ActualWasted}) đã vượt quá định mức tối đa cho phép ({Math.Round(maxWasteAllowed, 2)}).");
                    }

                    // 4. Lưu báo cáo hao hụt vào Database cho kế toán xem
                    var batchMaterial = new ProductionBatchMaterial
                    {
                        BatchId = batchId,
                        MaterialId = usage.MaterialId,
                        ActualUsed = usage.ActualUsed,
                        ActualWasted = usage.ActualWasted
                    };
                    _repo.GetContext().ProductionBatchMaterials.Add(batchMaterial);

                    // 5. Trừ kho lượng Gross thực tế (Dùng + Vứt đi)
                    decimal totalDeduct = usage.ActualUsed + usage.ActualWasted;
                    _inventoryService.UpdateStockAndLog(
                        usage.MaterialId, "KITCHEN", kitchenId, -totalDeduct,
                        $"Sản xuất mẻ (Dùng: {usage.ActualUsed}, Hao hụt: {usage.ActualWasted})", batchId, "PRODUCTION_BATCH", null
                    );
                }

                // 6. Nhập kho thành phẩm
                _inventoryService.UpdateStockAndLog(
                    batch.ProductId ?? 0, "KITCHEN", kitchenId, request.QuantityActual,
                    "Nhập kho thành phẩm từ mẻ sản xuất", batchId, "PRODUCTION_BATCH", null
                );

                _repo.GetContext().SaveChanges();
                transaction.Commit();
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }
    }
}
