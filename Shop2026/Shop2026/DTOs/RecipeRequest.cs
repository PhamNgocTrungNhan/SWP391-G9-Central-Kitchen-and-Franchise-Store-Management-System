using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Shop2026.DTOs
{
    public class CreateRecipeBulkRequest
    {
        [Required]
        public int ParentProductId
        {
            get; set;
        }

        [Required]
        [MinLength(1, ErrorMessage = "Cần ít nhất 1 nguyên liệu.")]
        public List<RecipeDetailItem> Materials { get; set; } = new List<RecipeDetailItem>();
    }

    public class RecipeDetailItem
    {
        [Required]
        public int MaterialId
        {
            get; set;
        }

        [Required]
        [Range(0.0001, 999999.9999)]
        public decimal QuantityRequired
        {
            get; set;
        }

        // ✅ THÊM LẠI HAO HỤT CHO TỪNG DÒNG
        [Range(0, 100, ErrorMessage = "Hao hụt tối đa chỉ từ 0 đến 100%")]
        public decimal MaxWastePercent { get; set; } = 0;
    }

    public class UpdateRecipeRequest
    {
        [Required]
        public int MaterialId
        {
            get; set;
        }

        [Required]
        [Range(0.0001, 999999.9999)]
        public decimal QuantityRequired
        {
            get; set;
        }

        [Range(0, 100)]
        public decimal MaxWastePercent { get; set; } = 0;
    }

    public class RecipeResponse
    {
        public int RecipeId
        {
            get; set;
        }
        public int? ParentProductId
        {
            get; set;
        }
        public string? ParentProductName
        {
            get; set;
        }
        public int? MaterialId
        {
            get; set;
        }
        public string? MaterialName
        {
            get; set;
        }
        public string? MaterialUnit
        {
            get; set;
        }
        public decimal QuantityRequired
        {
            get; set;
        }
        public decimal? MaxWastePercent
        {
            get; set;
        } 
    }
}