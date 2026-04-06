using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;
using System;
using System.Threading.Tasks;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER, STORE_STAFF, KITCHEN_STAFF")]
    public class InventoryController : ControllerBase
    {
        private readonly InventoryService _service;

        public InventoryController(InventoryService service)
        {
            _service = service;
        }

        // Xem danh sách tồn kho hiện tại (KITCHEN & STORE)
        [HttpGet("stock")]
        public IActionResult GetStock() => Ok(_service.GetAllStock());

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
                return Ok(new { message = $"Đã xuất kho thành công cho đơn hàng #{orderId}. Trạng thái cập nhật thành SHIPPING." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("import")]
        public IActionResult ImportRawMaterial([FromBody] ImportMaterialRequest request)
        {
            try
            {
                _service.ImportRawMaterial(request.ProductId, request.Quantity, 1, request.SupplierId);
                return Ok(new { message = "Đã nhập kho nguyên liệu thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/inventory/store/1 (Đã gộp lấy bản Async)
        [HttpGet("store/{storeId}")]
        public async Task<IActionResult> GetStoreInventory(int storeId)
        {
            try
            {
                var data = await _service.GetStoreInventoryAsync(storeId);
                return Ok(new { success = true, data = data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        // POST: api/inventory/store/1/outbound
        [HttpPost("store/{storeId}/outbound")]
        public async Task<IActionResult> ProcessStoreOutbound(int storeId, [FromBody] OutboundRequestDTO request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu đầu vào không hợp lệ." });

            try
            {
                var result = await _service.ProcessStoreOutboundAsync(storeId, request);

                if (result)
                {
                    return Ok(new { success = true, message = "Xuất/Hủy kho thành công." });
                }
                return BadRequest(new { success = false, message = "Không thể xử lý yêu cầu." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi máy chủ: " + ex.Message });
            }
        }
    }
}