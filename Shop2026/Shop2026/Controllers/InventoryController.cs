using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;
using System;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InventoryController : ControllerBase
    {
        private readonly InventoryService _service;
        public InventoryController(InventoryService service) => _service = service;

        [HttpGet("stock")]
        [Authorize(Roles = "ADMIN, MANAGER, KITCHEN_STAFF, STORE_STAFF, SUPPLY_COORDINATOR")]
        public IActionResult GetStock() => Ok(_service.GetAllStock());

        [HttpGet("store/{storeId}")]
        [Authorize(Roles = "ADMIN, MANAGER, KITCHEN_STAFF, STORE_STAFF, SUPPLY_COORDINATOR")]
        public IActionResult GetStoreInventory(int storeId)
        {
            return Ok(_service.GetStoreInventory(storeId));
        }

        [HttpGet("logs")]
        [Authorize(Roles = "ADMIN, MANAGER, KITCHEN_STAFF, STORE_STAFF, SUPPLY_COORDINATOR")]
        public IActionResult GetLogs() => Ok(_service.GetStockLogs());

        [HttpPost("transfer/{orderId}")]
        [Authorize(Roles = "ADMIN, MANAGER")]
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
        [Authorize(Roles = "ADMIN, MANAGER")]
        public IActionResult ImportRawMaterial([FromBody] ImportMaterialRequest request)
        {
            try
            {
                _service.ImportRawMaterial(request.ProductId, request.Quantity, 1, request.SupplierId);

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