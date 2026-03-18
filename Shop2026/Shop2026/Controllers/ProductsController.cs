using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")]
    public class ProductsController : ControllerBase
    {
        private readonly ProductService _service;
        public ProductsController(ProductService service) => _service = service;

        [HttpGet]
        public IActionResult GetAll() => Ok(_service.GetAll());

        // Lấy nguyên liệu
        [HttpGet("raw")]
        public IActionResult GetRawMaterials()
        {
            return Ok(_service.GetRawMaterials());
        }

        //  Lấy sản phẩm chế biến
        [HttpGet("manufactured")]
        public IActionResult GetManufacturedProducts()
        {
            return Ok(_service.GetManufacturedProducts());
        }

        [HttpPost]
        public IActionResult Create([FromBody] ProductRequest request)
        {
            try
            {
                _service.Create(request);
                return Ok(new
                {
                    message = "Tạo sản phẩm thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] ProductRequest request)
        {
            try
            {
                _service.Update(id, request);
                return Ok(new
                {
                    message = "Cập nhật thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                _service.Delete(id);
                return Ok(new
                {
                    message = "Xóa thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}