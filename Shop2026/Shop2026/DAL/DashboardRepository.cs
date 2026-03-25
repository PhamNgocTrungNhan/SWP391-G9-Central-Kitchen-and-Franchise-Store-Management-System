using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.DTOs;

namespace Shop2026.DAL
{
    public class DashboardRepository
    {
        private readonly ApplicationDbContext _context;
        public DashboardRepository(ApplicationDbContext context) => _context = context;

        // Tổng sản lượng theo ngày (Dùng AsNoTracking để đọc cực nhanh)
        public IEnumerable<ProductionSummaryDto> GetProductionSummary(DateTime startDate, DateTime endDate)
        {
            // 1. Chuyển đổi DateTime sang DateOnly để "cùng hệ" với Database
            var startOnly = DateOnly.FromDateTime(startDate);
            var endOnly = DateOnly.FromDateTime(endDate);

            // 2. So sánh bằng startOnly và endOnly
            return _context.ProductionBatches
                .AsNoTracking()
                .Where(b => b.MfgDate >= startOnly && b.MfgDate <= endOnly)
                .GroupBy(b => b.MfgDate)
                .Select(g => new ProductionSummaryDto
                {
                    Date = g.Key.ToString(),
                    TotalPlanned = g.Sum(b => b.QuantityPlanned ?? 0),
                    TotalActual = g.Sum(b => b.QuantityActual ?? 0)
                })
                .OrderBy(x => x.Date)
                .ToList();
        }

        // Tổng số đơn hàng theo trạng thái
        public IEnumerable<OrderSummaryDto> GetOrderSummary()
        {
            return _context.InternalOrders
                .AsNoTracking()
                .GroupBy(o => o.OrderStatus)
                .Select(g => new OrderSummaryDto
                {
                    Status = g.Key,
                    TotalOrders = g.Count()
                })
                .ToList();
        }

        // Tổng tồn kho theo từng địa điểm
        public IEnumerable<InventorySummaryDto> GetInventorySummary(string locationType)
        {
            var query = _context.Inventories
                .Include(i => i.Product)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrEmpty(locationType))
            {
                query = query.Where(i => i.LocationType == locationType.ToUpper());
            }

            return query
                .Select(i => new InventorySummaryDto
                {
                    LocationType = i.LocationType,
                    LocationId = i.LocationId ?? 0,
                    ProductName = i.Product.ProductName,
                    TotalQuantity = i.CurrentQuantity ?? 0
                })
                .OrderBy(i => i.LocationType).ThenBy(i => i.LocationId)
                .ToList();
        }
    }
}