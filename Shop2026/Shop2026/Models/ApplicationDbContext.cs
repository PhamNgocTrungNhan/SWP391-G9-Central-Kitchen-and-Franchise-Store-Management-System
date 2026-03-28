using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Shop2026.Models;

public partial class ApplicationDbContext : DbContext
{
    public ApplicationDbContext()
    {
    }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

<<<<<<< Updated upstream:Shop2026/Shop2026/Models/ApplicationDbContext.cs
    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<InternalOrder> InternalOrders { get; set; }

    public virtual DbSet<Inventory> Inventories { get; set; }

    public virtual DbSet<OrderDetail> OrderDetails { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ProductionBatch> ProductionBatches { get; set; }

    public virtual DbSet<RecipesBom> RecipesBoms { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<SalesOrder> SalesOrders { get; set; }

    public virtual DbSet<StockLog> StockLogs { get; set; }

    public virtual DbSet<User> Users { get; set; }
=======
    public virtual DbSet<Category> Categories
    {
        get; set;
    }
    public virtual DbSet<InternalOrder> InternalOrders
    {
        get; set;
    }
    public virtual DbSet<InternalOrderDetail> InternalOrderDetails
    {
        get; set;
    }
    public virtual DbSet<Inventory> Inventories
    {
        get; set;
    }
    public virtual DbSet<Kitchen> Kitchens
    {
        get; set;
    }
    public virtual DbSet<Product> Products
    {
        get; set;
    }
    public virtual DbSet<ProductionBatch> ProductionBatches
    {
        get; set;
    }
    public virtual DbSet<ProductionBatchOrder> ProductionBatchOrders
    {
        get; set;
    }
    public virtual DbSet<RecipesBom> RecipesBoms
    {
        get; set;
    }
    public virtual DbSet<Role> Roles
    {
        get; set;
    }
    public virtual DbSet<StockLog> StockLogs
    {
        get; set;
    }
    public virtual DbSet<Store> Stores
    {
        get; set;
    }
    public virtual DbSet<User> Users
    {
        get; set;
    }
    public virtual DbSet<Supplier> Suppliers
    {
        get; set;
    }
>>>>>>> Stashed changes:Shop2026/Shop2026/Context/ApplicationDbContext.cs

    // ✅ THÊM DBSET TRANSACTIONS
    public virtual DbSet<Transaction> Transactions
    {
        get; set;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=localhost;Database=Kitchen2026;Trusted_Connection=True;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("PK__Categori__D54EE9B48C375F36");

            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.CustomerId).HasName("PK__Customer__CD65CB85AF59155E");

            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.ContactPerson)
                .HasMaxLength(100)
                .HasColumnName("contact_person");
            entity.Property(e => e.CustomerName)
                .HasMaxLength(255)
                .HasColumnName("customer_name");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
        });

        modelBuilder.Entity<InternalOrder>(entity =>
        {
            entity.HasKey(e => e.OrderId).HasName("PK__Internal__46596229670305D7");

            entity.ToTable("Internal_Orders");

            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.FeedbackRating).HasColumnName("feedback_rating");
            entity.Property(e => e.InternalRevenue)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("internal_revenue");
            entity.Property(e => e.KitchenId)
                .HasDefaultValue(1)
                .HasColumnName("kitchen_id");
            entity.Property(e => e.OrderStatus)
                .HasMaxLength(50)
                .HasDefaultValue("CREATED")
                .HasColumnName("order_status");

            // ✅ ĐÃ CHÈN MAP CỘT PAYMENT_STATUS VÀO ĐÚNG CHỖ
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(50)
                .HasDefaultValue("UNPAID")
                .HasColumnName("payment_status");

            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason");
            entity.Property(e => e.StoreFeedback).HasColumnName("store_feedback");
            entity.Property(e => e.StoreId).HasColumnName("store_id");
            entity.Property(e => e.TotalCost)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("total_cost");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
<<<<<<< Updated upstream:Shop2026/Shop2026/Models/ApplicationDbContext.cs
=======

            // =====================================
            // MAP 3 CỘT CHO LUỒNG 4
            // =====================================
            entity.Property(e => e.ReturnReason).HasColumnName("return_reason");
            entity.Property(e => e.Rating).HasColumnName("rating");
            entity.Property(e => e.FeedbackComment).HasColumnName("feedback_comment");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.InternalOrders)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("FK__Internal___appro__5812160E");

            entity.HasOne(d => d.Kitchen).WithMany(p => p.InternalOrders)
                .HasForeignKey(d => d.KitchenId)
                .HasConstraintName("FK__Internal___kitch__571DF1D5");

            entity.HasOne(d => d.Store).WithMany(p => p.InternalOrders)
                .HasForeignKey(d => d.StoreId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Internal___store__5629CD9C");
        });

        modelBuilder.Entity<InternalOrderDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__Internal__38E9A224BCBB8B27");

            entity.ToTable("Internal_Order_Details");

            entity.Property(e => e.DetailId).HasColumnName("detail_id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.QuantityConfirmed)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("quantity_confirmed");
            entity.Property(e => e.QuantityOrdered)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("quantity_ordered");
            entity.Property(e => e.QuantityShipped)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("quantity_shipped");

            entity.HasOne(d => d.Order).WithMany(p => p.InternalOrderDetails)
                .HasForeignKey(d => d.OrderId)
                .HasConstraintName("FK__Internal___order__5BE2A6F2");

            entity.HasOne(d => d.Product).WithMany(p => p.InternalOrderDetails)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK__Internal___produ__5CD6CB2B");
>>>>>>> Stashed changes:Shop2026/Shop2026/Context/ApplicationDbContext.cs
        });

        modelBuilder.Entity<Inventory>(entity =>
        {
            entity.HasKey(e => e.InventoryId).HasName("PK__Inventor__B59ACC49DB86DB2D");

            entity.ToTable("Inventory");

            entity.HasIndex(e => e.ProductId, "UQ__Inventor__47027DF47322E36E").IsUnique();

            entity.Property(e => e.InventoryId).HasColumnName("inventory_id");
            entity.Property(e => e.CurrentQty)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("current_qty");
            entity.Property(e => e.LastUpdated)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("last_updated");
            entity.Property(e => e.MinAlertQty)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("min_alert_qty");
            entity.Property(e => e.ProductId).HasColumnName("product_id");

            entity.HasOne(d => d.Product).WithOne(p => p.Inventory)
                .HasForeignKey<Inventory>(d => d.ProductId)
                .HasConstraintName("FK__Inventory__produ__619B8048");
        });

        modelBuilder.Entity<OrderDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__Order_De__38E9A224C7473188");

            entity.ToTable("Order_Details");

            entity.Property(e => e.DetailId).HasColumnName("detail_id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.QtyDelivered)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("qty_delivered");
            entity.Property(e => e.QtyOrdered)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("qty_ordered");
            entity.Property(e => e.UnitPrice)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("unit_price");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderDetails)
                .HasForeignKey(d => d.OrderId)
                .HasConstraintName("FK__Order_Det__order__5535A963");

            entity.HasOne(d => d.Product).WithMany(p => p.OrderDetails)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK__Order_Det__produ__5629CD9C");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.ProductId).HasName("PK__Products__47027DF59BBE8F12");

            entity.HasIndex(e => e.Sku, "UQ__Products__DDDF4BE7F16F3A9E").IsUnique();

            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.BaseUnit)
                .HasMaxLength(20)
                .HasColumnName("base_unit");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.ProductType)
                .HasMaxLength(50)
                .HasColumnName("product_type");
            entity.Property(e => e.Sku)
                .HasMaxLength(50)
                .HasColumnName("sku");

            // ✅ ĐÃ CHÈN MAP 2 CỘT GIÁ TIỀN VÀO ĐÚNG CHỖ
            entity.Property(e => e.PurchasePrice)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("purchase_price")
                .HasDefaultValue(0m);

            entity.Property(e => e.InternalPrice)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("internal_price")
                .HasDefaultValue(0m);

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK__Products__catego__48CFD27E");
        });

        modelBuilder.Entity<ProductionBatch>(entity =>
        {
            entity.HasKey(e => e.BatchId).HasName("PK__Producti__DBFC0431242736DB");

            entity.ToTable("Production_Batches");

            entity.HasIndex(e => e.BatchCode, "UQ__Producti__E027E99948EB08E0").IsUnique();

            entity.Property(e => e.BatchId).HasColumnName("batch_id");
            entity.Property(e => e.BatchCode)
                .HasMaxLength(50)
                .HasColumnName("batch_code");
            entity.Property(e => e.BatchStatus)
                .HasMaxLength(50)
                .HasColumnName("batch_status");
            entity.Property(e => e.ExpDate).HasColumnName("exp_date");
            entity.Property(e => e.MfgDate).HasColumnName("mfg_date");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.QuantityActual)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("quantity_actual");
            entity.Property(e => e.QuantityPlanned)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("quantity_planned");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductionBatches)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK__Productio__produ__5AEE82B9");
        });

        modelBuilder.Entity<RecipesBom>(entity =>
        {
            entity.HasKey(e => e.RecipeId).HasName("PK__Recipes___3571ED9B90B8A406");

            entity.ToTable("Recipes_BOM");

            entity.Property(e => e.RecipeId).HasColumnName("recipe_id");
            entity.Property(e => e.MaterialId).HasColumnName("material_id");
            entity.Property(e => e.ParentProductId).HasColumnName("parent_product_id");
            entity.Property(e => e.QuantityRequired)
                .HasColumnType("decimal(12, 4)")
                .HasColumnName("quantity_required");
            entity.Property(e => e.WasteAllowancePercent)
                .HasDefaultValue(0m)
                .HasColumnType("decimal(5, 2)")
                .HasColumnName("waste_allowance_percent");

            entity.HasOne(d => d.Material).WithMany(p => p.RecipesBomMaterials)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__Recipes_B__mater__4D94879B");

            entity.HasOne(d => d.ParentProduct).WithMany(p => p.RecipesBomParentProducts)
                .HasForeignKey(d => d.ParentProductId)
                .HasConstraintName("FK__Recipes_B__paren__4CA06362");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__760965CCE28A9BC6");

            entity.HasIndex(e => e.RoleName, "UQ__Roles__783254B159EE382A").IsUnique();

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasColumnName("role_name");
        });

        modelBuilder.Entity<SalesOrder>(entity =>
        {
            entity.HasKey(e => e.OrderId).HasName("PK__Sales_Or__465962296ED26355");

            entity.ToTable("Sales_Orders");

            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.OrderDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("order_date");
            entity.Property(e => e.OrderStatus)
                .HasMaxLength(50)
                .HasColumnName("order_status");
            entity.Property(e => e.TotalAmount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("total_amount");

            entity.HasOne(d => d.Customer).WithMany(p => p.SalesOrders)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("FK__Sales_Ord__custo__52593CB8");
        });

        modelBuilder.Entity<StockLog>(entity =>
        {
            entity.HasKey(e => e.LogId).HasName("PK__Stock_Lo__9E2397E06DAACA9B");

            entity.ToTable("Stock_Logs");

            entity.Property(e => e.LogId).HasColumnName("log_id");
            entity.Property(e => e.ChangeQty)
                .HasColumnType("decimal(12, 2)")
                .HasColumnName("change_qty");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Reason)
                .HasMaxLength(50)
                .HasColumnName("reason");
            entity.Property(e => e.ReferenceId).HasColumnName("reference_id");
<<<<<<< Updated upstream:Shop2026/Shop2026/Models/ApplicationDbContext.cs

            entity.HasOne(d => d.Product).WithMany(p => p.StockLogs)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK__Stock_Log__produ__66603565");
=======
            entity.Property(e => e.ReferenceType)
                .HasMaxLength(20)
                .HasColumnName("reference_type");

            entity.Property(e => e.SupplierId).HasColumnName("supplier_id");

            entity.HasOne(d => d.Product).WithMany(p => p.StockLogs)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK__Stock_Log__produ__70DDC3D8");

            entity.HasOne(d => d.Supplier)
                .WithMany()
                .HasForeignKey(d => d.SupplierId)
                .HasConstraintName("FK_Stock_Logs_Suppliers");
        });

        modelBuilder.Entity<Store>(entity =>
        {
            entity.HasKey(e => e.StoreId).HasName("PK__Stores__A2F2A30C03A97305");

            entity.Property(e => e.StoreId).HasColumnName("store_id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.StoreName)
                .HasMaxLength(255)
                .HasColumnName("store_name");
>>>>>>> Stashed changes:Shop2026/Shop2026/Context/ApplicationDbContext.cs
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__B9BE370FE0861C15");

            entity.HasIndex(e => e.Username, "UQ__Users__F3DBC5720F5546E3").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.FullName)
                .HasMaxLength(255)
                .HasColumnName("full_name");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.Username)
                .HasMaxLength(100)
                .HasColumnName("username");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
<<<<<<< Updated upstream:Shop2026/Shop2026/Models/ApplicationDbContext.cs
                .HasConstraintName("FK__Users__role_id__3B75D760");
=======
                .HasConstraintName("FK__Users__role_id__403A8C7D");

            entity.HasOne(d => d.Store).WithMany(p => p.Users)
                .HasForeignKey(d => d.StoreId)
                .HasConstraintName("FK__Users__store_id__412EB0B6");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.SupplierId).HasName("PK_Suppliers");

            entity.ToTable("Suppliers");

            entity.Property(e => e.SupplierId).HasColumnName("supplier_id");
            entity.Property(e => e.SupplierName)
                .HasMaxLength(255)
                .IsRequired()
                .HasColumnName("supplier_name");
            entity.Property(e => e.ContactInfo).HasColumnName("contact_info");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
>>>>>>> Stashed changes:Shop2026/Shop2026/Context/ApplicationDbContext.cs
        });

        // ✅ MAP CẤU HÌNH BẢNG TRANSACTIONS (LƯU GIAO DỊCH TIỀN)
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.TransactionId).HasName("PK_Transactions");
            entity.ToTable("Transactions");

            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.InternalOrderId).HasColumnName("internal_order_id");
            entity.Property(e => e.PurchaseOrderId).HasColumnName("purchase_order_id");

            entity.Property(e => e.TransactionType)
                .HasMaxLength(20)
                .HasColumnName("transaction_type");

            entity.Property(e => e.Amount)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("amount");

            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(50)
                .HasDefaultValue("Bank Transfer")
                .HasColumnName("payment_method");

            entity.Property(e => e.TransactionDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("transaction_date");

            entity.Property(e => e.Note).HasColumnName("note");

            entity.HasOne(d => d.InternalOrder)
                .WithMany()
                .HasForeignKey(d => d.InternalOrderId)
                .HasConstraintName("FK_Transactions_InternalOrders");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
