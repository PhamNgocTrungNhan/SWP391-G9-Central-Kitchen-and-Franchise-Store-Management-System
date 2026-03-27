using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Shop2026.DTOs
{
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
        public DateTime? ExpDate
        {
            get; set;
        }
        public int? OrderId
        {
            get; set;
        }
    }

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