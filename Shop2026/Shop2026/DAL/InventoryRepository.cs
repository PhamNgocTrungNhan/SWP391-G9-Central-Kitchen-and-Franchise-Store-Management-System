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

        // Lấy công thức BOM để tính nguyên liệu cần trừ (fallback: cùng tên SP khác đã có BOM)
        public IEnumerable<RecipesBom> GetRecipeByProduct(int productId)
        {
            var direct = _context.RecipesBoms.Where(r => r.ParentProductId == productId).ToList();
            if (direct.Count > 0)
                return direct;

            var donorId = BomFallbackHelper.FindDonorParentIdWithBom(_context, productId);
            if (!donorId.HasValue)
                return direct;

            return _context.RecipesBoms.Where(r => r.ParentProductId == donorId.Value).ToList();
        }

        public Product GetProduct(int productId)
        {
            return _context.Products.Find(productId);
        }
        // Hỗ trợ Transaction để đảm bảo an toàn dữ liệu
        public ApplicationDbContext GetContext() => _context;
    }
}