using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class ProductRepository
    {
        private readonly ApplicationDbContext _context;
        public ProductRepository(ApplicationDbContext context) => _context = context;

        public IEnumerable<Product> GetAll() => _context.Products.Include(p => p.Category).ToList();
        public Product GetById(int id) => _context.Products.Find(id);
        public void Add(Product product)
        {
            _context.Products.Add(product);
            _context.SaveChanges();
        }
        public void Update(Product product)
        {
            _context.Products.Update(product);
            _context.SaveChanges();
        }
        public void Delete(Product product)
        {
            _context.Products.Remove(product);
            _context.SaveChanges();
        }
    }
}