using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")] // Dữ liệu nhạy cảm của hệ thống, chỉ sếp mới được xem
    public class DashboardController : ControllerBase
    {
        private readonly DashboardService _service;
        public DashboardController(DashboardService service) => _service = service;

        // GET: api/Dashboard/production?days=30
        [HttpGet("production")]
        public IActionResult GetProductionSummary([FromQuery] int days = 30)
        {
            return Ok(_service.GetProductionSummary(days));
        }

        // GET: api/Dashboard/orders
        [HttpGet("orders")]
        public IActionResult GetOrderSummary()
        {
            return Ok(_service.GetOrderSummary());
        }

        // GET: api/Dashboard/inventory?locationType=KITCHEN
        [HttpGet("inventory")]
        public IActionResult GetInventorySummary([FromQuery] string locationType = null)
        {
            return Ok(_service.GetInventorySummary(locationType));
        }
    }
}