using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Shop2026.DTOs
{
    public class CompleteBatchRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập số lượng thực tế đạt được.")]
        [Range(0.01, 999999)]
        public decimal QuantityActual
        {
            get; set;
        }

        // Bếp gửi báo cáo các nguyên liệu đã xài và đã vứt đi
        public List<BatchMaterialUsageDto> MaterialUsages { get; set; } = new List<BatchMaterialUsageDto>();
    }

    public class BatchMaterialUsageDto
    {
        [Required]
        public int MaterialId
        {
            get; set;
        }

        [Required]
        [Range(0, 999999, ErrorMessage = "Lượng dùng thực tế không hợp lệ")]
        public decimal ActualUsed
        {
            get; set;
        } // Số lượng chui vào bánh

        [Required]
        [Range(0, 999999, ErrorMessage = "Lượng hao hụt thực tế không hợp lệ")]
        public decimal ActualWasted
        {
            get; set;
        } // Số lượng vứt sọt rác
    }
}