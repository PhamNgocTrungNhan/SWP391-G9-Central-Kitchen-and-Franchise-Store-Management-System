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
        //Create Internal Order
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
        //Get Store Orders
        public List<InternalOrder> GetStoreOrders(int storeId, string? status)
        {
            return _orderRepository.GetStoreOrders(storeId, status);
        }
        //Get Order Detail
        public InternalOrder? GetOrderDetail(int orderId)
        {
            return _orderRepository.GetOrderDetail(orderId);
        }
        //Cancel Order
        public bool CancelOrder(int orderId)
        {
            var order = _orderRepository.GetOrderById(orderId);

            if (order == null)
            {
                return false;
            }

            //only cancel when PENDING
            if (order.OrderStatus != "PENDING")
            {
                throw new Exception("Only PENDING orders can be cancelled");
            }

            order.OrderStatus = "CANCELLED";

            _orderRepository.UpdateOrder(order);

            return true;
        }
        //Approve Order
        public InternalOrder? ApproveOrder(int orderId, int approvedBy)
        {
            return _orderRepository.ApproveOrder(orderId, approvedBy);
        }
        //Reject Order
        public InternalOrder? RejectOrder(int orderId, string reason)
        {
            return _orderRepository.RejectOrder(orderId, reason);
        }
    }
}
