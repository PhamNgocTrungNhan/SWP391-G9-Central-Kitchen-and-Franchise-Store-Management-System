using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class SupplierService
    {
        private readonly SupplierRepository _repo;
        public SupplierService(SupplierRepository repo) => _repo = repo;

        public IEnumerable<Supplier> GetAll() => _repo.GetAll();

        public void Create(SupplierRequest request)
        {
            _repo.Add(new Supplier
            {
                SupplierName = request.SupplierName,
                ContactInfo = request.ContactInfo,
                Address = request.Address,
                IsActive = request.IsActive
            });
        }

        public void Update(int id, SupplierRequest request)
        {
            var supplier = _repo.GetById(id) ?? throw new Exception("Không tìm thấy nhà cung cấp.");
            supplier.SupplierName = request.SupplierName;
            supplier.ContactInfo = request.ContactInfo;
            supplier.Address = request.Address;
            supplier.IsActive = request.IsActive; // Đổi thành false là tự động đưa vào Blacklist
            _repo.Update(supplier);
        }
    }
}