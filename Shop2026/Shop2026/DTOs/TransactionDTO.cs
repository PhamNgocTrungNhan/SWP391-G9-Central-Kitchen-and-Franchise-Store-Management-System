using System;

namespace Shop2026.DTOs
{
    public class TransactionDTO
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
        } // REVENUE (Thu), EXPENSE (Chi)
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

        // Bổ sung mã đơn hàng để Frontend dễ hiển thị
        public string? InternalOrderCode
        {
            get; set;
        }
    }
}