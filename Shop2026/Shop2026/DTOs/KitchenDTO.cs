namespace Shop2026.DTOs
{
    public class KitchenRequest
    {
        public string KitchenName { get; set; } = null!;
        public string? Address { get; set; }
    }

    public class KitchenResponse
    {
        public int KitchenId { get; set; }
        public string? KitchenName { get; set; }
        public string? Address { get; set; }
    }
}
