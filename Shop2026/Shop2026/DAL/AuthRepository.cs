using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class AuthRepository
    {
        private readonly ApplicationDbContext _context;
        public AuthRepository(ApplicationDbContext context) => _context = context;

        public User? GetUserWithRole(string username)
        {
            return _context.Users
                .Include(u => u.Role)
                .FirstOrDefault(u => u.Username == username);
        }
    }
}