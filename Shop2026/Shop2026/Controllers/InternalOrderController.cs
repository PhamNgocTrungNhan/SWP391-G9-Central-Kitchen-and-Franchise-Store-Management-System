using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;
using System;
using System.Linq;

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
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
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
                        message = "ADMIN vui lòng cung cấp ?storeId= trên URL để xem danh sách."
                    });

                targetStoreId = storeId.Value;
            }
            else
            {
                if (!TryGetStoreId(out targetStoreId))
                    return Unauthorized(new
                    {
                        message = "Invalid StoreId in Token"
                    });
            }

            var orders = _orderService.GetStoreOrders(targetStoreId, status);
            return Ok(orders);
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
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
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
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
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
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
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
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        [HttpGet("all")]
        [Authorize(Roles = "ADMIN, SUPPLY_COORDINATOR")]
        public IActionResult GetAllOrdersForCoordinator([FromQuery] string? status)
        {
            try
            {
                var orders = _orderService.GetAllOrders(status);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        [HttpGet("kitchen")]
        [Authorize(Roles = "ADMIN, KITCHEN_STAFF")]
        public IActionResult GetKitchenOrders([FromQuery] string? status, [FromQuery] int kitchenId = 1)
        {
            try
            {
                var orders = _orderService.GetKitchenOrders(kitchenId, status);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
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
                    message = "Order returned successfully. Kitchen inventory restored.",
                    order
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
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
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // ==========================================
        // ✅ THÊM MỚI: API XỬ LÝ THANH TOÁN CHUYỂN KHOẢN
        // ==========================================
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
                    message = "Thanh toán chuyển khoản thành công!",
                    transactionId = transaction?.TransactionId,
                    amountPaid = transaction?.Amount
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // ==========================================
        // ✅ THÊM MỚI: API LẤY DANH SÁCH LÝ DO HOÀN TIỀN
        // ==========================================
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

        // ==========================================
        // ✅ THÊM MỚI: API YÊU CẦU HOÀN TIỀN DỰA THEO POLICY
        // ==========================================
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
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}