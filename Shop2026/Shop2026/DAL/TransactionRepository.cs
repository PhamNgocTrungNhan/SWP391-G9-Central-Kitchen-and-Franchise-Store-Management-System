using Shop2026.Models;
using Shop2026.Context;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Shop2026.DAL
{
    public class TransactionRepository
    {
        private readonly ApplicationDbContext _context;

        public TransactionRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // Lấy lịch sử giao dịch, có hỗ trợ lọc theo Loại (Thu/Chi) và Khoảng thời gian
        public List<Transaction> GetAllTransactions(string? type, DateTime? fromDate, DateTime? toDate)
        {
            var query = _context.Transactions
                                .Include(t => t.InternalOrder) // Nối bảng để lấy Mã đơn hàng
                                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(t => t.TransactionType == type.ToUpper());
            }
            if (fromDate.HasValue)
            {
                query = query.Where(t => t.TransactionDate >= fromDate.Value);
            }
            if (toDate.HasValue)
            {
                query = query.Where(t => t.TransactionDate <= toDate.Value);
            }

            return query.OrderByDescending(t => t.TransactionDate).ToList();
        }
    }
}