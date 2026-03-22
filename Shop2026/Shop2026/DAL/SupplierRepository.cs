using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class SupplierRepository
    {
        private readonly ApplicationDbContext _context;
        public SupplierRepository(ApplicationDbContext context) => _context = context;

        public IEnumerable<Supplier> GetAll() => _context.Suppliers.ToList();
        public Supplier? GetById(int id) => _context.Suppliers.Find(id);
        public void Add(Supplier supplier)
        {
            _context.Suppliers.Add(supplier);
            _context.SaveChanges();
        }
        public void Update(Supplier supplier)
        {
            _context.Suppliers.Update(supplier);
            _context.SaveChanges();
        }
    }
}