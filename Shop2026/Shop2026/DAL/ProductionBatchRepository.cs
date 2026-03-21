using Microsoft.EntityFrameworkCore; // Nhớ có using này
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class ProductionBatchRepository
    {
        private readonly ApplicationDbContext _context;
        public ProductionBatchRepository(ApplicationDbContext context) => _context = context;

        public IEnumerable<ProductionBatch> GetAll()
        {
            // Include để Frontend có Tên sản phẩm, Mã SKU mà hiển thị
            return _context.ProductionBatches.Include(b => b.Product).OrderByDescending(b => b.BatchId).ToList();
        }

        public ProductionBatch? GetById(int id)
        {
            return _context.ProductionBatches.Include(b => b.Product).FirstOrDefault(b => b.BatchId == id);
        }

        public void Add(ProductionBatch batch)
        {
            _context.ProductionBatches.Add(batch);
            _context.SaveChanges();
        }

        public void Update(ProductionBatch batch)
        {
            _context.ProductionBatches.Update(batch);
            _context.SaveChanges();
        }

        public void AllocateOrders(List<ProductionBatchOrder> allocations)
        {
            _context.ProductionBatchOrders.AddRange(allocations);
            _context.SaveChanges();
        }
    }
}