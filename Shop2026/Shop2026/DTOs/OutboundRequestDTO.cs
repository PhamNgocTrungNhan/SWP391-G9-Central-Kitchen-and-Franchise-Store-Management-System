namespace Shop2026.DTOs
{
    public class OutboundRequestDTO
    {
        public int ProductId { get; set; }
        public decimal Quantity { get; set; }
        // Reason ví dụ: "RETURN_TO_KITCHEN", "WASTE_EXPIRED"
        public string Reason { get; set; }
        // Ghi chú chi tiết nếu cần
        public string Note { get; set; }
    }
}