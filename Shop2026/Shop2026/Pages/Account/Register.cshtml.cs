using Shop2026.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace KitchenCentralApp.Pages
{
    public class RegisterModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        public RegisterModel(ApplicationDbContext context) => _context = context;

        [BindProperty] public string FullName { get; set; }
        [BindProperty] public string Username { get; set; }
        [BindProperty] public string Password { get; set; }

        public string ErrorMessage { get; set; }

        public async Task<IActionResult> OnPostAsync()
        {
            if (await _context.Users.AnyAsync(u => u.Username == Username))
            {
                ErrorMessage = "This username have been choose, choose another name";
                return Page();
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "CUSTOMER");
            if (role == null)
            {
                role = new Role { RoleName = "CUSTOMER" };
                _context.Roles.Add(role);
                await _context.SaveChangesAsync();
            }

            var newUser = new User
            {
                FullName = FullName,
                Username = Username,
                PasswordHash = Password, 
                RoleId = role.RoleId
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return RedirectToPage("/Login");
        }
    }
}