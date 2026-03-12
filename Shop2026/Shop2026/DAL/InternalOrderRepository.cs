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

        public List<InternalOrder> GetStoreOrders(int storeId, string? status)
        {
            var query = _context.InternalOrders
                        .Where(o => o.StoreId == storeId);

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(o => o.OrderStatus == status);
            }

            return query
                    .OrderByDescending(o => o.CreatedAt)
                    .ToList();
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
