using System;

namespace Shop2026.Models;

public partial class ProductionBatchMaterial
{
    public int BatchMaterialId
    {
        get; set;
    }
    public int? BatchId
    {
        get; set;
    }
    public int? MaterialId
    {
        get; set;
    }
    public decimal? ActualUsed
    {
        get; set;
    }
    public decimal? ActualWasted
    {
        get; set;
    }

    public virtual ProductionBatch? Batch
    {
        get; set;
    }
    public virtual Product? Material
    {
        get; set;
    }
}