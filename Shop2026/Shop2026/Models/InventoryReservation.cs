using System;

namespace Shop2026.Models
{
    public class InventoryReservation
    {
        public int ReservationId { get; set; }
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public string LocationType { get; set; } = null!;
        public int LocationId { get; set; }
        public decimal QuantityReserved { get; set; }
        public DateTime ReservationDate { get; set; }
        public string Status { get; set; } = "PENDING";  // PENDING, CONFIRMED, CANCELLED
        
        public virtual InternalOrder? Order { get; set; }
        public virtual Product? Product { get; set; }
    }
}
