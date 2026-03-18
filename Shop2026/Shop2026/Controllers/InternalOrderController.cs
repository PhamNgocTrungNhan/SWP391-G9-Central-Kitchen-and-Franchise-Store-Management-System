using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

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

        // ================= HELPER =================
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

        // ================= STORE STAFF =================
        //Create Order
        [HttpPost]
        [Authorize(Roles = "STORE_STAFF")]
        public IActionResult CreateOrder([FromBody] CreateInternalOrderRequest request)
        {
            if (!TryGetStoreId(out int storeId))
                return Unauthorized(new { message = "Invalid StoreId" });

            request.StoreId = storeId;

            var order = _orderService.CreateInternalOrder(request);

            return Ok(new
            {
                message = "Order created successfully",
                orderId = order.OrderId
            });
        }
        //Ger Store Orders
        [HttpGet]
        [Authorize(Roles = "STORE_STAFF")]
        public IActionResult GetStoreOrders([FromQuery] string? status)
        {
            if (!TryGetStoreId(out int storeId))
                return Unauthorized(new { message = "Invalid StoreId" });

            var orders = _orderService.GetStoreOrders(storeId, status);
            return Ok(orders);
        }
        //Get Order Detail
        [HttpGet("{orderId}")]
        [Authorize(Roles = "STORE_STAFF")]
        public IActionResult GetOrderDetail(int orderId)
        {
            if (!TryGetStoreId(out int storeId))
                return Unauthorized(new { message = "Invalid StoreId" });

            var order = _orderService.GetOrderDetail(orderId);

            if (order == null)
                return NotFound(new { message = "Order not found" });

            if (order.StoreId != storeId)
                return Forbid();

            return Ok(order);
        }
        //Cancel Order
        [HttpPut("{orderId}/cancel")]
        [Authorize(Roles = "STORE_STAFF")]
        public IActionResult CancelOrder(int orderId)
        {
            if (!TryGetStoreId(out int storeId))
                return Unauthorized(new { message = "Invalid StoreId" });

            try
            {
                var result = _orderService.CancelOrder(orderId, storeId);

                if (!result)
                    return NotFound(new { message = "Order not found" });

                return Ok(new { message = "Order cancelled successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        //Confirm Order Completed
        [HttpPut("{orderId}/confirm-completed")]
        [Authorize(Roles = "STORE_STAFF")]
        public IActionResult ConfirmOrderCompleted(int orderId)
        {
            if (!TryGetStoreId(out int storeId))
                return Unauthorized(new { message = "Invalid StoreId" });

            try
            {
                var order = _orderService.ConfirmOrderCompleted(orderId, storeId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                return Ok(new
                {
                    message = "Order marked as COMPLETED",
                    order
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ================= SUPPLY COORDINATOR =================
        //Get All Orders
        [HttpPut("{orderId}/approve")]
        [Authorize(Roles = "SUPPLY_COORDINATOR")]
        public IActionResult ApproveOrder(int orderId)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized(new { message = "Invalid UserId" });

            var order = _orderService.ApproveOrder(orderId, userId);

            if (order == null)
                return NotFound(new { message = "Order not found" });

            return Ok(order);
        }
        //Reject Order
        [HttpPut("{orderId}/reject")]
        [Authorize(Roles = "SUPPLY_COORDINATOR")]
        public IActionResult RejectOrder(int orderId, [FromBody] RejectOrderRequest request)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized(new { message = "Invalid UserId" });

            try
            {
                var order = _orderService.RejectOrder(orderId, request.Reason, userId);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                return Ok(new
                {
                    message = "Order rejected successfully",
                    order
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        //Update Order Status
        [HttpPut("{orderId}/status")]
        [Authorize(Roles = "SUPPLY_COORDINATOR")]
        public IActionResult UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusRequest request)
        {
            try
            {
                var order = _orderService.UpdateOrderStatus(orderId, request.Status);

                if (order == null)
                    return NotFound(new { message = "Order not found" });

                return Ok(new
                {
                    message = "Order status updated successfully",
                    order
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}