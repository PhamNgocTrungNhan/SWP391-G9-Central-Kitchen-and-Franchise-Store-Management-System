using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class RecipeService
    {
        private readonly RecipeRepository _repo;

        public RecipeService(RecipeRepository repo)
        {
            _repo = repo;
        }

        public IEnumerable<RecipesBom> GetByParentProductId(int parentProductId)
            => _repo.GetByParentProductId(parentProductId);

        public void Create(RecipeRequest request)
        {
            if (request.ParentProductId == request.MaterialId)
                throw new Exception("Thành phẩm và Nguyên liệu không được trùng nhau!");

            var recipe = new RecipesBom
            {
                ParentProductId = request.ParentProductId,
                MaterialId = request.MaterialId,
                QuantityRequired = request.QuantityRequired,
                WasteAllowancePercent = request.WasteAllowancePercent
            };
            _repo.Add(recipe);
        }

        public void Update(int id, RecipeRequest request)
        {
            var recipe = _repo.GetById(id) ?? throw new Exception("Không tìm thấy định mức nguyên liệu");

            recipe.ParentProductId = request.ParentProductId;
            recipe.MaterialId = request.MaterialId;
            recipe.QuantityRequired = request.QuantityRequired;
            recipe.WasteAllowancePercent = request.WasteAllowancePercent;

            _repo.Update(recipe);
        }

        public void Delete(int id)
        {
            var recipe = _repo.GetById(id) ?? throw new Exception("Không tìm thấy định mức nguyên liệu");
            _repo.Delete(recipe);
        }
    }
}