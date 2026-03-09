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
    }
}
