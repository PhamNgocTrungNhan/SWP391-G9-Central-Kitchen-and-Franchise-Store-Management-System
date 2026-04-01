namespace Shop2026.DTOs
{
    // Dữ liệu vẽ biểu đồ Sản lượng
    public class ProductionSummaryDto
    {
        public string Date
        {
            get; set;
        }
        public decimal TotalPlanned
        {
            get; set;
        }
        public decimal TotalActual
        {
            get; set;
        }
    }

    //  Dữ liệu vẽ biểu đồ Tròn (Pie Chart) trạng thái đơn hàng
    public class OrderSummaryDto
    {
        public string Status
        {
            get; set;
        }
        public int TotalOrders
        {
            get; set;
        }
    }

    //  Dữ liệu vẽ biểu đồ Tồn kho
    public class InventorySummaryDto
    {
        public string LocationType
        {
            get; set;
        } // KITCHEN hoặc STORE
        public int LocationId
        {
            get; set;
        }
        public string ProductName
        {
            get; set;
        }
        public decimal TotalQuantity
        {
            get; set;
        }
    }
}