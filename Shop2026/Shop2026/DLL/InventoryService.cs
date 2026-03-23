using Microsoft.EntityFrameworkCore;
using Shop2026.DAL;
using Shop2026.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Shop2026.DLL
{
    public class InventoryService
    {
        private readonly InventoryRepository _repo;

        public InventoryService(InventoryRepository repo) => _repo = repo;

        // Trừ nguyên liệu khi hoàn thành mẻ (Trừ xuyên thủng đến tận lớp RAW)
        public void DeductMaterialForBatch(ProductionBatch batch, int kitchenId, bool useExternalTransaction = false)
        {
            var transaction = useExternalTransaction ? null : _repo.GetContext().Database.BeginTransaction();
            try
            {
                var rawMaterialsToDeduct = new Dictionary<int, decimal>();

                // Lấy số lượng THỰC TẾ (QuantityActual) để tính toán trừ nguyên liệu
                decimal actualQty = batch.QuantityActual ?? batch.QuantityPlanned ?? 0;

                CalculateRawMaterialsRecursive(batch.ProductId ?? 0, actualQty, rawMaterialsToDeduct);

                if (!rawMaterialsToDeduct.Any())
                    throw new Exception("Không tìm thấy nguyên liệu RAW nào trong cây công thức.");

                foreach (var item in rawMaterialsToDeduct)
                {
                    UpdateStockAndLog(item.Key, "KITCHEN", kitchenId, -item.Value,
                                      "Sản xuất mẻ", batch.BatchId, "PRODUCTION_BATCH");
                }

                if (!useExternalTransaction)
                {
                    _repo.GetContext().SaveChanges();
                    transaction?.Commit();
                }
            }
            catch (Exception)
            {
                transaction?.Rollback();
                throw;
            }
        }

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

            var recipes = _repo.GetRecipeByProduct(productId);
            if (!recipes.Any())
                throw new Exception($"Sản phẩm '{product.ProductName}' cần được sản xuất nhưng chưa cấu hình công thức (BOM).");

            foreach (var recipe in recipes)
            {
                // Ép kiểu chia 100m để chuẩn xác
                decimal childQty = requiredQty * recipe.QuantityRequired * (1 + (recipe.WasteAllowancePercent ?? 0) / 100m);
                CalculateRawMaterialsRecursive(recipe.MaterialId ?? 0, childQty, aggregatedRawMaterials);
            }
        }

        // Cộng thành phẩm khi mẻ hoàn tất
        public void AddFinishedProduct(ProductionBatch batch, int kitchenId, bool useExternalTransaction = false)
        {
            if (batch.QuantityActual == null || batch.QuantityActual <= 0)
                throw new Exception("Chưa cập nhật số lượng thực tế cho mẻ sản xuất.");

            var transaction = useExternalTransaction ? null : _repo.GetContext().Database.BeginTransaction();
            try
            {
                UpdateStockAndLog(batch.ProductId ?? 0, "KITCHEN", kitchenId, batch.QuantityActual.Value,
                                  "Nhập thành phẩm", batch.BatchId, "PRODUCTION_BATCH");

                if (!useExternalTransaction)
                {
                    _repo.GetContext().SaveChanges();
                    transaction?.Commit();
                }
            }
            catch (Exception)
            {
                transaction?.Rollback();
                throw;
            }
        }

        public void TransferToStore(InternalOrder order, List<InternalOrderDetail> details)
        {
            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {
                foreach (var detail in details)
                {
                    decimal quantityToShip = detail.QuantityConfirmed ?? detail.QuantityOrdered ?? 0;
                    UpdateStockAndLog(detail.ProductId ?? 0, "KITCHEN", order.KitchenId ?? 1, -quantityToShip,
                                      "Xuất giao cửa hàng", order.OrderId, "INTERNAL_ORDER");

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

        public IEnumerable<Inventory> GetAllStock() => _repo.GetContext().Inventories.ToList();
        public IEnumerable<StockLog> GetStockLogs() => _repo.GetContext().StockLogs.OrderByDescending(x => x.CreatedAt).ToList();

        public IEnumerable<Inventory> GetStoreInventory(int storeId)
        {
            return _repo.GetContext().Inventories
                .Where(i => i.LocationType == "STORE" && i.LocationId == storeId)
                .ToList();
        }

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

        public void ImportRawMaterial(int productId, decimal quantity, int kitchenId, int supplierId)
        {
            if (quantity <= 0)
                throw new Exception("Số lượng nhập kho phải lớn hơn 0.");

            var product = _repo.GetProduct(productId) ?? throw new Exception("Không tìm thấy sản phẩm.");
            if (product.ProductType != "RAW")
                throw new Exception($"Lỗi: Chỉ được nhập Nguyên liệu thô (RAW).");

            var supplier = _repo.GetContext().Suppliers.Find(supplierId) ?? throw new Exception("Không tìm thấy nhà cung cấp.");
            if (!supplier.IsActive)
                throw new Exception($"Lỗi: Nhà cung cấp đang nằm trong Blacklist!");

            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {
                string logReason = $"Nhập nguyên liệu từ NCC: {supplier.SupplierName}";
                UpdateStockAndLog(productId, "KITCHEN", kitchenId, quantity, logReason, 0, "IMPORT_SUPPLIER", supplierId);
                _repo.GetContext().SaveChanges();
                transaction.Commit();
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }

        // Đã gộp thành 1 hàm duy nhất
        public void UpdateStockAndLog(int productId, string locationType, int locationId, decimal changeQty, string reason, int refId, string refType, int? supplierId = null)
        {
            var stock = _repo.GetStock(productId, locationType, locationId);

            if (stock == null)
            {
                if (changeQty < 0)
                    throw new Exception($"Sản phẩm ID {productId} không đủ tồn kho để xuất.");
                stock = new Inventory { ProductId = productId, LocationType = locationType, LocationId = locationId, CurrentQuantity = changeQty, LastUpdated = DateTime.Now };
                _repo.AddInventory(stock);
            }
            else
            {
                if (stock.CurrentQuantity + changeQty < 0)
                    throw new Exception($"Tồn kho sản phẩm bị âm.");
                stock.CurrentQuantity += changeQty;
                stock.LastUpdated = DateTime.Now;
                _repo.UpdateInventory(stock);
            }

            var log = new StockLog
            {
                ProductId = productId,
                LocationType = locationType,
                LocationId = locationId,
                ChangeQuantity = changeQty,
                Reason = reason,
                ReferenceId = refId,
                ReferenceType = refType,
                SupplierId = supplierId,
                CreatedAt = DateTime.Now
            };
            _repo.AddStockLog(log);
        }
    }
}