using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Shop2026.DTOs
{
    // ✅ DÙNG ĐỂ TẠO NHIỀU NGUYÊN LIỆU CÙNG LÚC
    public class CreateRecipeBulkRequest
    {
        [Required(ErrorMessage = "Vui lòng chọn Thành phẩm (ParentProductId).")]
        [Range(1, int.MaxValue, ErrorMessage = "ID Thành phẩm không hợp lệ.")]
        public int ParentProductId { get; set; }

        [Required(ErrorMessage = "Danh sách nguyên liệu không được để trống.")]
        [MinLength(1, ErrorMessage = "Vui lòng thêm ít nhất 1 nguyên liệu vào công thức.")]
        public List<RecipeDetailItem> Materials { get; set; } = new List<RecipeDetailItem>();
    }

    public class RecipeDetailItem
    {
        [Required(ErrorMessage = "Vui lòng chọn Nguyên liệu (MaterialId).")]
        [Range(1, int.MaxValue, ErrorMessage = "ID Nguyên liệu không hợp lệ.")]
        public int MaterialId { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập định lượng yêu cầu.")]
        [Range(0.0001, 999999.9999, ErrorMessage = "Định lượng phải lớn hơn 0.")]
        public decimal QuantityRequired { get; set; }
    }

    // ✅ DÙNG ĐỂ SỬA 1 DÒNG NGUYÊN LIỆU (Chỉ cần truyền Nguyên liệu mới và Số lượng)
    public class UpdateRecipeRequest
    {
        [Required(ErrorMessage = "Vui lòng chọn Nguyên liệu (MaterialId).")]
        [Range(1, int.MaxValue, ErrorMessage = "ID Nguyên liệu không hợp lệ.")]
        public int MaterialId { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập định lượng yêu cầu.")]
        [Range(0.0001, 999999.9999, ErrorMessage = "Định lượng phải lớn hơn 0.")]
        public decimal QuantityRequired { get; set; }
    }

    public class RecipeResponse
    {
        public int RecipeId { get; set; }
        public int? ParentProductId { get; set; }
        public string? ParentProductName { get; set; }
        public int? MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public string? MaterialUnit { get; set; }
        public decimal QuantityRequired { get; set; }
    }
}
