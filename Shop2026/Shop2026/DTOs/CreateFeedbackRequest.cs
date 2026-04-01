namespace Shop2026.DTOs
{
    public class CreateFeedbackRequest
    {
        public int OrderId { get; set; }

        public int Rating { get; set; }   // 1 - 5

        public string? Comment { get; set; }
    }
}
