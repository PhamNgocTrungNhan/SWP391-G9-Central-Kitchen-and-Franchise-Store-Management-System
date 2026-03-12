using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class InternalOrderService
    {
        private readonly InternalOrderRepository _orderRepository;

        public InternalOrderService(InternalOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

        public InternalOrder CreateInternalOrder(CreateInternalOrderRequest request)
        {
            var order = new InternalOrder
            {
                StoreId = request.StoreId,
                ExpectedDeliveryDate = request.ExpectedDeliveryDate,
                OrderStatus = "PENDING",
                CreatedAt = DateTime.Now
            };

            order = _orderRepository.CreateOrder(order);

            var details = request.OrderDetails.Select(d => new InternalOrderDetail
            {
                OrderId = order.OrderId,
                ProductId = d.ProductId,
                QuantityOrdered = d.QuantityOrdered,
                QuantityConfirmed = d.QuantityConfirmed,
                QuantityShipped = d.QuantityShipped
            }).ToList();

            _orderRepository.AddOrderDetails(details);

            return order;
        }
        public List<InternalOrder> GetStoreOrders(int storeId, string? status)
        {
            return _orderRepository.GetStoreOrders(storeId, status);
        }
    }
}
