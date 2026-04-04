using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Shop2026.Context;

namespace Shop2026.DAL
{
    /// <summary>
    /// Khi tạo thành phẩm trùng tên nhưng mã SP mới (#17) chưa có dòng Recipes_BOM,
    /// tìm thành phẩm/bán thành phẩm khác cùng tên (không phân biệt hoa thường) đã có BOM để dùng định mức.
    /// </summary>
    public static class BomFallbackHelper
    {
        public static int? FindDonorParentIdWithBom(ApplicationDbContext context, int productId)
        {
            var self = context.Products.AsNoTracking().FirstOrDefault(p => p.ProductId == productId);
            if (self?.ProductName == null)
                return null;

            var nameNorm = self.ProductName.Trim();
            if (nameNorm.Length == 0)
                return null;

            var donorCandidates = context.RecipesBoms.AsNoTracking()
                .Where(r => r.ParentProductId != null && r.ParentProductId != productId)
                .Select(r => r.ParentProductId!.Value)
                .Distinct()
                .OrderBy(pid => pid)
                .ToList();

            foreach (var donorPid in donorCandidates)
            {
                var p = context.Products.AsNoTracking().FirstOrDefault(x => x.ProductId == donorPid);
                if (p == null)
                    continue;

                var pt = p.ProductType ?? string.Empty;
                if (!string.Equals(pt, "FINISHED", StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(pt, "SEMI_FINISHED", StringComparison.OrdinalIgnoreCase))
                    continue;

                var otherName = p.ProductName?.Trim() ?? string.Empty;
                if (string.Equals(otherName, nameNorm, StringComparison.OrdinalIgnoreCase))
                    return donorPid;
            }

            return null;
        }
    }
}
