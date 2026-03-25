using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")]
    public class CategoryController : ControllerBase
    {
        private readonly CategoryService _service;
        public CategoryController(CategoryService service) => _service = service;

        [HttpGet]
        public IActionResult GetAll() => Ok(_service.GetAll());

        [HttpPost]
        public IActionResult Create([FromBody] CategoryRequest request)
        {
            try
            {
                _service.Create(request);
                return Ok(new
                {
                    message = "Tạo danh mục thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] CategoryRequest request)
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