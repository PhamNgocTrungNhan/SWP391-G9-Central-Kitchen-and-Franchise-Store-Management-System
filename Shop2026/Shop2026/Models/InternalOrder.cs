using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class InternalOrder
{
    public int OrderId { get; set; }

    public int StoreId { get; set; }

    public int? KitchenId { get; set; }

    public string? OrderStatus { get; set; }

    public decimal? TotalCost { get; set; }

    public decimal? InternalRevenue { get; set; }

    public string? RejectionReason { get; set; }

    public string? StoreFeedback { get; set; }

    public int? FeedbackRating { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
