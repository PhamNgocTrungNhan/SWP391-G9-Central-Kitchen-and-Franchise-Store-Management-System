//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Shop2026.Models;

//namespace Shop2026.Controllers
//{
//    [Route("api/[controller]")]
//    [ApiController]
//    public class ProductsController : ControllerBase
//    {
//        private readonly ApplicationDbContext _context;

//        public ProductsController(ApplicationDbContext context)
//        {
//            _context = context;
//        }

//        [HttpGet]
//        public async Task<IActionResult> GetProducts()
//        {
//            var products = await _context.Products.ToListAsync();
//            return Ok(products);
//        }

//        [HttpPost]
//        public async Task<IActionResult> CreateProduct([FromBody] Product product)
//        {
//            _context.Products.Add(product);
//            await _context.SaveChangesAsync();
//            return Ok(new { Message = "Thêm sản phẩm thành công", Product = product });
//        }

//        [HttpPut("{id}")]
//        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product updatedProduct)
//        {
//            var product = await _context.Products.FindAsync(id);
//            if (product == null) return NotFound("Không tìm thấy sản phẩm.");

//            product.Name = updatedProduct.Name;
//            product.Sku = updatedProduct.Sku;
//            product.BaseUnit = updatedProduct.BaseUnit;
//            product.ProductType = updatedProduct.ProductType;

//            await _context.SaveChangesAsync();
//            return Ok(new { Message = "Cap nhat thanh cong" });
//        }

//        [HttpDelete("{id}")]
//        public async Task<IActionResult> DeleteProduct(int id)
//        {
//            var product = await _context.Products.FindAsync(id);
//            if (product == null) return NotFound();
//            _context.Products.Remove(product);
//            await _context.SaveChangesAsync();
//            return Ok(new { Message = "Xoa thanh cong" });
//        }
//    }
//}