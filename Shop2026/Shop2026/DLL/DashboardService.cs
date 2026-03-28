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
            // Mặc định lấy báo cáo trong 30 ngày gần nhất
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
            // Có thể truyền "KITCHEN", "STORE", hoặc để null để lấy toàn bộ
            return _repo.GetInventorySummary(locationType);
        }
    }
}