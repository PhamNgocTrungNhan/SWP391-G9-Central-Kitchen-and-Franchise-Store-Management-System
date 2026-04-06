namespace Shop2026.DTOs
{
    public class InventoryResponse
    {
        public int InventoryId { get; set; }
        public int? ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? ProductSku { get; set; }
        public string? LocationType { get; set; }
        public int? LocationId { get; set; }
        public string? LocationName { get; set; }
        public decimal? CurrentQuantity { get; set; }
        public string? BaseUnit { get; set; }
        public DateTime? LastUpdated { get; set; }
    }

    public class StockLogResponse
    {
        public long LogId { get; set; }
        public int? ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? LocationType { get; set; }
        public int? LocationId { get; set; }
        public decimal? ChangeQuantity { get; set; }
        public string? Reason { get; set; }
        public int? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class InventoryItemDTO
    {
        public int InventoryId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public string BaseUnit { get; set; }
        public decimal CurrentQuantity { get; set; }
        public DateTime? LastUpdated { get; set; }
    }
}
