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
        //Create Order
        public InternalOrder CreateOrder(InternalOrder order)
        {
            _context.InternalOrders.Add(order);
            _context.SaveChanges();
            return order;
        }
        //Add Order Details
        public void AddOrderDetails(List<InternalOrderDetail> details)
        {
            _context.InternalOrderDetails.AddRange(details);
            _context.SaveChanges();
        }
        //Get Order Detail 
        public InternalOrder? GetOrderDetail(int orderId)
        {
            return _context.InternalOrders
                .Where(o => o.OrderId == orderId)
                .Select(o => new InternalOrder
                {
                    OrderId = o.OrderId,
                    StoreId = o.StoreId,
                    ExpectedDeliveryDate = o.ExpectedDeliveryDate,
                    OrderStatus = o.OrderStatus,
                    CreatedAt = o.CreatedAt,
                    InternalOrderDetails = _context.InternalOrderDetails
                        .Where(d => d.OrderId == o.OrderId)
                        .ToList()
                })
                .FirstOrDefault();
        }
        //Get Order By Id
        public InternalOrder? GetOrderById(int orderId)
        {
            return _context.InternalOrders
                .FirstOrDefault(o => o.OrderId == orderId);
        }

        //Update Order
        public void UpdateOrder(InternalOrder order)
        {
            _context.InternalOrders.Update(order);
            _context.SaveChanges();
        }
    }
}
