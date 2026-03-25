using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class CategoryRepository
    {
        private readonly ApplicationDbContext _context;
        public CategoryRepository(ApplicationDbContext context) => _context = context;

        public IEnumerable<Category> GetAll() => _context.Categories.ToList();
        public Category GetById(int id) => _context.Categories.Find(id);
        public void Add(Category category)
        {
            _context.Categories.Add(category);
            _context.SaveChanges();
        }
        public void Update(Category category)
        {
            _context.Categories.Update(category);
            _context.SaveChanges();
        }
        public void Delete(Category category)
        {
            _context.Categories.Remove(category);
            _context.SaveChanges();
        }
    }
}
