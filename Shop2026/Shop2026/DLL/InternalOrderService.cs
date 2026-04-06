using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Sockets;

namespace Shop2026.DLL
{
    public class InternalOrderService
    {
        private readonly InternalOrderRepository _orderRepository;
        private readonly InventoryService _inventoryService;
        private readonly IConfiguration _configuration;

        private static readonly HashSet<string> PayableStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "APPROVED", "PROCESSING", "PRODUCED", "SHIPPING"
        };

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
            IConfiguration configuration)
        {
            _orderRepository = orderRepository;
            _inventoryService = inventoryService;
            _configuration = configuration;
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
            if (string.IsNullOrWhiteSpace(order.OrderStatus) || !PayableStatuses.Contains(order.OrderStatus))
                throw new Exception("Chỉ đơn đã duyệt mới được thanh toán.");
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
                Note = $"Cửa hàng thanh toán chuyển khoản thủ công cho đơn {order.OrderCode}"
            };

            _orderRepository.AddTransaction(transaction);
            return transaction;
        }

        public string CreateVnPayLink(int orderId, int storeId, string returnUrl, string ipAddress)
        {
            var order = _orderRepository.GetOrderDetail(orderId);
            if (order == null)
                throw new Exception("Không tìm thấy đơn hàng");
            if (order.StoreId != storeId)
                throw new Exception("Bạn không có quyền thanh toán đơn này");
            if (string.IsNullOrWhiteSpace(order.OrderStatus) || !PayableStatuses.Contains(order.OrderStatus))
                throw new Exception("Chỉ đơn đã duyệt mới được thanh toán.");
            if (order.PaymentStatus == "PAID")
                throw new Exception("Đơn này đã thanh toán rồi!");

            var vnpConfig = GetVnPayConfig();
            decimal amount = order.TotalAmount ?? 0m;
            if (amount <= 0)
                throw new Exception("Đơn hàng không có số tiền hợp lệ để thanh toán VNPAY.");

            var resolvedReturnUrl = !string.IsNullOrWhiteSpace(returnUrl)
                ? returnUrl
                : vnpConfig.DefaultReturnUrl;

            if (string.IsNullOrWhiteSpace(resolvedReturnUrl))
                throw new Exception("Thiếu cấu hình VNPAY return URL.");

            VnPayLibrary vnpay = new VnPayLibrary();

            vnpay.AddRequestData("vnp_Version", "2.1.0");
            vnpay.AddRequestData("vnp_Command", "pay");
            vnpay.AddRequestData("vnp_TmnCode", vnpConfig.TmnCode);
            vnpay.AddRequestData("vnp_Amount", ((long)(amount * 100)).ToString());
            vnpay.AddRequestData("vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss"));
            vnpay.AddRequestData("vnp_ExpireDate", DateTime.Now.AddMinutes(15).ToString("yyyyMMddHHmmss"));
            vnpay.AddRequestData("vnp_CurrCode", "VND");
            vnpay.AddRequestData("vnp_IpAddr", NormalizeIpAddress(ipAddress));
            vnpay.AddRequestData("vnp_Locale", "vn");
            vnpay.AddRequestData("vnp_OrderInfo", $"Thanh toan don hang {order.OrderId}");
            vnpay.AddRequestData("vnp_OrderType", "other");
            vnpay.AddRequestData("vnp_ReturnUrl", resolvedReturnUrl);
            vnpay.AddRequestData("vnp_TxnRef", $"{order.OrderId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}");

            return vnpay.CreateRequestUrl(vnpConfig.BaseUrl, vnpConfig.HashSecret);
        }

        public bool ProcessVnPayIPN(Dictionary<string, string> requestData)
        {
            VnPayLibrary vnpay = new VnPayLibrary();
            foreach (var kv in requestData)
            {
                if (kv.Key.StartsWith("vnp_"))
                    vnpay.AddResponseData(kv.Key, kv.Value);
            }

            var vnpConfig = GetVnPayConfig();
            string vnp_SecureHash = requestData.ContainsKey("vnp_SecureHash") ? requestData["vnp_SecureHash"] : "";

            if (!vnpay.ValidateSignature(vnp_SecureHash, vnpConfig.HashSecret))
                return false;

            if (vnpay.GetResponseData("vnp_ResponseCode") == "00" && vnpay.GetResponseData("vnp_TransactionStatus") == "00")
            {
                string txnRef = vnpay.GetResponseData("vnp_TxnRef");
                var orderRef = txnRef?.Split('_').FirstOrDefault();
                if (!int.TryParse(orderRef, out int orderId))
                    return false;

                var order = _orderRepository.GetOrderById(orderId);
                if (order != null && !string.Equals(order.PaymentStatus, "PAID", StringComparison.OrdinalIgnoreCase))
                {
                    order.PaymentStatus = "PAID";
                    order.UpdatedAt = DateTime.Now;
                    _orderRepository.UpdateOrder(order);

                    var transaction = new Transaction
                    {
                        InternalOrderId = orderId,
                        TransactionType = "REVENUE",
                        Amount = order.TotalAmount ?? 0,
                        PaymentMethod = "VNPAY",
                        TransactionDate = DateTime.Now,
                        Note = $"VNPAY thanh toán thành công mã GD: {vnpay.GetResponseData("vnp_TransactionNo")}"
                    };
                    _orderRepository.AddTransaction(transaction);
                }
                return true;
            }
            return false;
        }

        private (string TmnCode, string HashSecret, string BaseUrl, string DefaultReturnUrl) GetVnPayConfig()
        {
            var tmnCode = _configuration["VNPAY:TmnCode"];
            var hashSecret = _configuration["VNPAY:HashSecret"];
            var baseUrl = _configuration["VNPAY:BaseUrl"];
            var defaultReturnUrl = _configuration["VNPAY:DefaultReturnUrl"];

            if (string.IsNullOrWhiteSpace(tmnCode)
                || string.IsNullOrWhiteSpace(hashSecret)
                || string.IsNullOrWhiteSpace(baseUrl))
            {
                throw new Exception("Thiếu cấu hình VNPAY (TmnCode/HashSecret/BaseUrl).");
            }

            return (tmnCode, hashSecret, baseUrl, defaultReturnUrl ?? string.Empty);
        }

        private static string NormalizeIpAddress(string ipAddress)
        {
            if (string.IsNullOrWhiteSpace(ipAddress))
                return "127.0.0.1";

            if (!IPAddress.TryParse(ipAddress, out var parsed))
                return "127.0.0.1";

            if (IPAddress.IsLoopback(parsed))
                return "127.0.0.1";

            if (parsed.AddressFamily == AddressFamily.InterNetworkV6 && parsed.IsIPv4MappedToIPv6)
                return parsed.MapToIPv4().ToString();

            return parsed.ToString();
        }

        public Transaction? RefundOrderByPolicy(int orderId, int storeId, string policyCode, string? additionalNote)
        {
            if (string.IsNullOrWhiteSpace(policyCode))
                throw new Exception("Vui lòng chọn chính sách hoàn tiền.");

            var normalizedPolicy = policyCode.Trim();
            var policyMatch = RefundPolicies.FirstOrDefault(p =>
                string.Equals(p.Key, normalizedPolicy, StringComparison.OrdinalIgnoreCase)
                || string.Equals(p.Value.DisplayName, normalizedPolicy, StringComparison.OrdinalIgnoreCase));

            if (string.IsNullOrWhiteSpace(policyMatch.Key))
                throw new Exception("Mã chính sách hoàn tiền không hợp lệ. Vui lòng chọn lại từ danh sách chính sách.");

            var policy = policyMatch.Value;
            string fullReason = policy.DisplayName;
            if (!string.IsNullOrWhiteSpace(additionalNote))
                fullReason += $" - Ghi chú: {additionalNote}";

            var order = _orderRepository.GetOrderById(orderId);
            if (order == null)
                throw new Exception("Không tìm thấy đơn hàng.");
            if (order.StoreId != storeId)
                throw new Exception("Bạn không có quyền thao tác đơn này.");

            decimal totalPaidByTransactions = _orderRepository.GetTotalRevenueAmount(orderId);
            bool isPaidByStatus = string.Equals(order.PaymentStatus, "PAID", StringComparison.OrdinalIgnoreCase);
            bool isPaidByTransactions = totalPaidByTransactions > 0;

            if (!isPaidByStatus && !isPaidByTransactions)
                throw new Exception("Đơn hàng chưa được thanh toán.");

            decimal totalPaid = totalPaidByTransactions > 0 ? totalPaidByTransactions : (order.TotalAmount ?? 0);
            if (totalPaid <= 0)
                throw new Exception("Không xác định được số tiền đã thanh toán để hoàn tiền.");

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

            order.OrderStatus = "REFUNDED";
            order.UpdatedAt = DateTime.Now;
            _orderRepository.UpdateOrder(order);

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
            if (!string.Equals(order.PaymentStatus, "PAID", StringComparison.OrdinalIgnoreCase))
                throw new Exception("Đơn chưa thanh toán, chưa thể xác nhận nhận hàng.");
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

            if (string.Equals(newStatus, "COMPLETED", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(order.PaymentStatus, "PAID", StringComparison.OrdinalIgnoreCase))
            {
                throw new Exception("Đơn chưa thanh toán, không thể chuyển sang COMPLETED.");
            }

            // Giao toàn bộ 1 lần (Luồng cũ)
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

        // ==========================================
        // 🚚 API MỚI: XUẤT GIAO TỪNG PHẦN (PARTIAL SHIPPING)
        // ==========================================
        public InternalOrder? ShipItemsPartial(int orderId, List<ShipItemRequest> items)
        {
            var order = _orderRepository.GetOrderDetail(orderId) ?? throw new Exception("Không tìm thấy đơn hàng");

            // Chỉ cho phép giao khi đơn đang xử lý hoặc đã sản xuất
            if (order.OrderStatus != "APPROVED" && order.OrderStatus != "PROCESSING" && order.OrderStatus != "PRODUCED")
                throw new Exception($"Không thể xuất giao ở trạng thái {order.OrderStatus}.");

            using var transaction = _orderRepository.GetContext().Database.BeginTransaction();
            try
            {
                bool isFullyShipped = true;

                foreach (var detail in order.InternalOrderDetails)
                {
                    var reqItem = items.FirstOrDefault(x => x.ProductId == detail.ProductId);
                    decimal qtyToShip = reqItem?.QuantityToShip ?? 0;

                    if (qtyToShip > 0)
                    {
                        decimal targetQtyForDetail = detail.QuantityConfirmed > 0 ? detail.QuantityConfirmed.Value : (detail.QuantityOrdered ?? 0);

                        if ((detail.QuantityShipped + qtyToShip) > targetQtyForDetail)
                            throw new Exception($"Sản phẩm mã {detail.ProductId} xuất giao vượt quá số lượng yêu cầu!");

                        // Cập nhật số lượng đã giao
                        detail.QuantityShipped += qtyToShip;

                        // Trừ kho KITCHEN ngay lập tức cho số lượng vừa giao
                        _inventoryService.UpdateStockAndLog(
                            detail.ProductId ?? 0, "KITCHEN", order.KitchenId ?? 1, -qtyToShip,
                            "Xuất giao từng phần cho cửa hàng", order.OrderId, "INTERNAL_ORDER", null
                        );
                    }

                    // Kiểm tra lại xem dòng này đã giao đủ tổng chưa
                    decimal finalTargetQty = detail.QuantityConfirmed > 0 ? detail.QuantityConfirmed.Value : (detail.QuantityOrdered ?? 0);
                    if (detail.QuantityShipped < finalTargetQty)
                    {
                        isFullyShipped = false;
                    }
                }

                // Nếu giao đủ 100% tất cả các món, tự động chuyển sang SHIPPING để cửa hàng nhận
                if (isFullyShipped)
                {
                    order.OrderStatus = "SHIPPING";
                }
                else if (order.OrderStatus == "APPROVED" || order.OrderStatus == "PRODUCED")
                {
                    // Chuyển sang PROCESSING để hiểu là đang trong quá trình chuẩn bị/giao dở dang
                    order.OrderStatus = "PROCESSING";
                }

                order.UpdatedAt = DateTime.Now;
                _orderRepository.GetContext().SaveChanges();
                transaction.Commit();

                return order;
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
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