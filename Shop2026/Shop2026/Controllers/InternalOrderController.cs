using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;
using System;
using System.Linq;
using System.Collections.Generic;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/internal-orders")]
    [Authorize]
    public class InternalOrderController : ControllerBase
    {
        private readonly InternalOrderService _orderService;

        public InternalOrderController(InternalOrderService orderService)
        {
            _orderService = orderService;
        }

        private bool TryGetStoreId(out int storeId)
        {
            storeId = 0;
            var claim = User.FindFirst("StoreId")?.Value;
            return claim != null && int.TryParse(claim, out storeId);
        }

        private bool TryGetUserId(out int userId)
        {
            userId = 0;
            var claim = User.FindFirst("UserId")?.Value;
            return claim != null && int.TryParse(claim, out userId);
        }

        private bool IsAdmin() => User.IsInRole("ADMIN");

        [HttpPost]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult CreateOrder([FromBody] CreateInternalOrderRequest request)
        {
            if (IsAdmin())
            {
                if (request.StoreId <= 0)
                    return BadRequest(new
                    {
                        message = "ADMIN vui lòng truyền StoreId hợp lệ để tạo đơn."
                    });
            }
            else
            {
                if (!TryGetStoreId(out int storeId))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId in Token"
                    });
                request.StoreId = storeId;
            }

            try
            {
                var order = _orderService.CreateInternalOrder(request);
                return Ok(new
                {
                    message = "Order created successfully",
                    orderId = order.OrderId
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{orderId}/pay")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult PayOrder(int orderId)
        {
            int storeIdToPass;
            if (IsAdmin())
            {
                var orderForStore = _orderService.GetOrderDetail(orderId);
                if (orderForStore == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                storeIdToPass = (int)orderForStore.StoreId;
            }
            else
            {
                if (!TryGetStoreId(out storeIdToPass))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId"
                    });
            }

            try
            {
                var transaction = _orderService.PayOrder(orderId, storeIdToPass);
                return Ok(new
                {
                    message = "Thanh toán thủ công thành công!",
                    transactionId = transaction?.TransactionId,
                    amountPaid = transaction?.Amount
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ==========================================
        // 🚀 API LẤY LINK MÃ QR THANH TOÁN TỪ VNPAY
        // ==========================================
        [HttpPost("{orderId}/vnpay-link")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult CreateVnPayLink(int orderId, [FromQuery] string returnUrl = "http://localhost:5173/payment-result")
        {
            int storeIdToPass;
            if (IsAdmin())
            {
                var order = _orderService.GetOrderDetail(orderId);
                if (order == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                storeIdToPass = (int)order.StoreId;
            }
            else
            {
                if (!TryGetStoreId(out storeIdToPass))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId"
                    });
            }

            try
            {
                string ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
                string checkoutUrl = _orderService.CreateVnPayLink(orderId, storeIdToPass, returnUrl, ipAddress);
                return Ok(new
                {
                    message = "Tạo link VNPAY thành công",
                    checkoutUrl
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ==========================================
        // 🤖 API HỨNG IPN TỪ VNPAY (VNPAY BẮN VỀ)
        // ==========================================
        [HttpGet("vnpay-ipn")]
        [AllowAnonymous] // Bắt buộc mở để máy chủ VNPAY chọc vào được
        public IActionResult VnPayIPN()
        {
            try
            {
                var requestData = new Dictionary<string, string>();
                foreach (var (key, value) in Request.Query)
                {
                    if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_"))
                    {
                        requestData.Add(key, value.ToString());
                    }
                }

                bool isSuccess = _orderService.ProcessVnPayIPN(requestData);

                // VNPAY yêu cầu định dạng phản hồi chuẩn này để họ không gọi lại nữa
                if (isSuccess)
                {
                    return Ok(new
                    {
                        RspCode = "00",
                        Message = "Confirm Success"
                    });
                }
                else
                {
                    return Ok(new
                    {
                        RspCode = "97",
                        Message = "Invalid Signature or Failed"
                    });
                }
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    RspCode = "99",
                    Message = "Unknown Error"
                });
            }
        }

        [HttpGet]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult GetStoreOrders([FromQuery] string? status, [FromQuery] int? storeId)
        {
            int targetStoreId;
            if (IsAdmin())
            {
                if (!storeId.HasValue || storeId.Value <= 0)
                    return BadRequest(new
                    {
                        message = "ADMIN vui lòng cung cấp ?storeId= trên URL."
                    });
                targetStoreId = storeId.Value;
            }
            else
            {
                if (!TryGetStoreId(out targetStoreId))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId"
                    });
            }
            return Ok(_orderService.GetStoreOrders(targetStoreId, status));
        }

        [HttpGet("{orderId}")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult GetOrderDetail(int orderId)
        {
            var order = _orderService.GetOrderDetail(orderId);
            if (order == null)
                return NotFound(new
                {
                    message = "Order not found"
                });
            if (!IsAdmin())
            {
                if (!TryGetStoreId(out int storeId) || order.StoreId != storeId)
                    return Forbid();
            }
            return Ok(order);
        }

        [HttpPut("{orderId}/cancel")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult CancelOrder(int orderId)
        {
            int storeIdToPass;
            if (IsAdmin())
            {
                var order = _orderService.GetOrderDetail(orderId);
                if (order == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                storeIdToPass = (int)order.StoreId;
            }
            else
            {
                if (!TryGetStoreId(out storeIdToPass))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId"
                    });
            }

            try
            {
                var result = _orderService.CancelOrder(orderId, storeIdToPass);
                if (!result)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                return Ok(new
                {
                    message = "Order cancelled successfully"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{orderId}/confirm-completed")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult ConfirmOrderCompleted(int orderId)
        {
            int storeIdToPass;
            if (IsAdmin())
            {
                var orderForStore = _orderService.GetOrderDetail(orderId);
                if (orderForStore == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                storeIdToPass = (int)orderForStore.StoreId;
            }
            else
            {
                if (!TryGetStoreId(out storeIdToPass))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId"
                    });
            }

            try
            {
                var order = _orderService.ConfirmOrderCompleted(orderId, storeIdToPass);
                if (order == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                return Ok(new
                {
                    message = "Order marked as COMPLETED",
                    order
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{orderId}/approve")]
        [Authorize(Roles = "ADMIN, SUPPLY_COORDINATOR")]
        public IActionResult ApproveOrder(int orderId)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized(new
                {
                    message = "Invalid UserId"
                });
            var order = _orderService.ApproveOrder(orderId, userId);
            if (order == null)
                return NotFound(new
                {
                    message = "Order not found"
                });
            return Ok(order);
        }

        [HttpPut("{orderId}/reject")]
        [Authorize(Roles = "ADMIN, SUPPLY_COORDINATOR")]
        public IActionResult RejectOrder(int orderId, [FromBody] RejectOrderRequest request)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized(new
                {
                    message = "Invalid UserId"
                });
            try
            {
                var order = _orderService.RejectOrder(orderId, request.Reason, userId);
                if (order == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                return Ok(new
                {
                    message = "Order rejected successfully",
                    order
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{orderId}/status")]
        [Authorize(Roles = "ADMIN, SUPPLY_COORDINATOR, KITCHEN_STAFF")]
        public IActionResult UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusRequest request)
        {
            try
            {
                var order = _orderService.UpdateOrderStatus(orderId, request.Status);
                if (order == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                return Ok(new
                {
                    message = "Order status updated successfully",
                    order
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("all")]
        [Authorize(Roles = "ADMIN, SUPPLY_COORDINATOR")]
        public IActionResult GetAllOrdersForCoordinator([FromQuery] string? status)
        {
            try
            {
                return Ok(_orderService.GetAllOrders(status));
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("kitchen")]
        [Authorize(Roles = "ADMIN, KITCHEN_STAFF")]
        public IActionResult GetKitchenOrders([FromQuery] string? status, [FromQuery] int kitchenId = 1)
        {
            try
            {
                return Ok(_orderService.GetKitchenOrders(kitchenId, status));
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{orderId}/return")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult ReturnOrder(int orderId, [FromBody] RejectOrderRequest request)
        {
            int storeIdToPass;
            if (IsAdmin())
            {
                var orderForStore = _orderService.GetOrderDetail(orderId);
                if (orderForStore == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                storeIdToPass = (int)orderForStore.StoreId;
            }
            else
            {
                if (!TryGetStoreId(out storeIdToPass))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId"
                    });
            }

            try
            {
                var order = _orderService.ReturnOrder(orderId, storeIdToPass, request.Reason);
                if (order == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                return Ok(new
                {
                    message = "Order returned successfully.",
                    order
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("feedback")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult SubmitFeedback([FromBody] CreateFeedbackRequest request)
        {
            if (!TryGetStoreId(out int storeId))
                return Unauthorized(new
                {
                    message = "Invalid StoreId"
                });
            try
            {
                var order = _orderService.SubmitFeedback(request, storeId);
                if (order == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                return Ok(new
                {
                    message = "Đã gửi Feedback thành công!"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("refund-policies")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult GetRefundPolicies()
        {
            var policies = InternalOrderService.RefundPolicies.Select(p => new
            {
                PolicyCode = p.Key,
                DisplayName = p.Value.DisplayName,
                RefundPercentage = p.Value.Percentage
            });
            return Ok(policies);
        }

        [HttpPost("{orderId}/refund")]
        [Authorize(Roles = "ADMIN, STORE_STAFF")]
        public IActionResult RefundOrderByPolicy(int orderId, [FromBody] RefundByPolicyRequest request)
        {
            int storeIdToPass;
            if (IsAdmin())
            {
                var orderForStore = _orderService.GetOrderDetail(orderId);
                if (orderForStore == null)
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                storeIdToPass = (int)orderForStore.StoreId;
            }
            else
            {
                if (!TryGetStoreId(out storeIdToPass))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId"
                    });
            }

            try
            {
                var transaction = _orderService.RefundOrderByPolicy(orderId, storeIdToPass, request.PolicyCode, request.AdditionalNote);
                return Ok(new
                {
                    message = "Đã xử lý hoàn tiền thành công!",
                    transactionId = transaction?.TransactionId,
                    refundAmount = transaction?.Amount
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}