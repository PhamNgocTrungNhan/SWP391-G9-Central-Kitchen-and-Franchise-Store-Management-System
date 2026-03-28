using System;

namespace Shop2026.DTOs
{
    public class RefundByPolicyRequest
    {
        // FE sẽ gửi các mã như: "HUY_VUI_VE", "HANG_HONG", "TRE_HEN"
        public string PolicyCode { get; set; } = null!;

        // Ghi chú thêm của nhân viên (VD: "Bánh bị mốc góc trái")
        public string? AdditionalNote
        {
            get; set;
        }
    }
}