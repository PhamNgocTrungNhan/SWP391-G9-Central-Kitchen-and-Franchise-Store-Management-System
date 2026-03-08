using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class OrganizationRepository
    {
        private readonly ApplicationDbContext _context;
        public OrganizationRepository(ApplicationDbContext context) => _context = context;

        // --- QUẢN LÝ STORE ---

        public List<Store> GetAllStores()
            => _context.Stores.Include(s => s.Users).ToList();

        public void AddStore(Store store)
        {
            _context.Stores.Add(store);
            _context.SaveChanges();
        }

        public void UpdateStore(Store store)
        {
            var existingStore = _context.Stores.Find(store.StoreId);
            if (existingStore != null)
            {
                existingStore.StoreName = store.StoreName;
                existingStore.Address = store.Address;
                existingStore.Phone = store.Phone;
                existingStore.IsActive = store.IsActive; 
                _context.SaveChanges();
            }
        }

        public void DeleteStore(int storeId)
        {
            var store = _context.Stores.Find(storeId);
            if (store != null)
            {
                store.IsActive = false;
                _context.SaveChanges();
            }
        }

        // --- QUẢN LÝ KITCHEN ---

        public List<Kitchen> GetAllKitchens()
            => _context.Kitchens.Include(k => k.Users).ToList();

        public void AddKitchen(Kitchen kitchen)
        {
            _context.Kitchens.Add(kitchen);
            _context.SaveChanges();
        }

        public void UpdateKitchen(Kitchen kitchen)
        {
            var existingKitchen = _context.Kitchens.Find(kitchen.KitchenId);
            if (existingKitchen != null)
            {
                existingKitchen.KitchenName = kitchen.KitchenName;
                existingKitchen.Address = kitchen.Address;
                _context.SaveChanges();
            }
        }
    }
}