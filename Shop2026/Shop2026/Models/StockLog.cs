using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class StockLog
{
    public long LogId { get; set; }

    public int? ProductId { get; set; }

    public string? LocationType { get; set; }

    public int? LocationId { get; set; }

    public decimal? ChangeQuantity { get; set; }

    public string? Reason { get; set; }

    public int? ReferenceId { get; set; }

    public string? ReferenceType { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Product? Product { get; set; }
}
