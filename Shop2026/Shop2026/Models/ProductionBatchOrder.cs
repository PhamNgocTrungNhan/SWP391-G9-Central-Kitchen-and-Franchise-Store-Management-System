using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class ProductionBatchOrder
{
    public int BatchId { get; set; }

    public int OrderId { get; set; }

    public decimal? AllocatedQuantity { get; set; }

    public virtual ProductionBatch Batch { get; set; } = null!;

    public virtual InternalOrder Order { get; set; } = null!;
}
