using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;
using System;
using System.Collections.Generic;

namespace Shop2026.DLL
{
    public class InternalOrderService
    {
        private readonly InternalOrderRepository _orderRepository;

        // 🚨 ĐÃ BỔ SUNG: Tiêm InventoryService để có quyền thao tác với kho
        private readonly InventoryService _inventoryService;

        public InternalOrderService(InternalOrderRepository orderRepository, InventoryService inventoryService)
        {
            _orderRepository = orderRepository;
            _inventoryService = inventoryService;
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

        public InternalOrder? GetOrderDetail(int orderId)
        {
            return _orderRepository.GetOrderDetail(orderId);
        }

        public bool CancelOrder(int orderId, int storeId)
        {
            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                return false;

            if (order.StoreId != storeId)
                throw new Exception("Bạn không có quyền hủy đơn này");

            if (order.OrderStatus != "PENDING")
                throw new Exception("Only PENDING orders can be cancelled");

            order.OrderStatus = "CANCELLED";
            _orderRepository.UpdateOrder(order);

            return true;
        }

        // 🚨 ĐÃ SỬA: Thêm logic CỘNG KHO STORE khi nhận hàng
        public InternalOrder? ConfirmOrderCompleted(int orderId, int storeId)
        {
            // Dùng GetOrderDetail thay vì GetOrderById để kéo được danh sách sản phẩm bên trong
            var order = _orderRepository.GetOrderDetail(orderId);

            if (order == null)
                return null;
            if (order.StoreId != storeId)
                throw new Exception("Không có quyền");
            if (order.OrderStatus != "SHIPPING")
                throw new Exception("Only SHIPPING orders can be confirmed");

            order.OrderStatus = "COMPLETED";
            order.UpdatedAt = DateTime.Now;

            // Vòng lặp cộng sản phẩm vào kho của Cửa hàng
            foreach (var item in order.InternalOrderDetails)
            {
                decimal qtyReceived = item.QuantityShipped ?? 0;
                if (qtyReceived > 0)
                {
                    _inventoryService.UpdateStockAndLog(
                        (int)item.ProductId, "STORE", storeId, qtyReceived,
                        $"Nhận hàng đơn {order.OrderCode}", orderId, "INTERNAL_ORDER", null
                    );
                }
            }

            _orderRepository.UpdateOrder(order);
            return order;
        }

        public InternalOrder? ApproveOrder(int orderId, int approvedBy)
        {
            return _orderRepository.ApproveOrder(orderId, approvedBy);
        }

        public InternalOrder? RejectOrder(int orderId, string reason, int rejectedBy)
        {
            return _orderRepository.RejectOrder(orderId, reason, rejectedBy);
        }

        // 🚨 ĐÃ SỬA: Thêm logic TRỪ KHO KITCHEN khi xuất giao hàng
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
                { "PROCESSING", new List<string> { "PRODUCED" } },
                { "PRODUCED", new List<string> { "SHIPPING" } },
                { "SHIPPING", new List<string> { "COMPLETED", "RETURNED" } }
            };

            if (!validTransitions.ContainsKey(currentStatus) || !validTransitions[currentStatus].Contains(newStatus))
            {
                throw new Exception($"Invalid status transition: {currentStatus} → {newStatus}");
            }

            // Móc nối luồng Kho vào luồng Trạng thái
            if (newStatus == "SHIPPING")
            {
                // Gọi sang InventoryService, hàm này đã tự lo việc trừ tồn kho và đổi status
                _inventoryService.TransferOrderToStore(orderId);
                return _orderRepository.GetOrderDetail(orderId);
            }

            return _orderRepository.UpdateOrderStatus(orderId, newStatus);
        }

        public List<InternalOrder> GetAllOrders(string? status)
        {
            return _orderRepository.GetAllOrders(status);
        }

        public List<InternalOrder> GetKitchenOrders(int kitchenId, string? status)
        {
            return _orderRepository.GetKitchenOrders(kitchenId, status);
        }

        public InternalOrder? ReturnOrder(int orderId, int storeId, string reason)
        {
            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                return null;
            if (order.StoreId != storeId)
                throw new Exception("Không có quyền thao tác đơn này");
            if (order.OrderStatus != "SHIPPING")
                throw new Exception("Chỉ có thể trả hàng khi đơn đang giao (SHIPPING)");

            order.OrderStatus = "RETURNED";
            order.ReturnReason = reason;
            order.UpdatedAt = DateTime.Now;

            _orderRepository.UpdateOrder(order);
            return order;
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