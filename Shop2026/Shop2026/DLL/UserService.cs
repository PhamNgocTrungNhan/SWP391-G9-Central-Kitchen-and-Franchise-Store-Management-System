using Shop2026.DAL;
using Shop2026.Models;

namespace Shop2026.DLL
{
    public class UserService
    {
        private readonly UserRepository _repo;
        public UserService(UserRepository repo) => _repo = repo;

        public List<User> GetAllUsers() => _repo.GetAll();
        public void CreateUser(User user) => _repo.Add(user);
        public void DeleteUser(int userId) => _repo.Delete(userId);
        public void UpdateUser(User user) => _repo.Update(user);
    }
}