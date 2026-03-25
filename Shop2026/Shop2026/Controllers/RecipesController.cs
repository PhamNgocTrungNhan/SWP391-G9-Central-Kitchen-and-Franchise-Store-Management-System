using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")] // Yêu cầu đăng nhập & quyền
    public class RecipesController : ControllerBase
    {
        private readonly RecipeService _service;
        public RecipesController(RecipeService service) => _service = service;

        // Lấy công thức của 1 sản phẩm cụ thể
        [HttpGet("parent/{parentProductId}")]
        public IActionResult GetByParent(int parentProductId) => Ok(_service.GetByParentProductId(parentProductId));

        [HttpPost]
        public IActionResult Create([FromBody] RecipeRequest request)
        {
            try
            {
                _service.Create(request);
                return Ok(new
                {
                    message = "Thêm định mức thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] RecipeRequest request)
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