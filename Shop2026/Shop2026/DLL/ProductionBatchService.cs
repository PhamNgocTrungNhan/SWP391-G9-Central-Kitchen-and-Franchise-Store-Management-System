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

        // BE2-04: Tạo mẻ sản xuất
        public ProductionBatch CreateBatch(BatchCreateRequest request)
        {
            if (request.QuantityPlanned <= 0)
                throw new Exception("Số lượng dự kiến phải lớn hơn 0");

            var batch = new ProductionBatch
            {
                ProductId = request.ProductId,
                // Tự động sinh mã mẻ sản xuất (BCH + NămThángNgàyGiờPhútGiây)
                BatchCode = "BCH" + DateTime.Now.ToString("yyyyMMddHHmmss"),
                QuantityPlanned = request.QuantityPlanned,

                // EF Core 8 chuyển SQL DATE thành kiểu DateOnly
                MfgDate = DateOnly.FromDateTime(request.MfgDate),
                Status = "SCHEDULED" // Trạng thái mặc định ban đầu
            };

            _repo.Add(batch);
            return batch;
        }

        // BE2-05: Cập nhật trạng thái
        public void UpdateStatus(int batchId, BatchStatusUpdateRequest request)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");

            // Task BE2-08: Nếu chuyển trạng thái sang Đang sản xuất -> Trừ nguyên liệu
            if (request.Status == "IN_PROGRESS" && batch.Status == "SCHEDULED")
            {
                // Giả sử KitchenId mặc định là 1 (Bếp trung tâm chính)
                _inventoryService.DeductMaterialForBatch(batch, kitchenId: 1);
            }

            // Task BE2-09: Nếu báo hoàn thành -> Cộng thành phẩm vào kho
            if (request.Status == "COMPLETED" && batch.Status == "IN_PROGRESS")
            {
                if (request.QuantityActual == null || request.QuantityActual <= 0)
                    throw new Exception("Phải nhập số lượng thực tế khi hoàn thành mẻ!");

                batch.QuantityActual = request.QuantityActual;

                _inventoryService.AddFinishedProduct(batch, kitchenId: 1);
            }

            batch.Status = request.Status;
            _repo.Update(batch);
        }

        // BE2-06: Gán mẻ cho Order
        public void AllocateBatchToOrders(int batchId, List<BatchAllocationRequest> requests)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");

            // Map từ DTO sang Model của Database
            var allocations = requests.Select(r => new ProductionBatchOrder
            {
                BatchId = batchId,
                OrderId = r.OrderId,
                AllocatedQuantity = r.AllocatedQuantity
            }).ToList();

            _repo.AllocateOrders(allocations);
        }

        // BE2-07: Hủy mẻ
        public void CancelBatch(int batchId)
        {
            var batch = _repo.GetById(batchId) ?? throw new Exception("Không tìm thấy mẻ sản xuất");

            // Ràng buộc: Đang nấu hoặc nấu xong rồi thì không được hủy
            if (batch.Status == "IN_PROGRESS" || batch.Status == "COMPLETED")
                throw new Exception("Không thể hủy mẻ đang sản xuất hoặc đã hoàn thành!");

            batch.Status = "CANCELLED";
            _repo.Update(batch);
        }
    }
}