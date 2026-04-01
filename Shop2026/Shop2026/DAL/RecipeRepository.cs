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
            return _context.RecipesBoms
                .Include(r => r.Material)
                .Include(r => r.ParentProduct)
                .Where(r => r.ParentProductId == parentProductId)
                .ToList();
        }

        public RecipesBom? GetById(int id) => _context.RecipesBoms.Find(id);

        public bool ExistsInRecipe(int parentId, int materialId)
        {
            return _context.RecipesBoms.Any(r => r.ParentProductId == parentId && r.MaterialId == materialId);
        }

        public bool ProductExists(int productId)
        {
            return _context.Products.Any(p => p.ProductId == productId);
        }

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