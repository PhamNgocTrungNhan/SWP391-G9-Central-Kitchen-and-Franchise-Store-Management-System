using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Shop2026.DTOs
{
    public class AgentSnapshotRowDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("ok")]
        public bool Ok { get; set; }

        [JsonPropertyName("status")]
        public int Status { get; set; }

        [JsonPropertyName("ms")]
        public int Ms { get; set; }

        [JsonPropertyName("summary")]
        public string Summary { get; set; } = "";
    }

    /// <summary>FE gửi sau mỗi chu kỳ đồng bộ (đọc-only).</summary>
    public class AgentSnapshotDto
    {
        [JsonPropertyName("capturedAt")]
        public string? CapturedAt { get; set; }

        [JsonPropertyName("clientVersion")]
        public string? ClientVersion { get; set; }

        [JsonPropertyName("rows")]
        public List<AgentSnapshotRowDto>? Rows { get; set; }
    }
}
