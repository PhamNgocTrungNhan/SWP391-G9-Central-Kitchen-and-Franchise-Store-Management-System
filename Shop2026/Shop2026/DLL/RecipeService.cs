using System.Collections.Generic;
using System.Linq;
using Shop2026.DAL;
using Shop2026.DTOs;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class RecipeService
    {
        private readonly RecipeRepository _repo;
        public RecipeService(RecipeRepository repo) => _repo = repo;

        public IEnumerable<RecipeResponse> GetByParentProductId(int parentProductId)
        {
            var data = _repo.GetByParentProductId(parentProductId);
            return data.Select(r => new RecipeResponse
            {
                RecipeId = r.RecipeId,
                ParentProductId = r.ParentProductId,
                ParentProductName = r.ParentProduct?.ProductName,
                MaterialId = r.MaterialId,
                MaterialName = r.Material?.ProductName,
                MaterialUnit = r.Material?.BaseUnit,
                QuantityRequired = r.QuantityRequired,
                MaxWastePercent = r.MaxWastePercent // ✅ Trả về cho FE hiển thị
            }).ToList();
        }

        public void CreateBulk(CreateRecipeBulkRequest request)
        {
            if (!_repo.ProductExists(request.ParentProductId))
                throw new Exception("Thành phẩm không tồn tại trong hệ thống.");

            var duplicateInRequest = request.Materials.GroupBy(x => x.MaterialId).Where(g => g.Count() > 1).Select(y => y.Key).ToList();
            if (duplicateInRequest.Any())
                throw new Exception($"Danh sách gửi lên có nguyên liệu bị trùng lặp (Mã ID: {string.Join(", ", duplicateInRequest)}).");

            var newRecipes = new List<RecipesBom>();

            foreach (var item in request.Materials)
            {
                if (request.ParentProductId == item.MaterialId)
                    throw new Exception($"Thành phẩm không thể tự làm nguyên liệu cho chính nó (Mã ID: {item.MaterialId}).");

                if (!_repo.ProductExists(item.MaterialId))
                    throw new Exception($"Nguyên liệu có ID {item.MaterialId} không tồn tại trong hệ thống.");

                if (_repo.ExistsInRecipe(request.ParentProductId, item.MaterialId))
                    throw new Exception($"Nguyên liệu ID {item.MaterialId} đã tồn tại trong công thức của thành phẩm này rồi.");

                newRecipes.Add(new RecipesBom
                {
                    ParentProductId = request.ParentProductId,
                    MaterialId = item.MaterialId,
                    QuantityRequired = item.QuantityRequired,
                    MaxWastePercent = item.MaxWastePercent // ✅ LƯU HAO HỤT TỐI ĐA CHO CÔNG THỨC NÀY
                });
            }

            _repo.AddRange(newRecipes);
        }

        /// <summary>Sao chép toàn bộ BOM từ thành phẩm nguồn sang thành phẩm đích (đích chưa có dòng trùng nguyên liệu).</summary>
        public void CloneBom(int sourceParentProductId, int targetParentProductId)
        {
            if (sourceParentProductId == targetParentProductId)
                throw new Exception("Sản phẩm nguồn và đích phải khác nhau.");

            var sourceLines = _repo.GetByParentProductId(sourceParentProductId).ToList();
            if (!sourceLines.Any())
                throw new Exception("Sản phẩm nguồn chưa có định mức (BOM) để sao chép.");

            var materials = new List<RecipeDetailItem>();
            foreach (var l in sourceLines)
            {
                if (l.MaterialId == null || l.MaterialId < 1)
                    continue;
                materials.Add(new RecipeDetailItem
                {
                    MaterialId = l.MaterialId.Value,
                    QuantityRequired = l.QuantityRequired,
                    MaxWastePercent = l.MaxWastePercent ?? 0
                });
            }

            if (!materials.Any())
                throw new Exception("Không có dòng nguyên liệu hợp lệ trên công thức nguồn.");

            CreateBulk(new CreateRecipeBulkRequest
            {
                ParentProductId = targetParentProductId,
                Materials = materials
            });
        }

        public void Update(int id, UpdateRecipeRequest request)
        {
            var recipe = _repo.GetById(id) ?? throw new Exception("Không tìm thấy dòng định mức này trong hệ thống.");

            if (recipe.ParentProductId == request.MaterialId)
                throw new Exception("Thành phẩm và Nguyên liệu không được trùng nhau!");

            if (recipe.MaterialId != request.MaterialId && _repo.ExistsInRecipe(recipe.ParentProductId.Value, request.MaterialId))
                throw new Exception("Nguyên liệu này đã bị trùng lặp trong công thức.");

            recipe.MaterialId = request.MaterialId;
            recipe.QuantityRequired = request.QuantityRequired;
            recipe.MaxWastePercent = request.MaxWastePercent; // ✅ CẬP NHẬT HAO HỤT

            _repo.Update(recipe);
        }

        public void Delete(int id)
        {
            var recipe = _repo.GetById(id) ?? throw new Exception("Không tìm thấy dòng định mức nguyên liệu");
            _repo.Delete(recipe);
        }
    }
}