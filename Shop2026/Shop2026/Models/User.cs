using System.ComponentModel.DataAnnotations;

namespace Shop2026.Models
{
    public class User
    {
        [Key]
        public int user_id { get; set; }
        public string username { get; set; }
        public string password_hash { get; set; }
        public string full_name { get; set; }
        public int role_id { get; set; }
        public int location_id { get; set; }
    }
}