using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Shop2026.DAL;
using Shop2026.DTOs;

namespace Shop2026.DLL
{
    public class AuthService
    {
        private readonly AuthRepository _repo;
        private readonly IConfiguration _config;

        public AuthService(AuthRepository repo, IConfiguration config)
        {
            _repo = repo;
            _config = config;
        }

        /// <summary>Token JWT và role đã chuẩn hóa (uppercase) để khớp [Authorize(Roles = "...")].</summary>
        public (string Token, string Role)? Login(LoginRequest request)
        {
            var user = _repo.GetUserWithRole(request.Username);

            if (user == null || user.PasswordHash != request.Password)
                return null;

            if (user.Role == null || string.IsNullOrWhiteSpace(user.Role.RoleName))
                return null;

            // Khớp [Authorize(Roles = "MANAGER")] (so khớp role phân biệt hoa thường)
            var roleClaim = user.Role.RoleName.Trim().ToUpperInvariant();

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, roleClaim),
                // Một số pipeline JWT chỉ giữ claim tên ngắn — thêm explicit để chắc chắn
                new Claim("role", roleClaim),
                new Claim("UserId", user.UserId.ToString())
            };

            if (user.StoreId.HasValue) claims.Add(new Claim("StoreId", user.StoreId.Value.ToString()));
            if (user.KitchenId.HasValue) claims.Add(new Claim("KitchenId", user.KitchenId.Value.ToString()));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(8),
                signingCredentials: creds
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            return (jwt, roleClaim);
        }
    }
}