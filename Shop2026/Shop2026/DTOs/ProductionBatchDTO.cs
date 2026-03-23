using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Shop2026.DTOs
{
    // Dùng cho BE2-04: Tạo mẻ
    public class BatchCreateRequest
    {
        public int ProductId
        {
            get; set;
        }
        public decimal QuantityPlanned
        {
            get; set;
        }
        public DateTime MfgDate
        {
            get; set;
        }

        // LUỒNG 2: Mới thêm - Nhận OrderId từ FE nếu mẻ này làm cho đơn hàng
        public int? OrderId
        {
            get; set;
        }
    }

    // Dùng cho BE2-05: Update Status
    public class BatchStatusUpdateRequest
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = null!;

        [JsonPropertyName("quantityActual")]
        public decimal? QuantityActual
        {
            get; set;
        }

        [JsonPropertyName("additionalMaterials")]
        public List<ExtraMaterialRequest>? AdditionalMaterials
        {
            get; set;
        }
    }

    // Dùng cho BE2-06: Allocate to Orders
    public class BatchAllocationRequest
    {
        public int OrderId
        {
            get; set;
        }
        public decimal AllocatedQuantity
        {
            get; set;
        }
    }

    // Model phụ để hứng danh sách nguyên liệu dùng thêm
    public class ExtraMaterialRequest
    {
        public int ProductId
        {
            get; set;
        }
        public decimal QuantityUsed
        {
            get; set;
        }
    }
}