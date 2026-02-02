using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Shop2026.Data;
using Shop2026.Models;

namespace Shop2026.Pages.Account
{
    public class RegisterModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        public RegisterModel(ApplicationDbContext context) => _context = context;

        [BindProperty]
        public User NewUser { get; set; }

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid) return Page();

            var exists = _context.Users.Any(u => u.username == NewUser.username);
            if (exists)
            {
                ModelState.AddModelError("", "Already have this this email.");
                return Page();
            }

            NewUser.role_id = 1;
            NewUser.location_id = 1;

            _context.Users.Add(NewUser);
            await _context.SaveChangesAsync();

            return RedirectToPage("/Account/Login");
        }
    }
}