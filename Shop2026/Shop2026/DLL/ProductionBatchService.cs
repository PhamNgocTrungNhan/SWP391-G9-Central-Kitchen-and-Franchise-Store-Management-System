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
        public IEnumerable<ProductionBatch> GetAll() => _repo.GetAll();

        public IEnumerable<ProductionBatch> GetBatchesByOrderId(int orderId)
        {
            return _repo.GetBatchesByOrderId(orderId);
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

                // 🚨 ĐÃ BỔ SUNG: Hứng ngày hết hạn từ DTO truyền xuống lưu vào Database
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

                // ✅ SỬA LOGIC: Chỉ chuyển status sang PROCESSING khi đã tạo batch cho TẤT CẢ product trong order
                var order = _repo.GetContext().InternalOrders
                    .Include(o => o.InternalOrderDetails)
                    .FirstOrDefault(o => o.OrderId == request.OrderId.Value);

                if (order != null && order.OrderStatus == "APPROVED")
                {
                    // Lấy danh sách các product trong order
                    var productIdsInOrder = order.InternalOrderDetails
                        .Select(d => d.ProductId)
                        .Distinct()
                        .ToList();

                    // Lấy danh sách các product đã có batch
                    var productIdsWithBatch = _repo.GetContext().ProductionBatchOrders
                        .Where(pbo => pbo.OrderId == request.OrderId.Value)
                        .Join(_repo.GetContext().ProductionBatches,
                            pbo => pbo.BatchId,
                            pb => pb.BatchId,
                            (pbo, pb) => pb.ProductId)
                        .Distinct()
                        .ToList();

                    // Chỉ chuyển sang PROCESSING nếu đã tạo batch cho TẤT CẢ product
                    bool allProductsHaveBatch = productIdsInOrder.All(pid => productIdsWithBatch.Contains(pid));

                    if (allProductsHaveBatch)
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
    }
}