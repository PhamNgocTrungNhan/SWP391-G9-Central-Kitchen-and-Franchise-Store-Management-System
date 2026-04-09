using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Shop2026.DTOs
{
    public class SetMinStockBulkRequest
    {
        [Required]
        public List<MinStockItem> Items { get; set; } = new List<MinStockItem>();
    }

    public class MinStockItem
    {
        [Required]
        public int ProductId
        {
            get; set;
        }

        [Required]
        [Range(0, 999999, ErrorMessage = "Số lượng tối thiểu không được âm")]
        public decimal MinStockLevel
        {
            get; set;
        }
    }
}