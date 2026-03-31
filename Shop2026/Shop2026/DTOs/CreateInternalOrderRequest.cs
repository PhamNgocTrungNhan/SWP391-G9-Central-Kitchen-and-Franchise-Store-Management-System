using System;
using System.Collections.Generic;

namespace Shop2026.DTOs
{
    public class CreateInternalOrderRequest
    {
        public int StoreId
        {
            get; set;
        }
        public int? KitchenId { get; set; } = 1;
        public DateTime ExpectedDeliveryDate
        {
            get; set;
        }
        public List<CreateInternalOrderDetailRequest> OrderDetails { get; set; } = new List<CreateInternalOrderDetailRequest>();
    }

    public class CreateInternalOrderDetailRequest
    {
        public int ProductId
        {
            get; set;
        }

        // SỬA THÀNH DECIMAL ĐỂ KHỚP VỚI DATABASE (Tránh lỗi văng 500 khi FE gửi số thập phân)
        public decimal QuantityOrdered
        {
            get; set;
        }
        public decimal? QuantityConfirmed
        {
            get; set;
        }
        public decimal? QuantityShipped
        {
            get; set;
        }
    }

    public class InternalOrderResponse
    {
        public int OrderId { get; set; }
        public string? OrderCode { get; set; }
        public int StoreId { get; set; }
        public string? StoreName { get; set; }
        public int? KitchenId { get; set; }
        public string? KitchenName { get; set; }
        public string? OrderStatus { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public int? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public decimal? TotalAmount { get; set; }
        public string? PaymentStatus { get; set; }
        public string? RejectionReason { get; set; }
        public string? ReturnReason { get; set; }
        public int? Rating { get; set; }
        public string? FeedbackComment { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<InternalOrderDetailResponse>? OrderDetails { get; set; }
    }

    public class InternalOrderDetailResponse
    {
        public int DetailId { get; set; }
        public int? OrderId { get; set; }
        public int? ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? ProductSku { get; set; }
        public decimal? QuantityOrdered { get; set; }
        public decimal? QuantityConfirmed { get; set; }
        public decimal? QuantityShipped { get; set; }
        public decimal? UnitPrice { get; set; }
    }
}