using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class StockLog
{
    public long LogId { get; set; }

    public int? ProductId { get; set; }

    public decimal? ChangeQty { get; set; }

    public string? Reason { get; set; }

    public int? ReferenceId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Product? Product { get; set; }
}
