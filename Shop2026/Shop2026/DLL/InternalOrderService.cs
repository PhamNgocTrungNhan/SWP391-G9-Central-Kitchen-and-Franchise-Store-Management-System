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
        public bool CancelOrder(int orderId, int storeId)
        {
            var order = _orderRepository.GetOrderById(orderId);

            if (order == null)
                return false;

            // ✅ CHECK QUYỀN Ở ĐÂY
            if (order.StoreId != storeId)
                throw new Exception("Bạn không có quyền hủy đơn này");

            if (order.OrderStatus != "PENDING")
                throw new Exception("Only PENDING orders can be cancelled");

            order.OrderStatus = "CANCELLED";

            _orderRepository.UpdateOrder(order);

            return true;
        }
        // Confirm Order Completed
        public InternalOrder? ConfirmOrderCompleted(int orderId, int storeId)
        {
            var order = _orderRepository.GetOrderById(orderId);

            if (order == null)
                return null;

            if (order.StoreId != storeId)
                throw new Exception("Không có quyền");

            if (order.OrderStatus != "SHIPPING")
                throw new Exception("Only SHIPPING orders can be confirmed");

            order.OrderStatus = "COMPLETED";
            order.UpdatedAt = DateTime.Now;

            _orderRepository.UpdateOrder(order);

            return order;
        }

        //Approve Order
        public InternalOrder? ApproveOrder(int orderId, int approvedBy)
        {
            return _orderRepository.ApproveOrder(orderId, approvedBy);
        }
        //Reject Order
        public InternalOrder? RejectOrder(int orderId, string reason, int rejectedBy)
        {
            return _orderRepository.RejectOrder(orderId, reason, rejectedBy);
        }
        //Update Order Status
        public InternalOrder? UpdateOrderStatus(int orderId, string newStatus)
        {
            var order = _orderRepository.GetOrderById(orderId);

            if (order == null)
                return null;

            var currentStatus = order.OrderStatus;

            if (string.IsNullOrWhiteSpace(currentStatus))
                throw new Exception("Order status is invalid");

            var validTransitions = new Dictionary<string, List<string>>
            {
                { "PENDING", new List<string> { "APPROVED", "REJECTED", "CANCELLED" } },
                { "APPROVED", new List<string> { "PROCESSING" } },
                { "PROCESSING", new List<string> { "SHIPPING" } },
                { "SHIPPING", new List<string> { "COMPLETED" } }
            };

            if (!validTransitions.ContainsKey(currentStatus) ||
                !validTransitions[currentStatus].Contains(newStatus))
            {
                throw new Exception($"Invalid status transition: {currentStatus} → {newStatus}");
            }

            return _orderRepository.UpdateOrderStatus(orderId, newStatus);
        }
    }
}
