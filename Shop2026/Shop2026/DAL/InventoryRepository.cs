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
            return _context.RecipesBoms
                .FromSqlInterpolated($@"
                    SELECT [recipe_id], [material_id], [parent_product_id], [quantity_required]
                    FROM [Recipes_BOM]
                    WHERE [parent_product_id] = {productId}")
                .Include(r => r.Material)
                .ToList();
        }

        public Product GetProduct(int productId)
        {
            return _context.Products.Find(productId);
        }
        // Hỗ trợ Transaction để đảm bảo an toàn dữ liệu
        public ApplicationDbContext GetContext() => _context;
    }
}