using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        public AuthController(AuthService authService) => _authService = authService;

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            var token = _authService.Login(request);
            if (token == null)
                return Unauthorized(new
                {
                    message = "Sai tài khoản hoặc mật khẩu"
                });

            return Ok(new
            {
                token
            });
        }

        [HttpPost("logout")]
        [Authorize] 
        public IActionResult Logout()
        {
            return Ok(new
            {
                message = "Đăng xuất thành công. Vui lòng xóa Token ở LocalStorage/Cookie phía Client."
            });
        }
    }
}