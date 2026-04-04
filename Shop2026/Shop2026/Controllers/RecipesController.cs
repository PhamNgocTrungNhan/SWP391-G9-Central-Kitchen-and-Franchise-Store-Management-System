using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")]
    public class RecipesController : ControllerBase
    {
        private readonly RecipeService _service;
        public RecipesController(RecipeService service) => _service = service;

        [HttpGet("parent/{parentProductId}")]
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

        [HttpPost("clone-bom")]
        public IActionResult CloneBom([FromBody] CloneBomRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Thiếu dữ liệu." });
            try
            {
                _service.CloneBom(request.SourceParentProductId, request.TargetParentProductId);
                return Ok(new { message = "Đã sao chép công thức (BOM) sang sản phẩm đích." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
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