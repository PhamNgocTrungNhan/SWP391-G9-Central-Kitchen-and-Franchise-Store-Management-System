namespace Shop2026.DTOs
{
    public class ProductRequest
    {
        public string Sku { get; set; }
        public string ProductName { get; set; }
        public int CategoryId { get; set; }
        public string BaseUnit { get; set; } // Đơn vị đo kg , lít , ...
        public string ProductType { get; set; } // nguyen liệu hoặc thành phẩm 
    }
}