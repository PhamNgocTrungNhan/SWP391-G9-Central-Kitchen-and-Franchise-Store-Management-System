using System;
using System.Collections.Generic;

namespace Shop2026.Models;

public partial class Store
{
    public int StoreId { get; set; }

    public string? StoreName { get; set; }

    public string? Address { get; set; }

    public string? Phone { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<InternalOrder> InternalOrders { get; set; } = new List<InternalOrder>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
