using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class Product
{
    public int ProductId { get; set; }

    public string Sku { get; set; } = null!;

    public string Name { get; set; } = null!;

    public int? CategoryId { get; set; }

    public string? BaseUnit { get; set; }

    public string? ProductType { get; set; }

    public virtual Category? Category { get; set; }

<<<<<<< Updated upstream
    public virtual Inventory? Inventory { get; set; }
=======
    public decimal? PurchasePrice
    {
        get; set;
    }
    public decimal? InternalPrice
    {
        get; set;
    }

    public virtual ICollection<InternalOrderDetail> InternalOrderDetails { get; set; } = new List<InternalOrderDetail>();
>>>>>>> Stashed changes

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

    public virtual ICollection<ProductionBatch> ProductionBatches { get; set; } = new List<ProductionBatch>();

    public virtual ICollection<RecipesBom> RecipesBomMaterials { get; set; } = new List<RecipesBom>();

    public virtual ICollection<RecipesBom> RecipesBomParentProducts { get; set; } = new List<RecipesBom>();

    public virtual ICollection<StockLog> StockLogs { get; set; } = new List<StockLog>();
}
