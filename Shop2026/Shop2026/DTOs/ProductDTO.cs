namespace Shop2026.DTOs
{
    public class ProductRequest
    {
        public string Sku { get; set; }
        public string ProductName { get; set; }
        public int CategoryId { get; set; }
        public string BaseUnit { get; set; } // Đơn vị đo kg , lít , ...
        public string ProductType { get; set; } // nguyen liệu hoặc thành phẩm 
        public decimal? PurchasePrice { get; set; } // Giá nhập từ NCC
        public decimal? InternalPrice { get; set; } // Giá Bếp bán cho Store
    }

    public class ProductResponse
    {
        public int ProductId { get; set; }
        public string Sku { get; set; }
        public string ProductName { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? BaseUnit { get; set; }
        public string? ProductType { get; set; }
        public decimal? PurchasePrice { get; set; }
        public decimal? InternalPrice { get; set; }
    }
}