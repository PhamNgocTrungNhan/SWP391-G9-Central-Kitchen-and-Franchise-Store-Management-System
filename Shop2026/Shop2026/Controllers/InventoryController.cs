using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")] // Yêu cầu quyền quản lý kho
    public class InventoryController : ControllerBase
    {
        private readonly InventoryService _service;
        public InventoryController(InventoryService service) => _service = service;

        // Xem danh sách tồn kho hiện tại
        [HttpGet("stock")]
        public IActionResult GetStock() => Ok(_service.GetAllStock());
        //Get Store Inventory
        [HttpGet("store/{storeId}")]
        public IActionResult GetStoreInventory(int storeId)
        {
            return Ok(_service.GetStoreInventory(storeId));
        }

        // Xem lịch sử ra/vào kho (Nhật ký)
        [HttpGet("logs")]
        public IActionResult GetLogs() => Ok(_service.GetStockLogs());

        // Xuất kho giao cho cửa hàng
        [HttpPost("transfer/{orderId}")]
        public IActionResult TransferToStore(int orderId)
        {
            try
            {
                _service.TransferOrderToStore(orderId);
                return Ok(new
                {
                    message = $"Đã xuất kho thành công cho đơn hàng #{orderId}. Trạng thái cập nhật thành SHIPPING."
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