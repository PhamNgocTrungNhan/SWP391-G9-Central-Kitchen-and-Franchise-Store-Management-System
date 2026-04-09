using Shop2026.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Shop2026.DLL
{
    public interface IInventoryService
    {
        Task<List<InventoryItemDTO>> GetStoreInventoryAsync(int storeId);
        Task<bool> ProcessStoreOutboundAsync(int storeId, OutboundRequestDTO request);
    }
}