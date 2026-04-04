using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.Models;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrganizationController : ControllerBase
    {
        private readonly OrganizationService _service;

        public OrganizationController(OrganizationService service)
        {
            _service = service;
        }

        // ================= STORE API (Thoải mái CRUD) =================

        [HttpGet("stores")]
        [Authorize(Roles = "ADMIN, MANAGER, KITCHEN_STAFF, STORE_STAFF, SUPPLY_COORDINATOR")]
        public IActionResult GetStores()
        {
            var stores = _service.GetAllStores();
            return Ok(stores);
        }

        [HttpPost("stores")]
        [Authorize(Roles = "ADMIN")]
        public IActionResult CreateStore([FromBody] Store store)
        {
            try
            {
                _service.CreateStore(store);
                return Ok(new
                {
                    message = "Tạo cửa hàng thành công."
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

        [HttpPut("stores/{id}")]
        [Authorize(Roles = "ADMIN")]
        public IActionResult UpdateStore(int id, [FromBody] Store store)
        {
            try
            {
                store.StoreId = id;
                _service.UpdateStore(store);
                return Ok(new
                {
                    message = "Cập nhật thông tin cửa hàng thành công."
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

        [HttpDelete("stores/{id}")]
        [Authorize(Roles = "ADMIN")]
        public IActionResult DeleteStore(int id)
        {
            try
            {
                _service.DeleteStore(id);
                return Ok(new
                {
                    message = "Đã vô hiệu hóa cửa hàng (Soft Delete)."
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

        // ================= KITCHEN API (Độc nhất, không có POST) =================

        [HttpGet("kitchens")]
        [Authorize(Roles = "ADMIN, MANAGER")]
        public IActionResult GetKitchens()
        {
            var kitchens = _service.GetAllKitchens();
            return Ok(kitchens);
        }

        [HttpPut("kitchens/{id}")]
        [Authorize(Roles = "ADMIN")]
        public IActionResult UpdateKitchen(int id, [FromBody] Kitchen kitchen)
        {
            try
            {
                kitchen.KitchenId = id;
                _service.UpdateKitchen(kitchen);
                return Ok(new
                {
                    message = "Cập nhật thông tin bếp trung tâm thành công."
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