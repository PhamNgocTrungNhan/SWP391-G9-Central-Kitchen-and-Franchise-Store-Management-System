using Microsoft.EntityFrameworkCore;
using Shop2026.DAL;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class InventoryService
    {
        private readonly InventoryRepository _repo;

        public InventoryService(InventoryRepository repo) => _repo = repo;

        // Task BE2-08: Trừ nguyên liệu khi bắt đầu mẻ (Trạng thái chuyển sang IN_PROGRESS)
        public void DeductMaterialForBatch(ProductionBatch batch, int kitchenId)
        {
            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {
                var recipes = _repo.GetRecipeByProduct(batch.ProductId ?? 0);
                if (!recipes.Any())
                    throw new Exception($"Sản phẩm chưa có công thức BOM để trừ kho.");

                foreach (var item in recipes)
                {
                    // Tính số lượng cần trừ = (Số lượng dự kiến mẻ) * (Định mức) * (1 + % Hao hụt)
                    decimal quantityToDeduct = (batch.QuantityPlanned ?? 0) * item.QuantityRequired
                                               * (1 + (item.WasteAllowancePercent ?? 0) / 100);

                    // Trừ kho (Dấu âm)
                    UpdateStockAndLog(item.MaterialId ?? 0, "KITCHEN", kitchenId, -quantityToDeduct,
                                      "Sản xuất mẻ", batch.BatchId, "PRODUCTION_BATCH");
                }

                _repo.GetContext().SaveChanges();
                transaction.Commit();
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }

        // Cộng thành phẩm khi mẻ hoàn tất (Trạng thái chuyển sang COMPLETED)
        public void AddFinishedProduct(ProductionBatch batch, int kitchenId)
        {
            if (batch.QuantityActual == null || batch.QuantityActual <= 0)
                throw new Exception("Chưa cập nhật số lượng thực tế cho mẻ sản xuất.");

            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {
                UpdateStockAndLog(batch.ProductId ?? 0, "KITCHEN", kitchenId, batch.QuantityActual.Value,
                                  "Nhập thành phẩm", batch.BatchId, "PRODUCTION_BATCH");

                _repo.GetContext().SaveChanges();
                transaction.Commit();
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }

        // Xuất kho giao cho Store (Cập nhật SHIPPING và kiểm tra logic cận date)
        public void TransferToStore(InternalOrder order, List<InternalOrderDetail> details)
        {
            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {
                foreach (var detail in details)
                {

                    decimal quantityToShip = detail.QuantityConfirmed ?? detail.QuantityOrdered ?? 0;

                    // 1. Trừ kho Bếp (KITCHEN)
                    UpdateStockAndLog(detail.ProductId ?? 0, "KITCHEN", order.KitchenId ?? 1, -quantityToShip,
                                      "Xuất giao cửa hàng", order.OrderId, "INTERNAL_ORDER");

                    // 2. Chuyển trạng thái Order sang SHIPPING
                    order.OrderStatus = "SHIPPING";
                    detail.QuantityShipped = quantityToShip;
                }

                _repo.GetContext().SaveChanges();
                transaction.Commit();
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }

        // HÀM DÙNG CHUNG ( Ghi Log tự động)
        private void UpdateStockAndLog(int productId, string locationType, int locationId, decimal changeQty, string reason, int refId, string refType)
        {
            var stock = _repo.GetStock(productId, locationType, locationId);

            if (stock == null)
            {
                if (changeQty < 0)
                    throw new Exception($"Sản phẩm ID {productId} không đủ tồn kho để xuất.");

                stock = new Inventory
                {
                    ProductId = productId,
                    LocationType = locationType,
                    LocationId = locationId,
                    CurrentQuantity = changeQty,
                    LastUpdated = DateTime.Now
                };
                _repo.AddInventory(stock);
            }
            else
            {
                if (stock.CurrentQuantity + changeQty < 0)
                    throw new Exception($"Tồn kho sản phẩm ID {productId} bị âm, không thể thao tác.");

                stock.CurrentQuantity += changeQty;
                stock.LastUpdated = DateTime.Now;
                _repo.UpdateInventory(stock);
            }

            //  Ghi Log ngay lập tức
            var log = new StockLog
            {
                ProductId = productId,
                LocationType = locationType,
                LocationId = locationId,
                ChangeQuantity = changeQty,
                Reason = reason,
                ReferenceId = refId,
                ReferenceType = refType,
                CreatedAt = DateTime.Now
            };
            _repo.AddStockLog(log);
        }
        public IEnumerable<Inventory> GetAllStock()
        {
            return _repo.GetContext().Inventories.ToList();
        }

        // Hàm hỗ trợ xem lịch sử Log 
        public IEnumerable<StockLog> GetStockLogs()
        {
            return _repo.GetContext().StockLogs.OrderByDescending(x => x.CreatedAt).ToList();
        }

        // (Xuất kho dựa trên ID đơn hàng)
        public void TransferOrderToStore(int orderId)
        {
            var order = _repo.GetContext().InternalOrders
                             .Include(o => o.InternalOrderDetails)
                             .FirstOrDefault(o => o.OrderId == orderId)
                             ?? throw new Exception("Không tìm thấy đơn hàng nội bộ!");

            if (order.OrderStatus != "APPROVED" && order.OrderStatus != "PROCESSING")
                throw new Exception("Đơn hàng chưa được duyệt hoặc chưa sẵn sàng để xuất kho!");

            TransferToStore(order, order.InternalOrderDetails.ToList());
        }
    }
}