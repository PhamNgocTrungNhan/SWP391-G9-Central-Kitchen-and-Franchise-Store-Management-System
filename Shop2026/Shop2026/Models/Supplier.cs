namespace Shop2026.Models
{
    public class Supplier
    {
        public int SupplierId
        {
            get; set;
        }
        public string SupplierName { get; set; } = null!;
        public string? ContactInfo
        {
            get; set;
        }
        public string? Address
        {
            get; set;
        }
        public bool IsActive { get; set; } = true;
    }
}