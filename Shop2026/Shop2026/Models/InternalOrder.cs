using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class InternalOrder
{
    public int OrderId { get; set; }

    public int StoreId { get; set; }

    public int? KitchenId { get; set; }

<<<<<<< Updated upstream
    public string? OrderStatus { get; set; }

    public decimal? TotalCost { get; set; }

    public decimal? InternalRevenue { get; set; }

    public string? RejectionReason { get; set; }

    public string? StoreFeedback { get; set; }

    public int? FeedbackRating { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
=======
    public virtual User? ApprovedByNavigation
    {
        get; set;
    }

    public string? PaymentStatus
    {
        get; set;
    }

    public virtual ICollection<InternalOrderDetail> InternalOrderDetails { get; set; } = new List<InternalOrderDetail>();
    public virtual Kitchen? Kitchen
    {
        get; set;
    }
    public virtual ICollection<ProductionBatchOrder> ProductionBatchOrders { get; set; } = new List<ProductionBatchOrder>();
    public virtual Store Store { get; set; } = null!;
}
>>>>>>> Stashed changes
