using Shop2026.DAL;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class OrganizationService
    {
        private readonly OrganizationRepository _repository;

        public OrganizationService(OrganizationRepository repository)
        {
            _repository = repository;
        }

        // ================= STORE =================
        public List<Store> GetAllStores()
        {
            return _repository.GetAllStores();
        }

        public void CreateStore(Store store)
        {
            if (string.IsNullOrWhiteSpace(store.StoreName))
                throw new ArgumentException("Tên cửa hàng không được để trống.");

            if (string.IsNullOrWhiteSpace(store.Address))
                throw new ArgumentException("Địa chỉ không được để trống.");

            store.IsActive = true;
            _repository.AddStore(store);
        }

        public void UpdateStore(Store store)
        {
            if (store.StoreId <= 0)
                throw new ArgumentException("ID cửa hàng không hợp lệ.");

            _repository.UpdateStore(store);
        }

        public void DeleteStore(int storeId)
        {
            if (storeId <= 0)
                throw new ArgumentException("ID cửa hàng không hợp lệ.");

            _repository.DeleteStore(storeId);
        }

        // ================= KITCHEN (CHỈ ĐỌC & CẬP NHẬT) =================
        public List<Kitchen> GetAllKitchens()
        {
            return _repository.GetAllKitchens();
        }

        public void UpdateKitchen(Kitchen kitchen)
        {
            if (kitchen.KitchenId <= 0)
                throw new ArgumentException("ID bếp không hợp lệ.");

            if (string.IsNullOrWhiteSpace(kitchen.KitchenName))
                throw new ArgumentException("Tên bếp trung tâm không được để trống.");

            _repository.UpdateKitchen(kitchen);
        }
    }
}