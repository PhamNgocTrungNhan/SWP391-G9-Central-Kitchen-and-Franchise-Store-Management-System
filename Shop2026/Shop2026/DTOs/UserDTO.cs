namespace Shop2026.DTOs
{
    public class UserRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string? FullName { get; set; }
        public int? RoleId { get; set; }
        public int? StoreId { get; set; }
        public int? KitchenId { get; set; }
    }

    public class UserResponse
    {
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public string? FullName { get; set; }
        public int? RoleId { get; set; }
        public string? RoleName { get; set; }
        public int? StoreId { get; set; }
        public string? StoreName { get; set; }
        public int? KitchenId { get; set; }
        public string? KitchenName { get; set; }
    }
}
