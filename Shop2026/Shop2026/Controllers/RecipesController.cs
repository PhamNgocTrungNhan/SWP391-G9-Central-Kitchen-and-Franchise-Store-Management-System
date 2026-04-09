using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecipesController : ControllerBase
    {
        private readonly RecipeService _service;
        public RecipesController(RecipeService service) => _service = service;

        [HttpGet("parent/{parentProductId}")]
        [Authorize(Roles = "ADMIN, MANAGER, STORE_STAFF")]
        public IActionResult GetByParent(int parentProductId)
        {
            try
            {
                return Ok(_service.GetByParentProductId(parentProductId));
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ✅ ĐỔI HÀM NÀY ĐỂ NHẬN ARRAY
        [HttpPost]
        [Authorize(Roles = "ADMIN, MANAGER")]
        public IActionResult CreateBulk([FromBody] CreateRecipeBulkRequest request)
        {
            try
            {
                _service.CreateBulk(request);
                return Ok(new
                {
                    message = "Lưu công thức thành công!"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN, MANAGER")]
        public IActionResult Update(int id, [FromBody] UpdateRecipeRequest request)
        {
            try
            {
                _service.Update(id, request);
                return Ok(new
                {
                    message = "Cập nhật định mức thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "ADMIN, MANAGER")]
        public IActionResult Delete(int id)
        {
            try
            {
                _service.Delete(id);
                return Ok(new
                {
                    message = "Xóa dòng nguyên liệu thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
