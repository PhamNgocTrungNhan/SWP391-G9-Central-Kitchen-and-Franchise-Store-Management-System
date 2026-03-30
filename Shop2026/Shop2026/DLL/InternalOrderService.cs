// ✅ THƯ VIỆN PAYOS V2 
using PayOS;
using PayOS.Models;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks; // Bắt buộc phải có để hứng Webhook
using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Shop2026.DLL
{
    public class InternalOrderService
    {
        private readonly InternalOrderRepository _orderRepository;
        private readonly InventoryService _inventoryService;
        private readonly PayOSClient _payOS;

        public static readonly Dictionary<string, (string DisplayName, decimal Percentage)> RefundPolicies = new()
        {
            { "HUY_VUI_VE", ("Khách đổi ý / Hủy không lý do (Hoàn cọc 20%)", 20m) },
            { "HANG_HONG", ("Sản phẩm lỗi / Hư hỏng (Hoàn 100%)", 100m) },
            { "TRE_HEN", ("Bếp giao hàng quá trễ (Hoàn 50%)", 50m) },
            { "HET_HANG", ("Bếp báo hết nguyên liệu (Hoàn 100%)", 100m) }
        };

        public InternalOrderService(
            InternalOrderRepository orderRepository,
            InventoryService inventoryService,
            PayOSClient payOS)
        {
            _orderRepository = orderRepository;
            _inventoryService = inventoryService;
            _payOS = payOS;
        }

        public InternalOrder CreateInternalOrder(CreateInternalOrderRequest request)
        {
            decimal totalAmount = 0;
            var details = new List<InternalOrderDetail>();

            foreach (var d in request.OrderDetails)
            {
                decimal price = _orderRepository.GetProductInternalPrice(d.ProductId);
                totalAmount += price * d.QuantityOrdered;
                details.Add(new InternalOrderDetail
                {
                    ProductId = d.ProductId,
                    QuantityOrdered = d.QuantityOrdered,
                    QuantityConfirmed = d.QuantityConfirmed,
                    QuantityShipped = d.QuantityShipped
                });
            }

            var order = new InternalOrder
            {
                StoreId = request.StoreId,
                ExpectedDeliveryDate = request.ExpectedDeliveryDate,
                OrderStatus = "PENDING",
                PaymentStatus = "UNPAID",
                TotalAmount = totalAmount,
                CreatedAt = DateTime.Now
            };

            order = _orderRepository.CreateOrder(order);
            foreach (var d in details)
            {
                d.OrderId = order.OrderId;
            }
            _orderRepository.AddOrderDetails(details);

            return order;
        }

        public Transaction? PayOrder(int orderId, int storeId)
        {
            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                throw new Exception("Không tìm thấy đơn hàng");
            if (order.StoreId != storeId)
                throw new Exception("Bạn không có quyền thanh toán đơn này");
            if (order.PaymentStatus == "PAID")
                throw new Exception("Đơn hàng này đã được thanh toán rồi!");

            order.PaymentStatus = "PAID";
            order.UpdatedAt = DateTime.Now;
            _orderRepository.UpdateOrder(order);

            var transaction = new Transaction
            {
                InternalOrderId = orderId,
                TransactionType = "REVENUE",
                Amount = order.TotalAmount ?? 0,
                PaymentMethod = "Bank Transfer",
                TransactionDate = DateTime.Now,
                Note = $"Cửa hàng thanh toán chuyển khoản cho đơn hàng {order.OrderCode}"
            };

            _orderRepository.AddTransaction(transaction);
            return transaction;
        }

        // ==========================================
        // 🚀 TẠO LINK THANH TOÁN QR PAYOS (FIX CHUẨN V2)
        // ==========================================
        public async Task<string> CreatePayOSLink(int orderId, int storeId, string returnUrl, string cancelUrl)
        {
            var order = _orderRepository.GetOrderDetail(orderId);
            if (order == null)
                throw new Exception("Không tìm thấy đơn hàng");
            if (order.StoreId != storeId)
                throw new Exception("Bạn không có quyền thanh toán đơn này");
            if (order.PaymentStatus == "PAID")
                throw new Exception("Đơn này đã thanh toán rồi!");

            long payOsOrderCode = order.OrderId;
            int totalAmount = (int)(order.TotalAmount ?? 0);

            // PayOS V2 không bắt buộc truyền Items, bỏ luôn để tránh lằng nhằng lỗi thư viện
            var paymentRequest = new CreatePaymentLinkRequest
            {
                OrderCode = payOsOrderCode,
                Amount = totalAmount,
                Description = $"Thanh toan don {order.OrderCode ?? orderId.ToString()}",
                CancelUrl = cancelUrl,
                ReturnUrl = returnUrl
            };

            var paymentLink = await _payOS.PaymentRequests.CreateAsync(paymentRequest);
            return paymentLink.CheckoutUrl;
        }

        // ==========================================
        // 🤖 HỨNG WEBHOOK TỪ PAYOS (FIX CHUẨN V2)
        // ==========================================
        public async Task ProcessPayOSWebhook(Webhook webhookBody) // Dùng Webhook thay vì WebhookData
        {
            var verifiedData = await _payOS.Webhooks.VerifyAsync(webhookBody);

            int orderId = (int)verifiedData.OrderCode; // Viết hoa chữ O
            var order = _orderRepository.GetOrderById(orderId);

            if (order != null && order.PaymentStatus != "PAID")
            {
                order.PaymentStatus = "PAID";
                order.UpdatedAt = DateTime.Now;
                _orderRepository.UpdateOrder(order);

                var transaction = new Transaction
                {
                    InternalOrderId = orderId,
                    TransactionType = "REVENUE",
                    Amount = order.TotalAmount ?? 0,
                    PaymentMethod = "PayOS_VietQR",
                    TransactionDate = DateTime.Now,
                    Note = $"PayOS tự động xác nhận chuyển khoản cho đơn {order.OrderCode}"
                };

                _orderRepository.AddTransaction(transaction);
            }
        }

        public Transaction? RefundOrderByPolicy(int orderId, int storeId, string policyCode, string? additionalNote)
        {
            if (!RefundPolicies.ContainsKey(policyCode))
                throw new Exception("Mã chính sách hoàn tiền không hợp lệ.");
            var policy = RefundPolicies[policyCode];

            string fullReason = policy.DisplayName;
            if (!string.IsNullOrWhiteSpace(additionalNote))
                fullReason += $" - Ghi chú: {additionalNote}";

            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                throw new Exception("Không tìm thấy đơn hàng.");
            if (order.StoreId != storeId)
                throw new Exception("Bạn không có quyền thao tác đơn này.");
            if (order.PaymentStatus != "PAID")
                throw new Exception("Đơn hàng chưa được thanh toán.");

            decimal totalPaid = order.TotalAmount ?? 0;
            decimal refundAmount = totalPaid * (policy.Percentage / 100m);
            decimal alreadyRefunded = _orderRepository.GetTotalRefundedAmount(orderId);

            if (alreadyRefunded + refundAmount > totalPaid)
                throw new Exception($"Số tiền hoàn vượt quá quy định!");

            var transaction = new Transaction
            {
                InternalOrderId = orderId,
                TransactionType = "EXPENSE",
                Amount = refundAmount,
                PaymentMethod = "Bank Transfer",
                TransactionDate = DateTime.Now,
                Note = fullReason
            };

            _orderRepository.AddTransaction(transaction);
            return transaction;
        }

        public List<InternalOrder> GetStoreOrders(int storeId, string? status) => _orderRepository.GetStoreOrders(storeId, status);
        public InternalOrder? GetOrderDetail(int orderId) => _orderRepository.GetOrderDetail(orderId);
        public List<InternalOrder> GetAllOrders(string? status) => _orderRepository.GetAllOrders(status);
        public List<InternalOrder> GetKitchenOrders(int kitchenId, string? status) => _orderRepository.GetKitchenOrders(kitchenId, status);

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

        public InternalOrder? ConfirmOrderCompleted(int orderId, int storeId)
        {
            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                return null;
            if (order.StoreId != storeId)
                throw new Exception("Không có quyền");
            if (order.OrderStatus.ToUpper() != "SHIPPING")
                throw new Exception("Only SHIPPING orders can be confirmed");
            order.OrderStatus = "COMPLETED";
            order.UpdatedAt = DateTime.Now;
            _orderRepository.UpdateOrder(order);
            return order;
        }

        public InternalOrder? ApproveOrder(int orderId, int approvedBy) => _orderRepository.ApproveOrder(orderId, approvedBy);
        public InternalOrder? RejectOrder(int orderId, string reason, int rejectedBy) => _orderRepository.RejectOrder(orderId, reason, rejectedBy);

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
                { "APPROVED", new List<string> { "PROCESSING", "PRODUCED" } },
                { "PROCESSING", new List<string> { "PRODUCED", "SHIPPING" } },
                { "PRODUCED", new List<string> { "SHIPPING" } },
                { "SHIPPING", new List<string> { "COMPLETED", "RETURNED" } }
            };

            if (!validTransitions.ContainsKey(currentStatus) || !validTransitions[currentStatus].Contains(newStatus.ToUpper()))
                throw new Exception($"Invalid status transition: {currentStatus} → {newStatus}");

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

        public InternalOrder? ReturnOrder(int orderId, int storeId, string reason)
        {
            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                return null;
            if (order.StoreId != storeId)
                throw new Exception("Không có quyền thao tác đơn này");
            if (order.OrderStatus.ToUpper() != "SHIPPING")
                throw new Exception("Chỉ có thể trả hàng khi đơn đang giao (SHIPPING)");

            var orderWithDetails = _orderRepository.GetOrderDetail(orderId);
            if (orderWithDetails == null || !orderWithDetails.InternalOrderDetails.Any())
                throw new Exception("Không tìm thấy chi tiết đơn hàng");

            using var transaction = _orderRepository.GetContext().Database.BeginTransaction();
            try
            {
                foreach (var detail in orderWithDetails.InternalOrderDetails)
                {
                    decimal quantityToReturn = detail.QuantityShipped ?? 0;
                    if (quantityToReturn > 0)
                    {
                        _inventoryService.UpdateStockAndLog(
                            detail.ProductId ?? 0, "KITCHEN", orderWithDetails.KitchenId ?? 1,
                            quantityToReturn, "Trả hàng về bếp", orderId, "RETURNED", null
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
            catch (Exception) { transaction.Rollback(); throw; }
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