using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/internal-orders")]
    public class InternalOrderController : ControllerBase
    {
        private readonly InternalOrderService _orderService;

        public InternalOrderController(InternalOrderService orderService)
        {
            _orderService = orderService;
        }

        [HttpPost]
        public IActionResult CreateOrder([FromBody] CreateInternalOrderRequest request)
        {
            var order = _orderService.CreateInternalOrder(request);

            return Ok(new
            {
                message = "Order created successfully",
                orderId = order.OrderId
            });
        }
        //Get Store Orders
        [HttpGet]
        public IActionResult GetStoreOrders(
        [FromQuery] int storeId,
        [FromQuery] string? status)
        {
            var orders = _orderService.GetStoreOrders(storeId, status);

            return Ok(orders);
        }
        //Get Order Detail
        [HttpGet("{orderId}")]
        public IActionResult GetOrderDetail(int orderId)
        {
            var order = _orderService.GetOrderDetail(orderId);

            if (order == null)
            {
                return NotFound(new
                {
                    message = "Order not found"
                });
            }

            return Ok(order);
        }
        //Cancel Order
        [HttpPut("{orderId}/cancel")]
        public IActionResult CancelOrder(int orderId)
        {
            try
            {
                var result = _orderService.CancelOrder(orderId);

                if (!result)
                {
                    return NotFound(new
                    {
                        message = "Order not found"
                    });
                }

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
    }
}
