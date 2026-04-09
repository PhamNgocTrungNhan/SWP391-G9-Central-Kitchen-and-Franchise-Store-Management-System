using Microsoft.EntityFrameworkCore;
using Shop2026.DAL;
using Shop2026.Models;
using Shop2026.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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
        // ✅ THUẬT TOÁN ĐỆ QUY TÍNH NGUYÊN LIỆU THEO BOM GỐC
        // Không tự cộng hao hụt vào định mức trừ kho cơ bản.
        // ==========================================
        private void CalculateRawMaterialsRecursive(int productId, decimal requiredNetQty, Dictionary<int, decimal> aggregatedRawMaterials)
        {
            var product = _repo.GetProduct(productId) ?? throw new Exception($"Không tìm thấy sản phẩm ID {productId}");

            // Nếu chạm đáy là đồ RAW (Bột, Thịt...) -> Ghi nhận lượng Gross vào sổ để chuẩn bị xuất kho
            if (product.ProductType == "RAW")
            {
                if (aggregatedRawMaterials.ContainsKey(productId))
                    aggregatedRawMaterials[productId] += requiredNetQty;
                else
                    aggregatedRawMaterials[productId] = requiredNetQty;
                return;
            }

            // Nếu là Bánh hoặc Bán thành phẩm -> Tìm công thức BOM
            var recipes = _repo.GetRecipeByProduct(productId);
            if (!recipes.Any())
                throw new Exception($"Sản phẩm '{product.ProductName}' cần được sản xuất nhưng chưa cấu hình công thức (BOM).");

            // Phân rã tiếp các nguyên liệu con theo định mức BOM gốc.
            foreach (var recipe in recipes)
            {
                // Áp dụng tính hao hụt từ nhánh update_function_material (đã fix lỗi tên biến requiredNetQty)
                decimal childQty = requiredNetQty * recipe.QuantityRequired * (1 + (recipe.MaxWastePercent ?? 0) / 100m);
                CalculateRawMaterialsRecursive(recipe.MaterialId ?? 0, childQty, aggregatedRawMaterials);
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
                if (order.StoreId <= 0)
                    throw new Exception("Đơn hàng thiếu StoreId hợp lệ để cộng tồn kho cửa hàng.");

                foreach (var detail in details)
                {
                    decimal quantityToShip = (detail.QuantityConfirmed > 0)
                        ? detail.QuantityConfirmed.Value
                        : (detail.QuantityOrdered ?? 0);

                    if (quantityToShip <= 0)
                        continue;

                    UpdateStockAndLog(detail.ProductId ?? 0, "KITCHEN", order.KitchenId ?? 1, -quantityToShip,
                                      "Xuất giao cửa hàng", order.OrderId, "INTERNAL_ORDER");

                    // Đồng thời cộng vào kho STORE để cửa hàng thấy tồn tăng sau khi bếp xuất giao.
                    UpdateStockAndLog(detail.ProductId ?? 0, "STORE", order.StoreId, quantityToShip,
                                      "Nhập từ bếp trung tâm", order.OrderId, "INTERNAL_ORDER");

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
            if (!string.Equals(product.ProductType?.Trim(), "RAW", StringComparison.OrdinalIgnoreCase))
                throw new Exception($"Lỗi: Chỉ được nhập Nguyên liệu thô (RAW).");

            var supplier = _repo.GetContext().Suppliers.Find(supplierId) ?? throw new Exception("Không tìm thấy nhà cung cấp.");
            if (!supplier.IsActive)
                throw new Exception($"Lỗi: Nhà cung cấp đang nằm trong Blacklist!");

            using var transaction = _repo.GetContext().Database.BeginTransaction();
            try
            {
                string logReason = BuildImportReason(supplier.SupplierName);
                UpdateStockAndLog(productId, "KITCHEN", kitchenId, quantity, logReason, supplierId, "IMPORT_SUPPLIER", supplierId);
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
            var safeLocationType = TrimToMaxLength(locationType, 20);
            var safeReason = TrimToMaxLength(reason, 50);
            var safeRefType = TrimToMaxLength(refType, 20);

            var stock = _repo.GetStock(productId, safeLocationType, locationId);

            if (stock == null)
            {
                // Nếu chưa có dòng tồn kho thì xem như tồn = 0.
                // Với nghiệp vụ xuất kho (changeQty < 0) thì báo thiếu tồn kho thay vì "không tồn tại".
                stock = new Inventory
                {
                    ProductId = productId,
                    LocationType = safeLocationType,
                    LocationId = locationId,
                    CurrentQuantity = 0,
                    LastUpdated = DateTime.Now
                };
                _repo.AddInventory(stock);

                var newQuantityWhenMissing = stock.CurrentQuantity + changeQty;
                if (newQuantityWhenMissing < 0)
                    throw new Exception($"Không đủ tồn kho. Hiện tại: 0, Cần xuất: {Math.Abs(changeQty)}");

                stock.CurrentQuantity = newQuantityWhenMissing;
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
                LocationType = safeLocationType,
                LocationId = locationId,
                ChangeQuantity = changeQty,
                Reason = safeReason,
                ReferenceId = refId,
                ReferenceType = safeRefType,
                SupplierId = supplierId,
                CreatedAt = DateTime.Now
            };
            _repo.AddStockLog(log);
        }

        private static string BuildImportReason(string? supplierName)
        {
            var normalizedSupplierName = (supplierName ?? string.Empty).Trim();
            var baseReason = "Nhập nguyên liệu từ NCC";

            if (string.IsNullOrWhiteSpace(normalizedSupplierName))
            {
                return baseReason;
            }

            return TrimToMaxLength($"{baseReason}: {normalizedSupplierName}", 50);
        }

        private static string TrimToMaxLength(string? value, int maxLength)
        {
            var normalized = (value ?? string.Empty).Trim();
            if (normalized.Length <= maxLength)
            {
                return normalized;
            }

            return normalized.Substring(0, maxLength);
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

        public async Task<List<InventoryItemDTO>> GetStoreInventoryAsync(int storeId)
        {
            var inventories = await _repo.GetInventoryByLocationAsync("STORE", storeId);

            return inventories.Select(i => new InventoryItemDTO
            {
                InventoryId = i.InventoryId,
                ProductId = i.ProductId ?? 0,
                ProductName = i.Product?.ProductName ?? "N/A",
                BaseUnit = i.Product?.BaseUnit ?? "N/A",
                CurrentQuantity = i.CurrentQuantity ?? 0,
                LastUpdated = i.LastUpdated
            }).ToList();
        }

        public async Task<bool> ProcessStoreOutboundAsync(int storeId, OutboundRequestDTO request)
        {
            if (request.Quantity <= 0)
                throw new ArgumentException("Số lượng xuất kho phải lớn hơn 0.");

            var context = _repo.GetContext();

            using var transaction = await context.Database.BeginTransactionAsync();

            try
            {
                var inventory = await _repo.GetStockAsync(request.ProductId, "STORE", storeId);

                if (inventory == null || inventory.CurrentQuantity < request.Quantity)
                {
                    throw new InvalidOperationException("Số lượng tồn kho không đủ để thực hiện xuất/hủy.");
                }

                // 1. Trừ tồn kho
                inventory.CurrentQuantity -= request.Quantity;
                inventory.LastUpdated = DateTime.Now;
                _repo.UpdateInventory(inventory);

                // 2. Ghi nhận lịch sử (StockLog)
                var stockLog = new StockLog
                {
                    ProductId = request.ProductId,
                    LocationType = "STORE",
                    LocationId = storeId,
                    ChangeQuantity = -request.Quantity, // Lưu số âm cho xuất kho
                    Reason = request.Reason,
                    ReferenceType = request.Note,
                    CreatedAt = DateTime.Now
                };
                _repo.AddStockLog(stockLog);

                // 3. Lưu thay đổi và Commit Transaction
                await context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}