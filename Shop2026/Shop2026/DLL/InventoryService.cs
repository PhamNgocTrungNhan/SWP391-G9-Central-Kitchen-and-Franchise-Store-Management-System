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

        public void DeductMaterialForBatch(ProductionBatch batch, int kitchenId, bool useExternalTransaction = false)
        {
            var transaction = useExternalTransaction ? null : _repo.GetContext().Database.BeginTransaction();
            try
            {
                var rawMaterialsToDeduct = new Dictionary<int, decimal>();
                decimal actualQty = batch.QuantityActual ?? batch.QuantityPlanned ?? 0;

                // Bắt đầu đệ quy từ bánh thành phẩm (Gửi lượng bánh Net xuống để phân rã)
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

        // ==========================================
        // ✅ THUẬT TOÁN ĐỆ QUY TÍNH HAO HỤT MỚI
        // ==========================================
        private void CalculateRawMaterialsRecursive(int productId, decimal requiredNetQty, Dictionary<int, decimal> aggregatedRawMaterials)
        {
            var product = _repo.GetProduct(productId) ?? throw new Exception($"Không tìm thấy sản phẩm ID {productId}");

            // 1. Lấy tỷ lệ hao hụt từ bảng Product
            decimal wastePercent = product.DefaultWastePercent ?? 0m;
            if (wastePercent >= 100)
                throw new Exception($"Sản phẩm '{product.ProductName}' có tỷ lệ hao hụt không hợp lệ ({wastePercent}%). Hao hụt phải < 100%.");

            // 2. Tính lượng Gross (Thô) thực tế cần xuất kho (hoặc cần sản xuất)
            decimal grossQty = (wastePercent > 0)
                               ? requiredNetQty / (1m - (wastePercent / 100m))
                               : requiredNetQty;

            // Nếu chạm đáy là đồ RAW (Bột, Thịt...) -> Ghi nhận lượng Gross vào sổ để chuẩn bị xuất kho
            if (product.ProductType == "RAW")
            {
                if (aggregatedRawMaterials.ContainsKey(productId))
                    aggregatedRawMaterials[productId] += grossQty;
                else
                    aggregatedRawMaterials[productId] = grossQty;
                return;
            }

            // Nếu là Bánh hoặc Bán thành phẩm -> Tìm công thức BOM
            var recipes = _repo.GetRecipeByProduct(productId);
            if (!recipes.Any())
                throw new Exception($"Sản phẩm '{product.ProductName}' cần được sản xuất nhưng chưa cấu hình công thức (BOM).");

            // Phân rã tiếp các nguyên liệu con để gom đủ lượng GrossQty của cha
            foreach (var recipe in recipes)
            {
                // Mỗi cái bánh cha cần 'QuantityRequired' nguyên liệu con.
                decimal childNetQty = grossQty * recipe.QuantityRequired;

                // Gọi đệ quy tiếp tục chui xuống dưới
                CalculateRawMaterialsRecursive(recipe.MaterialId ?? 0, childNetQty, aggregatedRawMaterials);
            }
        }

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
                var trackedOrder = _repo.GetContext().InternalOrders.Find(order.OrderId);
                if (trackedOrder == null)
                    throw new Exception("Không tìm thấy đơn hàng");

                foreach (var detail in details)
                {
                    decimal quantityToShip = (detail.QuantityConfirmed > 0)
                        ? detail.QuantityConfirmed.Value
                        : (detail.QuantityOrdered ?? 0);

                    if (quantityToShip <= 0)
                        continue;

                    UpdateStockAndLog(detail.ProductId ?? 0, "KITCHEN", order.KitchenId ?? 1, -quantityToShip,
                                      "Xuất giao cửa hàng", order.OrderId, "INTERNAL_ORDER");

                    var trackedDetail = _repo.GetContext().InternalOrderDetails.Find(detail.DetailId);
                    if (trackedDetail != null)
                    {
                        trackedDetail.QuantityShipped = quantityToShip;
                    }
                }

                trackedOrder.OrderStatus = "SHIPPING";
                trackedOrder.UpdatedAt = DateTime.Now;

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

        public void UpdateStockAndLog(int productId, string locationType, int locationId, decimal changeQty, string reason, int refId, string refType, int? supplierId = null)
        {
            var stock = _repo.GetStock(productId, locationType, locationId);

            if (stock == null)
            {
                if (changeQty < 0)
                    throw new Exception($"Sản phẩm ID {productId} không tồn tại trong kho {locationType}. Không thể xuất kho.");

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
                var newQuantity = stock.CurrentQuantity + changeQty;
                if (newQuantity < 0)
                    throw new Exception($"Không đủ tồn kho. Hiện tại: {stock.CurrentQuantity}, Cần xuất: {Math.Abs(changeQty)}");

                stock.CurrentQuantity = newQuantity;
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

        public void ScanAndRemoveExpiredStock()
        {
            var dbContext = _repo.GetContext();
            var kitchenInventories = dbContext.Inventories
                .Where(i => i.LocationType == "KITCHEN" && i.CurrentQuantity > 0)
                .ToList();

            using var transaction = dbContext.Database.BeginTransaction();
            try
            {
                foreach (var inv in kitchenInventories)
                {
                    int productId = inv.ProductId ?? 0;
                    decimal currentQty = inv.CurrentQuantity ?? 0;

                    var batches = dbContext.ProductionBatches
                        .Where(b => b.ProductId == productId && b.Status == "COMPLETED")
                        .OrderBy(b => b.MfgDate).ThenBy(b => b.BatchId)
                        .ToList();

                    decimal totalProduced = batches.Sum(b => b.QuantityActual ?? 0);
                    decimal virtualSold = totalProduced - currentQty;
                    if (virtualSold < 0)
                        virtualSold = 0;

                    foreach (var batch in batches)
                    {
                        decimal batchQty = batch.QuantityActual ?? 0;

                        if (virtualSold >= batchQty)
                        {
                            virtualSold -= batchQty;
                            continue;
                        }

                        decimal remainingQty = batchQty - virtualSold;
                        virtualSold = 0;

                        if (batch.ExpDate.HasValue)
                        {
                            var today = DateOnly.FromDateTime(DateTime.Now);
                            if (batch.ExpDate.Value < today)
                            {
                                string reason = $"Hủy hàng hết hạn (Mẻ {batch.BatchCode})";
                                UpdateStockAndLog(productId, "KITCHEN", inv.LocationId ?? 1, -remainingQty, reason, batch.BatchId, "EXPIRED_BATCH");
                            }
                        }
                    }
                }

                dbContext.SaveChanges();
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