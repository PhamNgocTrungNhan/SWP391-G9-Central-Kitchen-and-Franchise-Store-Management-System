using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class Product
{
    public int ProductId { get; set; }

    public string Sku { get; set; } = null!;

    public string ProductName { get; set; } = null!;

    public int? CategoryId { get; set; }

    public string? BaseUnit { get; set; }

    public string? ProductType { get; set; }

    public virtual Category? Category { get; set; }

    public decimal? PurchasePrice
    {
        get; set;
    }
    public decimal? InternalPrice
    {
        get; set;
    }
    public decimal? DefaultWastePercent 
    {
        get; set; 
    };

    public virtual ICollection<InternalOrderDetail> InternalOrderDetails { get; set; } = new List<InternalOrderDetail>();

    public virtual ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();

    public virtual ICollection<ProductionBatch> ProductionBatches { get; set; } = new List<ProductionBatch>();

    public virtual ICollection<RecipesBom> RecipesBomMaterials { get; set; } = new List<RecipesBom>();

    public virtual ICollection<RecipesBom> RecipesBomParentProducts { get; set; } = new List<RecipesBom>();

    public virtual ICollection<StockLog> StockLogs { get; set; } = new List<StockLog>();
}
