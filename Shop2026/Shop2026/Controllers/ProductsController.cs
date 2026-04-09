using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly ProductService _service;
        public ProductsController(ProductService service) => _service = service;

        [HttpGet]
        [Authorize(Roles = "ADMIN, MANAGER")]
        public IActionResult GetAll() => Ok(_service.GetAll());

        // Lấy nguyên liệu
        [HttpGet("raw")]
        [Authorize(Roles = "ADMIN, MANAGER")]
        public IActionResult GetRawMaterials()
        {
            return Ok(_service.GetRawMaterials());
        }

        //  Lấy sản phẩm chế biến
        [HttpGet("manufactured")]
        [Authorize(Roles = "ADMIN, MANAGER, STORE_STAFF")] // STORE_STAFF cần xem để tạo đơn hàng
        public IActionResult GetManufacturedProducts()
        {
            return Ok(_service.GetManufacturedProducts());
        }

        [HttpPost]
        [Authorize(Roles = "ADMIN, MANAGER")]
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

        [HttpGet("{id}/production-info")]
        [Authorize]
        public IActionResult GetProductionHoverInfo(int id, [FromServices] Shop2026.Context.ApplicationDbContext _context)
        {
            var product = _context.Products.Find(id);
            if (product == null)
                return NotFound();

            // Lấy tồn kho tại Bếp (KitchenId = 1)
            var stock = _context.Inventories
                .Where(i => i.ProductId == id && i.LocationType == "KITCHEN" && i.LocationId == 1)
                .Select(i => i.CurrentQuantity).FirstOrDefault();

            // Lấy công thức (BOM) — explicit columns (waste_allowance_percent removed from DB)
            var recipe = _context.RecipesBoms
                .FromSqlInterpolated($@"
                    SELECT [recipe_id], [material_id], [parent_product_id], [quantity_required]
                    FROM [Recipes_BOM]
                    WHERE [parent_product_id] = {id}")
                .Include(r => r.Material)
                .Select(r => new {
                    MaterialName = r.Material!.ProductName,
                    QuantityRequired = r.QuantityRequired,
                    Unit = r.Material.BaseUnit
                }).ToList();

            return Ok(new
            {
                ProductName = product.ProductName,
                CurrentKitchenStock = stock,
                Recipe = recipe
            });
        }
    }
}