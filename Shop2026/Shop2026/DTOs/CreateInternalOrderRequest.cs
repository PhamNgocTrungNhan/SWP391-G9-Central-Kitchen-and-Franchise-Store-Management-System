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
}