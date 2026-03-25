using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;
using System.IO;

namespace Shop2026.DLL
{
    public class InternalOrderService
    {
        private readonly InternalOrderRepository _orderRepository;
        private readonly InventoryService _inventoryService;

        public InternalOrderService(
            InternalOrderRepository orderRepository, 
            InventoryService inventoryService)
        {
            _orderRepository = orderRepository;
            _inventoryService = inventoryService;
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

            if (order.OrderStatus.ToUpper() != "SHIPPING")
                throw new Exception("Only SHIPPING orders can be confirmed");

            // Chỉ cập nhật status, KHÔNG cộng kho Store
            // Vì Store không quản lý kho, chỉ Kitchen quản lý kho
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

            // Validate status transition
            var validTransitions = new Dictionary<string, List<string>>
            {
                { "PENDING", new List<string> { "APPROVED", "REJECTED", "CANCELLED" } },
                { "APPROVED", new List<string> { "PROCESSING", "PRODUCED" } },
                { "PROCESSING", new List<string> { "PRODUCED", "SHIPPING" } }, 
                { "PRODUCED", new List<string> { "SHIPPING" } },
                { "SHIPPING", new List<string> { "COMPLETED", "RETURNED" } }
            };

            if (!validTransitions.ContainsKey(currentStatus) ||
                !validTransitions[currentStatus].Contains(newStatus.ToUpper()))
            {
                throw new Exception($"Invalid status transition: {currentStatus} → {newStatus}");
            }
            
            // Nếu chuyển sang SHIPPING: Trừ kho Kitchen
            if (newStatus.ToUpper() == "SHIPPING")
            {
                var orderWithDetails = _orderRepository.GetOrderDetail(orderId);
                
                if (orderWithDetails != null && orderWithDetails.InternalOrderDetails != null && orderWithDetails.InternalOrderDetails.Any())
                {
                    _inventoryService.TransferToStore(orderWithDetails, orderWithDetails.InternalOrderDetails.ToList());
                    return orderWithDetails;
                }
            }

            return _orderRepository.UpdateOrderStatus(orderId, newStatus);
        }

        // Lấy tất cả Order cho Coordinator
        public List<InternalOrder> GetAllOrders(string? status)
        {
            return _orderRepository.GetAllOrders(status);
        }

        // Luồng 3: Lấy danh sách đơn cho Bếp
        public List<InternalOrder> GetKitchenOrders(int kitchenId, string? status)
        {
            return _orderRepository.GetKitchenOrders(kitchenId, status);
        }

        // ==========================================
        // THÊM MỚI CHO LUỒNG 4
        // ==========================================

        public InternalOrder? ReturnOrder(int orderId, int storeId, string reason)
        {
            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                return null;
            if (order.StoreId != storeId)
                throw new Exception("Không có quyền thao tác đơn này");
            if (order.OrderStatus.ToUpper() != "SHIPPING")
                throw new Exception("Chỉ có thể trả hàng khi đơn đang giao (SHIPPING)");

            // Lấy chi tiết đơn hàng để hoàn trả kho
            var orderWithDetails = _orderRepository.GetOrderDetail(orderId);
            if (orderWithDetails == null || !orderWithDetails.InternalOrderDetails.Any())
                throw new Exception("Không tìm thấy chi tiết đơn hàng");

            using var transaction = _orderRepository.GetContext().Database.BeginTransaction();
            try
            {
                // Hoàn trả từng sản phẩm về kho Kitchen
                foreach (var detail in orderWithDetails.InternalOrderDetails)
                {
                    decimal quantityToReturn = detail.QuantityShipped ?? 0;
                    if (quantityToReturn > 0)
                    {
                        _inventoryService.UpdateStockAndLog(
                            detail.ProductId ?? 0,
                            "KITCHEN",
                            orderWithDetails.KitchenId ?? 1,
                            quantityToReturn, // Số dương để cộng lại vào kho
                            "Trả hàng về bếp",
                            orderId,
                            "RETURNED",
                            null
                        );
                    }
                }

                order.OrderStatus = "RETURNED";
                order.ReturnReason = reason;
                order.UpdatedAt = DateTime.Now;

                _orderRepository.UpdateOrder(order);
                
                transaction.Commit();
                return order;
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }

        public InternalOrder? SubmitFeedback(CreateFeedbackRequest request, int storeId)
        {
            var order = _orderRepository.GetOrderById(request.OrderId);
            if (order == null)
                return null;
            if (order.StoreId != storeId)
                throw new Exception("Không có quyền đánh giá đơn này");

            if (order.OrderStatus != "COMPLETED" && order.OrderStatus != "RETURNED")
                throw new Exception("Chỉ được gửi Feedback khi đơn đã Nhận hoặc Trả.");

            if (request.Rating < 1 || request.Rating > 5)
                throw new Exception("Rating phải từ 1 đến 5 sao.");

            return _orderRepository.SubmitFeedback(request.OrderId, request.Rating, request.Comment);
        }
    }
}