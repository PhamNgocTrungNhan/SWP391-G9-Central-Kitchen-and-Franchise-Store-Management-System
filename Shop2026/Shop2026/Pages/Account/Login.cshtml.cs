using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Shop2026.Data;

namespace Shop2026.Pages.Account
{
    public class LoginModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        public LoginModel(ApplicationDbContext context) => _context = context;

        [BindProperty] public string Username { get; set; }
        [BindProperty] public string Password { get; set; }

        public async Task<IActionResult> OnPostAsync()
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.username == Username && u.password_hash == Password);

            if (user != null)
            {
                var claims = new List<Claim> {
                    new Claim(ClaimTypes.Name, user.username),
                    new Claim("FullName", user.full_name)
                };
                var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
                return RedirectToPage("/Index"); 
            }
            ModelState.AddModelError("", "  Wrong username or password.");
            return Page();
        }
    }
}