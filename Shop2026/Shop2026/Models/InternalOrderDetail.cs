using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class InternalOrderDetail
{
    public int DetailId { get; set; }

    public int? OrderId { get; set; }

    public int? ProductId { get; set; }

    public decimal? QuantityOrdered { get; set; }

    public decimal? QuantityConfirmed { get; set; }

    public decimal? QuantityShipped { get; set; }

    public virtual InternalOrder? Order { get; set; }

    public virtual Product? Product { get; set; }
}
