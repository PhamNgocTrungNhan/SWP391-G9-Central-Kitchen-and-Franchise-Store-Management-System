using System.ComponentModel.DataAnnotations;

namespace Shop2026.DTOs
{
    public class ShipItemRequest
    {
        [Required]
        public int ProductId
        {
            get; set;
        }

        [Required]
        [Range(0.01, 999999, ErrorMessage = "Số lượng giao phải lớn hơn 0")]
        public decimal QuantityToShip
        {
            get; set;
        }
    }
}