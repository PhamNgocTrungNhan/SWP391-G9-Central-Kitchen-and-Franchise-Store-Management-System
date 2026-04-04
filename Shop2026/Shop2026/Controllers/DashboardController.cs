using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // Đọc dashboard: toàn bộ vai trò đăng nhập hợp lệ (FE gọi khi vào trang chủ). Thao tác nhạy cảm vẫn nằm ở controller khác.
    [Authorize(Roles = "ADMIN, MANAGER, KITCHEN_STAFF, STORE_STAFF, SUPPLY_COORDINATOR")]
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