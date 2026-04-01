using Shop2026.DAL;
using Shop2026.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Shop2026.DLL
{
    public class TransactionService
    {
        private readonly TransactionRepository _repo;

        public TransactionService(TransactionRepository repo)
        {
            _repo = repo;
        }

        public List<TransactionDTO> GetTransactionHistory(string? type, DateTime? fromDate, DateTime? toDate)
        {
            var transactions = _repo.GetAllTransactions(type, fromDate, toDate);

            return transactions.Select(t => new TransactionDTO
            {
                TransactionId = t.TransactionId,
                InternalOrderId = t.InternalOrderId,
                PurchaseOrderId = t.PurchaseOrderId,
                TransactionType = t.TransactionType,
                Amount = t.Amount,
                PaymentMethod = t.PaymentMethod,
                TransactionDate = t.TransactionDate,
                Note = t.Note,
                InternalOrderCode = t.InternalOrder?.OrderCode
            }).ToList();
        }

        // THÊM HÀM NÀY ĐỂ TÍNH TỔNG TIỀN CHO SẾP XEM
        public object GetTransactionSummary(DateTime? fromDate, DateTime? toDate)
        {
            var query = _repo.GetAllTransactions(null, fromDate, toDate);

            // Nhờ C# tính toán tổng thu và tổng chi
            decimal totalRevenue = query.Where(t => t.TransactionType == "REVENUE").Sum(t => t.Amount);
            decimal totalExpense = query.Where(t => t.TransactionType == "EXPENSE").Sum(t => t.Amount);

            return new
            {
                TotalRevenue = totalRevenue, // Tổng tiền thu được (Từ Store)
                TotalExpense = totalExpense, // Tổng tiền chi ra (Trả NCC - sau này làm)
                CurrentBalance = totalRevenue - totalExpense // Số tiền hiện tại đang có trong két
            };
        }
    }
}