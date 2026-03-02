using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class OrderDetail
{
    public int DetailId { get; set; }

    public int? OrderId { get; set; }

    public int? ProductId { get; set; }

    public decimal? QtyOrdered { get; set; }

    public decimal? QtyDelivered { get; set; }

    public decimal? UnitPrice { get; set; }

    public virtual SalesOrder? Order { get; set; }

    public virtual Product? Product { get; set; }
}
