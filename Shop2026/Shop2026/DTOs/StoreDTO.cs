namespace Shop2026.DTOs
{
    public class StoreRequest
    {
        public string StoreName { get; set; } = null!;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class StoreResponse
    {
        public int StoreId { get; set; }
        public string? StoreName { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public bool? IsActive { get; set; }
    }
}
