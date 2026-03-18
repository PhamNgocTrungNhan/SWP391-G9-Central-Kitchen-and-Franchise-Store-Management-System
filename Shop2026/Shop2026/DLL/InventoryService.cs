using Microsoft.EntityFrameworkCore;
using Shop2026.DAL;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class InventoryService
    {
        private readonly InventoryRepository _repo;

        public InventoryService(InventoryRepository repo) => _repo = repo;

        // Trừ nguyên liệu khi bắt đầu mẻ (Trừ xuyên thủng đến tận lớp RAW)
        public void DeductMaterialForBatch(ProductionBatch batch, int kitchenId)
        {
            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {

                var rawMaterialsToDeduct = new Dictionary<int, decimal>();

                // Gọi đệ quy để phân rã công thức từ sản phẩm gốc
                CalculateRawMaterialsRecursive(batch.ProductId ?? 0, batch.QuantityPlanned ?? 0, rawMaterialsToDeduct);

                if (!rawMaterialsToDeduct.Any())
                    throw new Exception("Không tìm thấy nguyên liệu RAW nào trong cây công thức.");

                // Tiến hành trừ kho hàng loạt các nguyên liệu RAW đã gom được
                foreach (var item in rawMaterialsToDeduct)
                {
                    int rawMaterialId = item.Key;
                    decimal qtyToDeduct = item.Value;

                    // Trừ kho 
                    UpdateStockAndLog(rawMaterialId, "KITCHEN", kitchenId, -qtyToDeduct,
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

        // THUẬT TOÁN ĐỆ QUY PHÂN RÃ CÔNG THỨC (BOM EXPLOSION)
        private void CalculateRawMaterialsRecursive(int productId, decimal requiredQty, Dictionary<int, decimal> aggregatedRawMaterials)
        {
            var product = _repo.GetProduct(productId) ?? throw new Exception($"Không tìm thấy sản phẩm ID {productId}");


            if (product.ProductType == "RAW")
            {
                if (aggregatedRawMaterials.ContainsKey(productId))
                    aggregatedRawMaterials[productId] += requiredQty;
                else
                    aggregatedRawMaterials[productId] = requiredQty;

                return;
            }

            // NẾU CHƯA PHẢI RAW: Lấy công thức (BOM) của sản phẩm này ra để đi tiếp xuống dưới
            var recipes = _repo.GetRecipeByProduct(productId);
            if (!recipes.Any())
                throw new Exception($"Sản phẩm '{product.ProductName}' cần được sản xuất nhưng chưa cấu hình công thức (BOM).");

            foreach (var recipe in recipes)
            {
                // Tính số lượng cho lớp con = (Số lượng cha) * (Định mức) * (1 + % Hao hụt)
                // Lưu ý: Chia cho 100m để ép kiểu decimal trong C# tránh sai số
                decimal childQty = requiredQty * recipe.QuantityRequired * (1 + (recipe.WasteAllowancePercent ?? 0) / 100m);

                // Tự gọi lại chính mình để đi sâu xuống lớp tiếp theo
                CalculateRawMaterialsRecursive(recipe.MaterialId ?? 0, childQty, aggregatedRawMaterials);
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

            // Ghi Log ngay lập tức
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

        // Get Store Inventory
        public IEnumerable<Inventory> GetStoreInventory(int storeId)
        {
            return _repo.GetContext().Inventories
                .Where(i => i.LocationType == "STORE" && i.LocationId == storeId)
                .ToList();
        }

        // Xuất kho dựa trên ID đơn hàng
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