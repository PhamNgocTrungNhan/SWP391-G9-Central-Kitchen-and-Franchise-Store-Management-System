using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class RecipesBom
{
    public int RecipeId { get; set; }

    public int? ParentProductId { get; set; }

    public int? MaterialId { get; set; }

    public decimal QuantityRequired { get; set; }

    public decimal? WasteAllowancePercent { get; set; }

    public virtual Product? Material { get; set; }

    public virtual Product? ParentProduct { get; set; }
}
