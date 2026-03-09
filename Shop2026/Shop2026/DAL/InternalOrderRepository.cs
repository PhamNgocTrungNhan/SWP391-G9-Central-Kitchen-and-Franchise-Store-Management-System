using Shop2026.Models;
using Shop2026.Context;

namespace Shop2026.DAL
{
    public class InternalOrderRepository
    {
        private readonly ApplicationDbContext _context;

        public InternalOrderRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public InternalOrder CreateOrder(InternalOrder order)
        {
            _context.InternalOrders.Add(order);
            _context.SaveChanges();
            return order;
        }

        public void AddOrderDetails(List<InternalOrderDetail> details)
        {
            _context.InternalOrderDetails.AddRange(details);
            _context.SaveChanges();
        }
    }
}
