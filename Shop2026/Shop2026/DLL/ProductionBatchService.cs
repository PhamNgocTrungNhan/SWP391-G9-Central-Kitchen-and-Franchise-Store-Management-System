using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;
using System;
using System.Collections.Generic;
using System.Linq;

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

                var order = _repo.GetContext().InternalOrders.Find(request.OrderId.Value);
                if (order != null)
                {
                    order.OrderStatus = "PROCESSING";
                    order.UpdatedAt = DateTime.Now;
                    _repo.GetContext().SaveChanges();
                }
            }

            return batch;
        }

        public void UpdateStatus(int batchId, BatchStatusUpdateRequest request)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");

            if (request.Status == "IN_PROGRESS")
            {
                if (batch.Status != "SCHEDULED")
                    throw new Exception("Chỉ có thể bắt đầu mẻ khi đang ở trạng thái SCHEDULED");

                batch.Status = "IN_PROGRESS";
                _repo.GetContext().SaveChanges(); // Dùng Tracking, không gọi Update rác
            }
            else if (request.Status == "COMPLETED")
            {
                if (batch.Status != "IN_PROGRESS")
                    throw new Exception("Mẻ phải ở trạng thái Đang sản xuất (IN_PROGRESS) mới có thể Hoàn thành!");

                // Chặn số lượng âm hoặc null (Test Case 2)
                if (request.QuantityActual == null || request.QuantityActual <= 0)
                    throw new Exception("Phải nhập số lượng thực tế (lớn hơn 0) khi hoàn thành mẻ!");

                // SIÊU GIAO DỊCH BẢO VỆ TOÀN BỘ LUỒNG
                using var transaction = _repo.GetContext().Database.BeginTransaction();
                try
                {
                    batch.QuantityActual = request.QuantityActual;
                    batch.Status = "COMPLETED";

                    // 1. Trừ BOM (Truyền true để xài chung transaction)
                    _inventoryService.DeductMaterialForBatch(batch, 1, true);

                    // 2. Trừ Extra Materials
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

                    // 3. Cộng Thành phẩm (Truyền true)
                    _inventoryService.AddFinishedProduct(batch, 1, true);

                    // CHỐT ĐƠN: LƯU VÀ COMMIT
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
                batch.Status = request.Status;
                _repo.GetContext().SaveChanges();
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
            _repo.GetContext().SaveChanges();
        }
    }
}