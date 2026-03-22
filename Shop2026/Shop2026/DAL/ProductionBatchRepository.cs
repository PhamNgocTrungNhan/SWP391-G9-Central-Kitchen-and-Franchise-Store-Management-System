using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class ProductionBatchRepository
    {
        private readonly ApplicationDbContext _context;
        public ProductionBatchRepository(ApplicationDbContext context) => _context = context;

        // ĐÂY CHÍNH LÀ DÒNG BẠN ĐANG THIẾU ĐỂ SỬA LỖI ĐẦU TIÊN:
        public ApplicationDbContext GetContext() => _context;

        public IEnumerable<ProductionBatch> GetAll()
        {
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