using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class Inventory
{
    public int InventoryId { get; set; }

    public int? ProductId { get; set; }

    public string? LocationType { get; set; }

    public int? LocationId { get; set; }

    public decimal? CurrentQuantity { get; set; }

    /// <summary>Đơn vị hiển thị tại dòng tồn kho; null = dùng đơn vị mặc định của sản phẩm.</summary>
    public string? DisplayUnit { get; set; }

    public DateTime? LastUpdated { get; set; }

    public virtual Product? Product { get; set; }
}
