using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;

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

        public ProductionBatch? GetById(int batchId)
        {
            return _repo.GetById(batchId);
        }

        public IEnumerable<ProductionBatch> GetAll()
        {
            return _repo.GetAll();
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
                Status = "SCHEDULED"
            };

            _repo.Add(batch);

            // LUỒNG 2: Nếu FE truyền OrderId lên, tự động gán mẻ cho Đơn và đổi trạng thái Đơn
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
                    order.OrderStatus = "PROCESSING"; // Đổi đơn sang Đang sản xuất
                    order.UpdatedAt = DateTime.Now;
                    _repo.GetContext().SaveChanges();
                }
            }

            return batch;
        }

        public void UpdateStatus(int batchId, BatchStatusUpdateRequest request)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");

            // LUỒNG 2.1 - TRƯỜNG HỢP 1: Bắt đầu nấu -> CHỈ ĐỔI TRẠNG THÁI, KHÔNG TRỪ KHO
            if (request.Status == "IN_PROGRESS" && batch.Status == "SCHEDULED")
            {
                batch.Status = "IN_PROGRESS";
            }
            // LUỒNG 2.1 - TRƯỜNG HỢP 2: Nấu xong -> TRỪ KHO (Gốc + Phát sinh) & CỘNG THÀNH PHẨM
            else if (request.Status == "COMPLETED" && batch.Status == "IN_PROGRESS")
            {
                if (request.QuantityActual == null || request.QuantityActual <= 0)
                    throw new Exception("Phải nhập số lượng thực tế khi hoàn thành mẻ!");

                batch.QuantityActual = request.QuantityActual;

                // 1. Trừ nguyên liệu gốc (BOM)
                _inventoryService.DeductMaterialForBatch(batch, kitchenId: 1);

                // 2. Trừ nguyên liệu dùng thêm (Nếu có)
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

                // 3. Cộng Thành phẩm tạo ra vào kho
                _inventoryService.AddFinishedProduct(batch, kitchenId: 1);

                batch.Status = "COMPLETED";
            }
            else
            {
                batch.Status = request.Status;
            }

            _repo.Update(batch);
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