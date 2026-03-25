using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class CategoryService
    {
        private readonly CategoryRepository _repo;
        public CategoryService(CategoryRepository repo) => _repo = repo;

        public IEnumerable<Category> GetAll() => _repo.GetAll();

        public void Create(CategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new Exception("Tên danh mục không được để trống");
            var category = new Category { Name = request.Name };
            _repo.Add(category);
        }

        public void Update(int id, CategoryRequest request)
        {
            var category = _repo.GetById(id) ?? throw new Exception("Không tìm thấy danh mục");
            category.Name = request.Name;
            _repo.Update(category);
        }

        public void Delete(int id)
        {
            var category = _repo.GetById(id) ?? throw new Exception("Không tìm thấy danh mục");
            _repo.Delete(category);
        }
    }
}