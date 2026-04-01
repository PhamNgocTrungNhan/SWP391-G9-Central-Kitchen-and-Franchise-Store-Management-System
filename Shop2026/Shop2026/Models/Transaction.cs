using System;

namespace Shop2026.Models;

public partial class Transaction
{
    public int TransactionId
    {
        get; set;
    }
    public int? InternalOrderId
    {
        get; set;
    }
    public int? PurchaseOrderId
    {
        get; set;
    }
    public string? TransactionType
    {
        get; set;
    }
    public decimal Amount
    {
        get; set;
    }
    public string? PaymentMethod
    {
        get; set;
    }
    public DateTime? TransactionDate
    {
        get; set;
    }
    public string? Note
    {
        get; set;
    }

    public virtual InternalOrder? InternalOrder
    {
        get; set;
    }
}