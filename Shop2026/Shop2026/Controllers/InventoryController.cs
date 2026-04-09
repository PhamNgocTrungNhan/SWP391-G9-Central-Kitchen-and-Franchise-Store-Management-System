using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Shop2026.DLL;
using Shop2026.DTOs;
using System;
using System.Threading.Tasks;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER, STORE_STAFF, KITCHEN_STAFF")]
    public class InventoryController : ControllerBase
    {
        private readonly InventoryService _service;
        private readonly ILogger<InventoryController> _logger;

        public InventoryController(InventoryService service, ILogger<InventoryController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // Xem danh sách tồn kho hiện tại (KITCHEN & STORE)
        [HttpGet("stock")]
        public IActionResult GetStock() => Ok(_service.GetAllStock());

        // Xem lịch sử ra/vào kho (Nhật ký)
        [HttpGet("logs")]
        public IActionResult GetLogs() => Ok(_service.GetStockLogs());

        // Xem tồn kho của Store cụ thể (Dùng bản Async từ nhánh update_function_material)
        [HttpGet("store/{storeId}")]
        public async Task<IActionResult> GetStoreInventory(int storeId)
        {
            try
            {
                var data = await _service.GetStoreInventoryAsync(storeId);
                return Ok(new { success = true, data = data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi hệ thống: " + ex.Message });
            }
        }

        [HttpPost("transfer/{orderId}")]
        public IActionResult TransferToStore(int orderId)
        {
            try
            {
                _service.TransferOrderToStore(orderId);
                return Ok(new
                {
                    message = $"Đã xuất kho thành công cho đơn hàng #{orderId}. Trạng thái cập nhật thành SHIPPING."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Nhập nguyên liệu (Giữ lại bản có Logging chi tiết từ HEAD)
        [HttpPost("import")]
        public IActionResult ImportRawMaterial([FromBody] ImportMaterialRequest request)
        {
            try
            {
                _logger.LogInformation(
                    "[InventoryImport] request received. ProductId={ProductId}, Quantity={Quantity}, SupplierId={SupplierId}, User={User}",
                    request.ProductId,
                    request.Quantity,
                    request.SupplierId,
                    User?.Identity?.Name ?? "anonymous");

                _service.ImportRawMaterial(request.ProductId, request.Quantity, 1, request.SupplierId);

                _logger.LogInformation(
                    "[InventoryImport] success. ProductId={ProductId}, Quantity={Quantity}, SupplierId={SupplierId}",
                    request.ProductId,
                    request.Quantity,
                    request.SupplierId);

                return Ok(new
                {
                    message = "Đã nhập kho nguyên liệu thành công!"
                });
            }
            catch (Exception ex)
            {
                var rootCause = GetInnermostMessage(ex);

                _logger.LogWarning(
                    ex,
                    "[InventoryImport] failed. ProductId={ProductId}, Quantity={Quantity}, SupplierId={SupplierId}, RootCause={RootCause}",
                    request?.ProductId,
                    request?.Quantity,
                    request?.SupplierId,
                    rootCause);

                return BadRequest(new
                {
                    message = ToClientImportMessage(ex),
                    errorCode = ToClientImportErrorCode(ex),
                    traceId = HttpContext.TraceIdentifier,
                    debugPayload = new
                    {
                        request?.ProductId,
                        request?.Quantity,
                        request?.SupplierId,
                        rootCause
                    }
                });
            }
        }

        // Xuất/Hủy kho từ Store (Từ nhánh update_function_material)
        [HttpPost("store/{storeId}/outbound")]
        public async Task<IActionResult> ProcessStoreOutbound(int storeId, [FromBody] OutboundRequestDTO request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu đầu vào không hợp lệ." });

            try
            {
                var result = await _service.ProcessStoreOutboundAsync(storeId, request);

                if (result)
                {
                    return Ok(new { success = true, message = "Xuất/Hủy kho thành công." });
                }
                return BadRequest(new { success = false, message = "Không thể xử lý yêu cầu." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi máy chủ: " + ex.Message });
            }
        }

        // --- CÁC HÀM HELPER XỬ LÝ LỖI TỪ HEAD ---

        private static string ToClientImportMessage(Exception ex)
        {
            if (IsStringTruncationError(ex))
            {
                return "Không thể ghi log nhập kho vì dữ liệu vượt độ dài cho phép của hệ thống.";
            }

            if (IsSaveChangesError(ex))
            {
                return "Không thể nhập kho lúc này. Vui lòng kiểm tra lại nguyên liệu, nhà cung cấp hoặc thử lại sau.";
            }

            return ex.Message;
        }

        private static string ToClientImportErrorCode(Exception ex)
        {
            if (!IsSaveChangesError(ex))
            {
                return "INV_IMPORT_BUSINESS_ERROR";
            }

            var root = GetInnermostMessage(ex);
            if (root.Contains("UQ_Inventory", StringComparison.OrdinalIgnoreCase))
            {
                return "INV_IMPORT_DUPLICATE_INVENTORY";
            }

            if (root.Contains("FK_Stock_Logs_Suppliers", StringComparison.OrdinalIgnoreCase))
            {
                return "INV_IMPORT_SUPPLIER_FK_FAILED";
            }

            if (root.Contains("FK__Stock_Log__produ", StringComparison.OrdinalIgnoreCase))
            {
                return "INV_IMPORT_PRODUCT_FK_FAILED";
            }

            if (root.Contains("String or binary data would be truncated", StringComparison.OrdinalIgnoreCase))
            {
                return "INV_IMPORT_LOG_FIELD_TOO_LONG";
            }

            return "INV_IMPORT_SAVE_FAILED";
        }

        private static bool IsSaveChangesError(Exception ex)
        {
            if (ex is DbUpdateException)
            {
                return true;
            }

            var message = ex.Message ?? string.Empty;
            return message.Contains("An error occurred while saving the entity changes", StringComparison.OrdinalIgnoreCase)
                || message.Contains("inner exception", StringComparison.OrdinalIgnoreCase);
        }

        private static string GetInnermostMessage(Exception ex)
        {
            var current = ex;
            while (current.InnerException != null)
            {
                current = current.InnerException;
            }

            return current.Message ?? ex.Message ?? "Unknown error";
        }

        private static bool IsStringTruncationError(Exception ex)
        {
            var root = GetInnermostMessage(ex);
            return root.Contains("String or binary data would be truncated", StringComparison.OrdinalIgnoreCase);
        }
    }
}