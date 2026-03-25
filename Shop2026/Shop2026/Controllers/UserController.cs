using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.Models;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN")]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;
        public UserController(UserService userService) => _userService = userService;

        [HttpGet]
        public IActionResult GetAll() => Ok(_userService.GetAllUsers());

        [HttpPost]
        public IActionResult Create([FromBody] User user)
        {
            _userService.CreateUser(user);
            return Ok(new { message = "Tạo User thành công" });
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] User user)
        {
            user.UserId = id; 
            _userService.UpdateUser(user);
            return Ok(new { message = "Cập nhật User thành công" });
        }

        [HttpDelete("{userId}")]
        public IActionResult Delete(int userId)
        {
            _userService.DeleteUser(userId);
            return Ok(new { message = "Xóa User thành công" });
        }
    }
}