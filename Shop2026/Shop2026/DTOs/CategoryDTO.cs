namespace Shop2026.DTOs
{
    public class CategoryRequest
    {
        public string Name { get; set; } = null!;
    }

    public class CategoryResponse
    {
        public int CategoryId { get; set; }
        public string Name { get; set; } = null!;
    }
}