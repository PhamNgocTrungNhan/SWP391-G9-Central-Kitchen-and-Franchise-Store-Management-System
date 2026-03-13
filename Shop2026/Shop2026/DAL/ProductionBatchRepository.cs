using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class ProductionBatchRepository
    {
        private readonly ApplicationDbContext _context;
        public ProductionBatchRepository(ApplicationDbContext context) => _context = context;

        public ProductionBatch GetById(int id) => _context.ProductionBatches.Find(id);

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

        // Dành cho BE2-06: Insert nhiều dòng gán order cùng lúc
        public void AllocateOrders(List<ProductionBatchOrder> allocations)
        {
            _context.ProductionBatchOrders.AddRange(allocations);
            _context.SaveChanges();
        }
    }
}