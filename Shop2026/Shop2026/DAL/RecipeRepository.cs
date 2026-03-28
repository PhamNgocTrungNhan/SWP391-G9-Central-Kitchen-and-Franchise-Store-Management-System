using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class RecipeRepository
    {
        private readonly ApplicationDbContext _context;
        public RecipeRepository(ApplicationDbContext context) => _context = context;

        // Lấy danh sách nguyên liệu theo ID của Thành phẩm
        public IEnumerable<RecipesBom> GetByParentProductId(int parentProductId)
        {
            return _context.RecipesBoms
                .Where(r => r.ParentProductId == parentProductId)
                .ToList();
        }

        public RecipesBom GetById(int id) => _context.RecipesBoms.Find(id);

        public void Add(RecipesBom recipe)
        {
            _context.RecipesBoms.Add(recipe);
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