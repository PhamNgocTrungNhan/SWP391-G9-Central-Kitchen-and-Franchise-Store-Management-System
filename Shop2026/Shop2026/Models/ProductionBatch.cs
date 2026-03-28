using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class ProductionBatch
{
    public int BatchId { get; set; }

    public int? ProductId { get; set; }

    public string? BatchCode { get; set; }

    public decimal? QuantityPlanned { get; set; }

    public decimal? QuantityActual { get; set; }

    public DateOnly? MfgDate { get; set; }

    public DateOnly? ExpDate { get; set; }

    public string? Status { get; set; }

    public virtual Product? Product { get; set; }

    public virtual ICollection<ProductionBatchOrder> ProductionBatchOrders { get; set; } = new List<ProductionBatchOrder>();
}
