using Microsoft.EntityFrameworkCore;
using Shop2026.Context;
using Shop2026.Models;

namespace Shop2026.DAL
{
    public class UserRepository
    {
        private readonly ApplicationDbContext _context;
        public UserRepository(ApplicationDbContext context) => _context = context;

        public List<User> GetAll() => _context.Users.Include(u => u.Role).ToList();
        public void Add(User user) { _context.Users.Add(user); _context.SaveChanges(); }
        public void Delete(int userId)
        {
            var user = _context.Users.Find(userId);
            if (user != null)
            {
                _context.Users.Remove(user);
                _context.SaveChanges();
            }
        }
        public void Update(User user)
        {
            var existingUser = _context.Users.Find(user.UserId);
            if (existingUser != null)
            {
                existingUser.FullName = user.FullName;
                existingUser.Username = user.Username;
                existingUser.PasswordHash = user.PasswordHash;
                existingUser.RoleId = user.RoleId;
                existingUser.StoreId = user.StoreId;
                existingUser.KitchenId = user.KitchenId;
                _context.SaveChanges();
            }
        }
    }
}