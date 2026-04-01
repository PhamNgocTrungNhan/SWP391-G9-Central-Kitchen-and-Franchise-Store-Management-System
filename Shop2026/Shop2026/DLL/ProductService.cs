using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class ProductService
    {
        private readonly ProductRepository _repo;
        public ProductService(ProductRepository repo) => _repo = repo;

        // Lấy tất cả (Dành cho Admin tổng)
        public IEnumerable<Product> GetAll() => _repo.GetAll();

        // Chỉ lấy Nguyên liệu thô (RAW)
        public IEnumerable<Product> GetRawMaterials()
        {
            return _repo.GetAll().Where(p => p.ProductType == "RAW").ToList();
        }

        // Lấy Bán thành phẩm & Thành phẩm (Khác RAW)
        public IEnumerable<Product> GetManufacturedProducts()
        {
            return _repo.GetAll().Where(p => p.ProductType != "RAW").ToList();
        }

        public void Create(ProductRequest request)
        {
            var product = new Product
            {
                Sku = request.Sku,
                ProductName = request.ProductName,
                CategoryId = request.CategoryId,
                BaseUnit = request.BaseUnit,
                ProductType = request.ProductType,
                PurchasePrice = request.PurchasePrice,
                InternalPrice = request.InternalPrice
            };
            _repo.Add(product);
        }

        public void Update(int id, ProductRequest request)
        {
            var product = _repo.GetById(id) ?? throw new Exception("Không tìm thấy sản phẩm");
            product.Sku = request.Sku;
            product.ProductName = request.ProductName;
            product.CategoryId = request.CategoryId;
            product.BaseUnit = request.BaseUnit;
            product.ProductType = request.ProductType;
            product.PurchasePrice = request.PurchasePrice;
            product.InternalPrice = request.InternalPrice;
            _repo.Update(product);
        }

        public void Delete(int id)
        {
            var product = _repo.GetById(id) ?? throw new Exception("Không tìm thấy sản phẩm");
            _repo.Delete(product);
        }
    }
}