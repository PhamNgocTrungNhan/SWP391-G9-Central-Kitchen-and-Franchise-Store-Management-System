using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class InternalOrder
{
    public int OrderId
    {
        get; set;
    }
    public string? OrderCode
    {
        get; set;
    }
    public int StoreId
    {
        get; set;
    }
    public int? KitchenId
    {
        get; set;
    }
    public string? OrderStatus
    {
        get; set;
    }
    public DateTime? ExpectedDeliveryDate
    {
        get; set;
    }
    public int? ApprovedBy
    {
        get; set;
    }
    public DateTime? ApprovedAt
    {
        get; set;
    }
    public decimal? TotalAmount
    {
        get; set;
    }
    public string? RejectionReason
    {
        get; set;
    }

    // ===================================
    // BỔ SUNG 3 CỘT CHO LUỒNG 4 (TRẢ HÀNG & FEEDBACK)
    // ===================================
    public string? ReturnReason
    {
        get; set;
    }
    public int? Rating
    {
        get; set;
    }
    public string? FeedbackComment
    {
        get; set;
    }

    public DateTime? CreatedAt
    {
        get; set;
    }
    public DateTime? UpdatedAt
    {
        get; set;
    }

    public virtual User? ApprovedByNavigation
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