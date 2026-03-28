using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class Kitchen
{
    public int KitchenId { get; set; }

    public string? KitchenName { get; set; }

    public string? Address { get; set; }

    public virtual ICollection<InternalOrder> InternalOrders { get; set; } = new List<InternalOrder>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
