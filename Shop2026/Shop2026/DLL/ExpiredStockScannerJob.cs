using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Shop2026.DLL
{
    public class ExpiredStockScannerJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ExpiredStockScannerJob> _logger;

        public ExpiredStockScannerJob(IServiceProvider serviceProvider, ILogger<ExpiredStockScannerJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 [Hệ thống] Gã bảo vệ quét HSD đã thức dậy!");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var inventoryService = scope.ServiceProvider.GetRequiredService<InventoryService>();

                        _logger.LogInformation($"[{DateTime.Now}] Đang quét kho tìm hàng hết hạn...");
                        inventoryService.ScanAndRemoveExpiredStock();
                        _logger.LogInformation($"[{DateTime.Now}] Quét thành công!");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Có lỗi xảy ra trong lúc quét HSD!");
                }

                // Chạy mỗi ngày 1 lần. Đổi thành TimeSpan.FromSeconds(30) nếu muốn test ngay.
                try
                {
                    await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}