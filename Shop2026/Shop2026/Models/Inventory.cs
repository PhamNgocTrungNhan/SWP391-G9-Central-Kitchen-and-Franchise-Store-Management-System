using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class Inventory
{
    public int InventoryId { get; set; }

    public int? ProductId { get; set; }

    public decimal? CurrentQty { get; set; }

    public decimal? MinAlertQty { get; set; }

    public DateTime? LastUpdated { get; set; }

    public virtual Product? Product { get; set; }
}
