namespace Shop2026.DTOs
{
    // Dùng cho BE2-04: Tạo mẻ
    public class BatchCreateRequest
    {
        public int ProductId
        {
            get; set;
        }
        public decimal QuantityPlanned
        {
            get; set;
        }
        public DateTime MfgDate
        {
            get; set;
        }
    }

    // Dùng cho BE2-05: Update Status
    public class BatchStatusUpdateRequest
    {
        public string Status
        {
            get; set;
        } // SCHEDULED, IN_PROGRESS, COMPLETED
        public decimal? QuantityActual
        {
            get; set;
        } // Chỉ bắt buộc nhập khi chọn COMPLETED
    }

    // Dùng cho BE2-06: Allocate to Orders
    public class BatchAllocationRequest
    {
        public int OrderId
        {
            get; set;
        }
        public decimal AllocatedQuantity
        {
            get; set;
        }
    }
}