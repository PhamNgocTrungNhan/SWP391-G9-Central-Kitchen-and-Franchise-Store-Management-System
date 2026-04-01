using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class User
{
    public int UserId { get; set; }

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? FullName { get; set; }

    public int? RoleId { get; set; }

    public int? StoreId { get; set; }

    public int? KitchenId { get; set; }

    public virtual ICollection<InternalOrder> InternalOrders { get; set; } = new List<InternalOrder>();

    public virtual Kitchen? Kitchen { get; set; }

    public virtual Role? Role { get; set; }

    public virtual Store? Store { get; set; }
}
