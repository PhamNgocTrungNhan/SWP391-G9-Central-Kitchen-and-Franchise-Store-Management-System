namespace Shop2026.DTOs
{
    public class SupplierRequest
    {
        public string SupplierName { get; set; } = null!;
        public string? ContactInfo
        {
            get; set;
        }
        public string? Address
        {
            get; set;
        }
        public bool IsActive
        {
            get; set;
        }
    }
}