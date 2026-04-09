using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class RecipeRepository
    {
        private readonly ApplicationDbContext _context;
        public RecipeRepository(ApplicationDbContext context) => _context = context;

        public IEnumerable<RecipesBom> GetByParentProductId(int parentProductId)
        {
            // Explicit column list: DB no longer has waste_allowance_percent; avoids stale EF models that still map it.
            return _context.RecipesBoms
                .FromSqlInterpolated($@"
                    SELECT [recipe_id], [material_id], [parent_product_id], [quantity_required]
                    FROM [Recipes_BOM]
                    WHERE [parent_product_id] = {parentProductId}")
                .Include(r => r.Material)
                .Include(r => r.ParentProduct)
                .ToList();
        }

        public RecipesBom? GetById(int id) =>
            _context.RecipesBoms
                .FromSqlInterpolated($@"
                    SELECT [recipe_id], [material_id], [parent_product_id], [quantity_required]
                    FROM [Recipes_BOM]
                    WHERE [recipe_id] = {id}")
                .Include(r => r.Material)
                .Include(r => r.ParentProduct)
                .FirstOrDefault();

        public bool ExistsInRecipe(int parentId, int materialId)
        {
            return _context.RecipesBoms
                .FromSqlInterpolated($@"
                    SELECT TOP (1) [recipe_id], [material_id], [parent_product_id], [quantity_required]
                    FROM [Recipes_BOM]
                    WHERE [parent_product_id] = {parentId} AND [material_id] = {materialId}")
                .Any();
        }

        public bool ProductExists(int productId)
        {
            return _context.Products.Any(p => p.ProductId == productId);
        }

        // ✅ HÀM MỚI: Thêm hàng loạt dữ liệu vào Database cực nhanh
        public void AddRange(IEnumerable<RecipesBom> recipes)
        {
            _context.RecipesBoms.AddRange(recipes);
            _context.SaveChanges();
        }

        public void Update(RecipesBom recipe)
        {
            _context.RecipesBoms.Update(recipe);
            _context.SaveChanges();
        }

        public void Delete(RecipesBom recipe)
        {
            _context.RecipesBoms.Remove(recipe);
            _context.SaveChanges();
        }
    }
}
