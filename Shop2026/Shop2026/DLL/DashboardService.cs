using Shop2026.DAL;
using Shop2026.DTOs;

namespace Shop2026.DLL
{
    public class DashboardService
    {
        private readonly DashboardRepository _repo;
        public DashboardService(DashboardRepository repo) => _repo = repo;

        public IEnumerable<ProductionSummaryDto> GetProductionSummary(int days = 30)
        {
            var endDate = DateTime.Now;
            var startDate = endDate.AddDays(-days);
            return _repo.GetProductionSummary(startDate, endDate);
        }

        public IEnumerable<OrderSummaryDto> GetOrderSummary()
        {
            return _repo.GetOrderSummary();
        }

        public IEnumerable<InventorySummaryDto> GetInventorySummary(string locationType = null)
        {
            return _repo.GetInventorySummary(locationType);
        }
    }
}