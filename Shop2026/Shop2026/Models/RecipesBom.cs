using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Shop2026.Models;

public partial class RecipesBom
{
    public int RecipeId { get; set; }

    public int? ParentProductId { get; set; }

    public int? MaterialId { get; set; }

    public decimal QuantityRequired { get; set; }

    /// <summary>
    /// The <c>waste_allowance_percent</c> column was removed from <c>Recipes_BOM</c> in the database.
    /// Kept as <see cref="NotMappedAttribute"/> so EF Core does not select or persist it; use
    /// <see cref="Product.DefaultWastePercent"/> on the material product when waste is needed.
    /// </summary>
    [NotMapped]
    public decimal? WasteAllowancePercent { get; set; }

    public virtual Product? Material { get; set; }

    public virtual Product? ParentProduct { get; set; }
}
