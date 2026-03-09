namespace Shop2026.DTOs
{
    public class CreateInternalOrderRequest
    {
        public int StoreId { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }
        public List<CreateInternalOrderDetailRequest> OrderDetails { get; set; }
    }

    public class CreateInternalOrderDetailRequest
    {
        public int ProductId { get; set; }
        public int QuantityOrdered { get; set; }
        public int QuantityConfirmed { get; set; }
        public int QuantityShipped { get; set; }
    }
}
