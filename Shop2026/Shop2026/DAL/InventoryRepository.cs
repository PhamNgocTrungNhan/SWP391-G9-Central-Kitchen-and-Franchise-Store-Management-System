using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class InventoryRepository
    {
        private readonly ApplicationDbContext _context;
        public InventoryRepository(ApplicationDbContext context) => _context = context;

        public Inventory GetStock(int productId, string locationType, int locationId)
        {
            return _context.Inventories.FirstOrDefault(i =>
                i.ProductId == productId &&
                i.LocationType == locationType &&
                i.LocationId == locationId);
        }

        public void AddInventory(Inventory inventory) => _context.Inventories.Add(inventory);
        public void UpdateInventory(Inventory inventory) => _context.Inventories.Update(inventory);

        public void AddStockLog(StockLog log) => _context.StockLogs.Add(log);

        // Lấy công thức BOM để tính nguyên liệu cần trừ
        public IEnumerable<RecipesBom> GetRecipeByProduct(int productId)
        {
            return _context.RecipesBoms.Where(r => r.ParentProductId == productId).ToList();
        }

        public Product GetProduct(int productId)
        {
            return _context.Products.Find(productId);
        }

        // Lấy toàn bộ tồn kho theo Location (KITCHEN hoặc STORE)
        public async Task<List<Inventory>> GetInventoryByLocationAsync(string locationType, int locationId)
        {
            return await _context.Inventories
                .Include(i => i.Product) // Join bảng Product để lấy Tên và Đơn vị
                .Where(i => i.LocationType == locationType && i.LocationId == locationId)
                .ToListAsync();
        }

        // Lấy 1 item tồn kho (Bất đồng bộ)
        public async Task<Inventory> GetStockAsync(int productId, string locationType, int locationId)
        {
            return await _context.Inventories
                .FirstOrDefaultAsync(i =>
                    i.ProductId == productId &&
                    i.LocationType == locationType &&
                    i.LocationId == locationId);
        }
        // Hỗ trợ Transaction để đảm bảo an toàn dữ liệu
        public ApplicationDbContext GetContext() => _context;
    }
}