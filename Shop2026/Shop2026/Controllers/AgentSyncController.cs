using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Shop2026.DTOs;
using System;
using System.Text.Json;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AgentSyncController : ControllerBase
    {
        private readonly ILogger<AgentSyncController> _logger;
        private readonly IConfiguration _configuration;

        private static readonly object SyncRoot = new();
        private static AgentSnapshotDto? _lastSnapshot;
        private static DateTime? _lastSnapshotAtUtc;
        private static string? _lastWebhookJson;
        private static DateTime? _lastWebhookAtUtc;

        public AgentSyncController(ILogger<AgentSyncController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>Client (JWT) đẩy snapshot sau khi gom GET — chỉ ghi log + bộ nhớ tạm.</summary>
        [HttpPost("snapshot")]
        [Authorize(Roles = "ADMIN, MANAGER, KITCHEN_STAFF, SUPPLY_COORDINATOR, STORE_STAFF")]
        public IActionResult PostSnapshot([FromBody] AgentSnapshotDto? body)
        {
            var n = body?.Rows?.Count ?? 0;
            lock (SyncRoot)
            {
                _lastSnapshot = body;
                _lastSnapshotAtUtc = DateTime.UtcNow;
            }
            _logger.LogInformation("AgentSync snapshot rows={Count} at={At}", n, body?.CapturedAt);
            return Ok(new { message = "Đã nhận snapshot", receivedAtUtc = DateTime.UtcNow, rowCount = n });
        }

        /// <summary>Webhook ngoài (CI, POS, …). Bắt buộc header X-Agent-Webhook-Secret khớp AgentSync:WebhookSecret.</summary>
        [HttpPost("webhook")]
        [AllowAnonymous]
        public IActionResult PostWebhook(
            [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
            [FromHeader(Name = "X-Agent-Webhook-Secret")] string? secret)
        {
            var expected = _configuration["AgentSync:WebhookSecret"];
            if (string.IsNullOrWhiteSpace(expected))
            {
                return StatusCode(503, new { message = "Webhook chưa bật: thêm AgentSync:WebhookSecret trong cấu hình." });
            }

            if (!string.Equals(secret, expected, StringComparison.Ordinal))
            {
                return Unauthorized(new { message = "Sai hoặc thiếu X-Agent-Webhook-Secret." });
            }

            var raw = body.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? "{}" : body.GetRawText();
            lock (SyncRoot)
            {
                _lastWebhookJson = raw.Length > 8000 ? raw[..8000] + "…" : raw;
                _lastWebhookAtUtc = DateTime.UtcNow;
            }
            _logger.LogInformation("AgentSync webhook bytes={Len}", raw.Length);
            return Ok(new { ok = true, receivedAtUtc = DateTime.UtcNow });
        }

        /// <summary>Trạng thái nhận gần nhất (không chứa toàn bộ dữ liệu nhạy cảm).</summary>
        [HttpGet("status")]
        [Authorize(Roles = "ADMIN, MANAGER, KITCHEN_STAFF, SUPPLY_COORDINATOR, STORE_STAFF")]
        public IActionResult GetStatus()
        {
            lock (SyncRoot)
            {
                return Ok(new
                {
                    lastSnapshotAtUtc = _lastSnapshotAtUtc,
                    lastSnapshotRowCount = _lastSnapshot?.Rows?.Count,
                    lastWebhookAtUtc = _lastWebhookAtUtc,
                    webhookPreviewLength = _lastWebhookJson?.Length ?? 0,
                });
            }
        }
    }
}
