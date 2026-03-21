using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")] 
    public class InventoryController : ControllerBase
    {
        private readonly InventoryService _service;
        public InventoryController(InventoryService service) => _service = service;

        // Xem danh sách tồn kho hiện tại
        [HttpGet("stock")]
        public IActionResult GetStock() => Ok(_service.GetAllStock());

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

        [HttpPost("import")]
        public IActionResult ImportRawMaterial([FromBody] ImportMaterialRequest request)
        {
            try
            {
                // Mặc định nhập vào Bếp trung tâm (KitchenId = 1). 
                // Sau này nếu có lấy từ Token ra thì bạn sửa ở đây.
                _service.ImportRawMaterial(request.ProductId, request.Quantity, kitchenId: 1);

                return Ok(new
                {
                    message = "Đã nhập kho nguyên liệu thành công!"
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