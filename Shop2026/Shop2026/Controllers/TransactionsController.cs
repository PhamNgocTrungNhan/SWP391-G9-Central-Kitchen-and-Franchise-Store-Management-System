using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using System;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // 🚨 QUAN TRỌNG: Chỉ ADMIN và MANAGER mới được xem dòng tiền
    [Authorize(Roles = "ADMIN, MANAGER")]
    public class TransactionsController : ControllerBase
    {
        private readonly TransactionService _transactionService;

        public TransactionsController(TransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        // Lấy danh sách giao dịch
        // Có thể truyền ?type=REVENUE hoặc ?fromDate=2026-03-01 trên URL để lọc
        [HttpGet]
        public IActionResult GetHistory([FromQuery] string? type, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            try
            {
                var data = _transactionService.GetTransactionHistory(type, fromDate, toDate);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // THÊM API NÀY CHO FRONTEND GỌI LẤY TỔNG SỐ DƯ
        [HttpGet("summary")]
        public IActionResult GetSummary([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            try
            {
                var summary = _transactionService.GetTransactionSummary(fromDate, toDate);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}