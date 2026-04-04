/* =============================================================================
   KITCHEN2026 — SCRIPT ĐẦY ĐỦ (DDL + SEED MỘT LẦN)
   Khớp EF Core Shop2026: Recipes_BOM.max_waste_percent, Production_Batch_Materials, ...
   Đã sửa: bỏ trùng INSERT; cột BOM đúng tên; thêm role CUSTOMER (đăng ký).
   Cảnh báo: bật khối DROP bên dưới sẽ XÓA toàn bộ database Kitchen2026.
   ============================================================================= */

USE master;
GO

/* Bỏ comment 4 dòng sau nếu muốn tạo lại DB từ đầu
IF DB_ID(N'Kitchen2026') IS NOT NULL
BEGIN
    ALTER DATABASE Kitchen2026 SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE Kitchen2026;
END
GO
*/

IF DB_ID(N'Kitchen2026') IS NULL
    CREATE DATABASE Kitchen2026;
GO

USE Kitchen2026;
GO

/* =========================  DDL ========================= */

IF OBJECT_ID(N'dbo.Transactions', N'U') IS NOT NULL DROP TABLE dbo.Transactions;
IF OBJECT_ID(N'dbo.Stock_Logs', N'U') IS NOT NULL DROP TABLE dbo.Stock_Logs;
IF OBJECT_ID(N'dbo.Production_Batch_Orders', N'U') IS NOT NULL DROP TABLE dbo.Production_Batch_Orders;
IF OBJECT_ID(N'dbo.Production_Batch_Materials', N'U') IS NOT NULL DROP TABLE dbo.Production_Batch_Materials;
IF OBJECT_ID(N'dbo.Inventory', N'U') IS NOT NULL DROP TABLE dbo.Inventory;
IF OBJECT_ID(N'dbo.Production_Batches', N'U') IS NOT NULL DROP TABLE dbo.Production_Batches;
IF OBJECT_ID(N'dbo.Internal_Order_Details', N'U') IS NOT NULL DROP TABLE dbo.Internal_Order_Details;
IF OBJECT_ID(N'dbo.Internal_Orders', N'U') IS NOT NULL DROP TABLE dbo.Internal_Orders;
IF OBJECT_ID(N'dbo.Purchase_Order_Details', N'U') IS NOT NULL DROP TABLE dbo.Purchase_Order_Details;
IF OBJECT_ID(N'dbo.Purchase_Orders', N'U') IS NOT NULL DROP TABLE dbo.Purchase_Orders;
IF OBJECT_ID(N'dbo.Recipes_BOM', N'U') IS NOT NULL DROP TABLE dbo.Recipes_BOM;
IF OBJECT_ID(N'dbo.Products', N'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID(N'dbo.Categories', N'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID(N'dbo.Suppliers', N'U') IS NOT NULL DROP TABLE dbo.Suppliers;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID(N'dbo.Stores', N'U') IS NOT NULL DROP TABLE dbo.Stores;
IF OBJECT_ID(N'dbo.Kitchens', N'U') IS NOT NULL DROP TABLE dbo.Kitchens;
IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

CREATE TABLE Roles (
    role_id INT PRIMARY KEY IDENTITY(1,1),
    role_name NVARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Kitchens (
    kitchen_id INT PRIMARY KEY IDENTITY(1,1),
    kitchen_name NVARCHAR(255),
    address NVARCHAR(MAX)
);

CREATE TABLE Stores (
    store_id INT PRIMARY KEY IDENTITY(1,1),
    store_name NVARCHAR(255),
    address NVARCHAR(MAX),
    phone NVARCHAR(20),
    is_active BIT DEFAULT 1
);

CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(255),
    role_id INT,
    store_id INT NULL,
    kitchen_id INT NULL,
    FOREIGN KEY (role_id) REFERENCES Roles(role_id),
    FOREIGN KEY (store_id) REFERENCES Stores(store_id),
    FOREIGN KEY (kitchen_id) REFERENCES Kitchens(kitchen_id)
);

CREATE TABLE Categories (
    category_id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100) NOT NULL
);

CREATE TABLE Products (
    product_id INT PRIMARY KEY IDENTITY(1,1),
    sku NVARCHAR(50) UNIQUE NOT NULL,
    product_name NVARCHAR(255) NOT NULL,
    category_id INT,
    base_unit NVARCHAR(20),
    product_type NVARCHAR(50) CHECK (product_type IN ('RAW', 'SEMI_FINISHED', 'FINISHED')),
    purchase_price DECIMAL(18,2) DEFAULT 0,
    internal_price DECIMAL(18,2) DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);

CREATE TABLE Recipes_BOM (
    recipe_id INT PRIMARY KEY IDENTITY(1,1),
    parent_product_id INT,
    material_id INT,
    quantity_required DECIMAL(12,4) NOT NULL,
    max_waste_percent DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (parent_product_id) REFERENCES Products(product_id),
    FOREIGN KEY (material_id) REFERENCES Products(product_id)
);

CREATE TABLE Suppliers (
    supplier_id INT PRIMARY KEY IDENTITY(1,1),
    supplier_name NVARCHAR(255) NOT NULL,
    contact_info NVARCHAR(MAX),
    address NVARCHAR(MAX),
    is_active BIT DEFAULT 1
);

CREATE TABLE Purchase_Orders (
    po_id INT PRIMARY KEY IDENTITY(1,1),
    supplier_id INT,
    kitchen_id INT,
    total_amount DECIMAL(18,2) DEFAULT 0,
    po_status NVARCHAR(50) CHECK (po_status IN ('PENDING', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
    payment_status NVARCHAR(50) CHECK (payment_status IN ('UNPAID', 'PAID')) DEFAULT 'UNPAID',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id),
    FOREIGN KEY (kitchen_id) REFERENCES Kitchens(kitchen_id)
);

CREATE TABLE Purchase_Order_Details (
    po_detail_id INT PRIMARY KEY IDENTITY(1,1),
    po_id INT,
    product_id INT,
    quantity DECIMAL(12,2),
    unit_price DECIMAL(18,2),
    FOREIGN KEY (po_id) REFERENCES Purchase_Orders(po_id),
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

CREATE TABLE Internal_Orders (
    order_id INT PRIMARY KEY IDENTITY(1,1),
    order_code AS ('ORD' + CONVERT(VARCHAR(10), order_id)),
    store_id INT NOT NULL,
    kitchen_id INT DEFAULT 1,
    order_status NVARCHAR(50) CHECK (order_status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'PRODUCED', 'SHIPPING', 'COMPLETED', 'RETURNED', 'CANCELLED'
    )) DEFAULT 'PENDING',
    expected_delivery_date DATETIME,
    approved_by INT,
    approved_at DATETIME,
    total_amount DECIMAL(18,2) DEFAULT 0,
    payment_status NVARCHAR(50) CHECK (payment_status IN ('UNPAID', 'PAID')) DEFAULT 'UNPAID',
    rejection_reason NVARCHAR(MAX),
    return_reason NVARCHAR(MAX),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback_comment NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (store_id) REFERENCES Stores(store_id),
    FOREIGN KEY (kitchen_id) REFERENCES Kitchens(kitchen_id),
    FOREIGN KEY (approved_by) REFERENCES Users(user_id)
);

CREATE TABLE Internal_Order_Details (
    detail_id INT PRIMARY KEY IDENTITY(1,1),
    order_id INT,
    product_id INT,
    quantity_ordered DECIMAL(12,2),
    quantity_confirmed DECIMAL(12,2),
    quantity_shipped DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES Internal_Orders(order_id),
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

CREATE TABLE Production_Batches (
    batch_id INT PRIMARY KEY IDENTITY(1,1),
    product_id INT,
    batch_code NVARCHAR(50) UNIQUE,
    quantity_planned DECIMAL(12,2),
    quantity_actual DECIMAL(12,2),
    mfg_date DATE,
    exp_date DATE,
    status NVARCHAR(50) DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED')),
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

CREATE TABLE Production_Batch_Materials (
    batch_material_id INT PRIMARY KEY IDENTITY(1,1),
    batch_id INT,
    material_id INT,
    actual_used DECIMAL(12,4),
    actual_wasted DECIMAL(12,4),
    FOREIGN KEY (batch_id) REFERENCES Production_Batches(batch_id),
    FOREIGN KEY (material_id) REFERENCES Products(product_id)
);

CREATE TABLE Inventory (
    inventory_id INT PRIMARY KEY IDENTITY(1,1),
    product_id INT,
    location_type NVARCHAR(20) CHECK (location_type IN ('KITCHEN', 'STORE')),
    location_id INT,
    current_quantity DECIMAL(12,2) DEFAULT 0,
    last_updated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    CONSTRAINT UQ_Inventory UNIQUE (product_id, location_type, location_id)
);

CREATE TABLE Production_Batch_Orders (
    batch_id INT,
    order_id INT,
    allocated_quantity DECIMAL(12,2),
    PRIMARY KEY (batch_id, order_id),
    FOREIGN KEY (batch_id) REFERENCES Production_Batches(batch_id),
    FOREIGN KEY (order_id) REFERENCES Internal_Orders(order_id)
);

CREATE TABLE Stock_Logs (
    log_id BIGINT PRIMARY KEY IDENTITY(1,1),
    product_id INT,
    location_type NVARCHAR(20),
    location_id INT,
    change_quantity DECIMAL(12,2),
    reason NVARCHAR(50),
    reference_id INT,
    reference_type NVARCHAR(20),
    supplier_id INT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id)
);

CREATE TABLE Transactions (
    transaction_id INT PRIMARY KEY IDENTITY(1,1),
    internal_order_id INT NULL,
    purchase_order_id INT NULL,
    transaction_type NVARCHAR(20) CHECK (transaction_type IN ('REVENUE', 'EXPENSE')),
    amount DECIMAL(18,2) NOT NULL,
    payment_method NVARCHAR(50) DEFAULT N'Bank Transfer',
    transaction_date DATETIME DEFAULT GETDATE(),
    note NVARCHAR(MAX),
    FOREIGN KEY (internal_order_id) REFERENCES Internal_Orders(order_id),
    FOREIGN KEY (purchase_order_id) REFERENCES Purchase_Orders(po_id)
);
GO

/* =========================  SEED (một lần, không trùng) ========================= */

INSERT INTO Roles (role_name) VALUES
(N'ADMIN'),
(N'MANAGER'),
(N'SUPPLY_COORDINATOR'),
(N'KITCHEN_STAFF'),
(N'STORE_STAFF'),
(N'CUSTOMER');

INSERT INTO Kitchens (kitchen_name, address)
VALUES (N'Bếp Trung Tâm Kitchen2026', N'Quận 1, TP.HCM');

INSERT INTO Stores (store_name, address, phone, is_active)
VALUES (N'Cửa hàng Chi nhánh 01', N'Quận 3, TP.HCM', N'0901234567', 1);

DECLARE @KitchenID INT = (SELECT TOP 1 kitchen_id FROM Kitchens ORDER BY kitchen_id);
DECLARE @StoreID INT = (SELECT TOP 1 store_id FROM Stores ORDER BY store_id);

INSERT INTO Users (username, password_hash, full_name, role_id, store_id, kitchen_id)
VALUES
(N'admin_user', N'admin', N'Ly Hai Duong',
    (SELECT role_id FROM Roles WHERE role_name = N'ADMIN'), NULL, NULL),
(N'manager_user', N'manager', N'Duong Hai',
    (SELECT role_id FROM Roles WHERE role_name = N'MANAGER'), NULL, @KitchenID),
(N'coordinator_user', N'coordinator', N'Rikaki',
    (SELECT role_id FROM Roles WHERE role_name = N'SUPPLY_COORDINATOR'), NULL, NULL),
(N'kitchen_staff', N'Kitchen', N'Garoki',
    (SELECT role_id FROM Roles WHERE role_name = N'KITCHEN_STAFF'), NULL, @KitchenID),
(N'store_staff', N'store', N'Roka',
    (SELECT role_id FROM Roles WHERE role_name = N'STORE_STAFF'), @StoreID, NULL);

INSERT INTO Suppliers (supplier_name, contact_info, address, is_active)
VALUES
(N'Công ty Bột Mì Vissan', N'0909123456 - Anh Tuấn', N'Quận 1, TP.HCM', 1),
(N'Nông trại Trứng Gà Ba Huân', N'0988777666 - Chị Lan', N'Bình Chánh, TP.HCM', 1),
(N'Đại lý Nguyên Liệu Dỏm', N'0911222333', N'Không rõ', 0);

/* Danh mục: Tết (Bánh Chưng) + Trung Thu */
INSERT INTO Categories (name) VALUES
(N'Nguyên liệu'),
(N'Thành phẩm'),
(N'Nguyên liệu làm bánh'),
(N'Nhân & Vỏ bánh'),
(N'Bánh Trung Thu thành phẩm');

/* Sản phẩm mẫu (SKU unique) */
INSERT INTO Products (sku, product_name, category_id, base_unit, product_type, purchase_price, internal_price) VALUES
(N'RAW-GAO', N'Gạo nếp nương', 1, N'Kg', N'RAW', 35000, 0),
(N'RAW-THIT', N'Thịt heo ba chỉ', 1, N'Kg', N'RAW', 120000, 0),
(N'FIN-BC', N'Bánh Chưng Đặc Biệt', 2, N'Cái', N'FINISHED', 0, 180000),
(N'RAW-BOT', N'Bột mì số 11', 3, N'Kg', N'RAW', 0, 0),
(N'RAW-TRUNG', N'Trứng muối', 3, N'Quả', N'RAW', 0, 0),
(N'RAW-DAU', N'Đậu xanh hạt', 3, N'Kg', N'RAW', 0, 0),
(N'RAW-DUONG', N'Nước đường bánh nướng', 3, N'Lít', N'RAW', 0, 0),
(N'SEM-VO', N'Vỏ bánh nướng nhào sẵn', 4, N'Kg', N'SEMI_FINISHED', 0, 0),
(N'SEM-NHANDX', N'Nhân đậu xanh trứng muối (đã sên)', 4, N'Kg', N'SEMI_FINISHED', 0, 0),
(N'FIN-DX1T', N'Bánh Trung Thu Đậu Xanh 1 Trứng 150g', 5, N'Cái', N'FINISHED', 0, 0),
(N'FIN-TC2T', N'Bánh Trung Thu Thập Cẩm 2 Trứng 200g', 5, N'Cái', N'FINISHED', 0, 0);

/* Công thức — cột đúng: max_waste_percent (không dùng waste_allowance_percent) */
INSERT INTO Recipes_BOM (parent_product_id, material_id, quantity_required, max_waste_percent)
VALUES
((SELECT product_id FROM Products WHERE sku = N'FIN-BC'), (SELECT product_id FROM Products WHERE sku = N'RAW-GAO'), 0.5000, 3.00),
((SELECT product_id FROM Products WHERE sku = N'FIN-BC'), (SELECT product_id FROM Products WHERE sku = N'RAW-THIT'), 0.2000, 10.00),
((SELECT product_id FROM Products WHERE sku = N'FIN-DX1T'), (SELECT product_id FROM Products WHERE sku = N'SEM-VO'), 0.05, 2.00),
((SELECT product_id FROM Products WHERE sku = N'FIN-DX1T'), (SELECT product_id FROM Products WHERE sku = N'SEM-NHANDX'), 0.10, 0.00),
((SELECT product_id FROM Products WHERE sku = N'SEM-NHANDX'), (SELECT product_id FROM Products WHERE sku = N'RAW-DAU'), 0.60, 5.00),
((SELECT product_id FROM Products WHERE sku = N'SEM-NHANDX'), (SELECT product_id FROM Products WHERE sku = N'RAW-TRUNG'), 10.00, 0.00);

DECLARE @SupplierVissan INT = (SELECT TOP 1 supplier_id FROM Suppliers WHERE supplier_name LIKE N'%Vissan%');
DECLARE @SupplierBaHuan INT = (SELECT TOP 1 supplier_id FROM Suppliers WHERE supplier_name LIKE N'%Ba Huân%');

INSERT INTO Inventory (product_id, location_type, location_id, current_quantity)
VALUES
((SELECT product_id FROM Products WHERE sku = N'RAW-BOT'), N'KITCHEN', @KitchenID, 500.0),
((SELECT product_id FROM Products WHERE sku = N'RAW-TRUNG'), N'KITCHEN', @KitchenID, 2000.0),
((SELECT product_id FROM Products WHERE sku = N'SEM-VO'), N'KITCHEN', @KitchenID, 100.0),
((SELECT product_id FROM Products WHERE sku = N'SEM-NHANDX'), N'KITCHEN', @KitchenID, 100.0),
((SELECT product_id FROM Products WHERE sku = N'RAW-GAO'), N'KITCHEN', @KitchenID, 200.0),
((SELECT product_id FROM Products WHERE sku = N'RAW-THIT'), N'KITCHEN', @KitchenID, 80.0);

INSERT INTO Stock_Logs (product_id, location_type, location_id, change_quantity, reason, reference_type, supplier_id)
VALUES
((SELECT product_id FROM Products WHERE sku = N'RAW-BOT'), N'KITCHEN', @KitchenID, 500.0, N'NHAP_TU_NHA_CUNG_CAP', N'IMPORT', @SupplierVissan),
((SELECT product_id FROM Products WHERE sku = N'RAW-TRUNG'), N'KITCHEN', @KitchenID, 2000.0, N'NHAP_TU_NHA_CUNG_CAP', N'IMPORT', @SupplierBaHuan);

INSERT INTO Internal_Orders (store_id, kitchen_id, order_status, expected_delivery_date)
VALUES (@StoreID, @KitchenID, N'PENDING', DATEADD(DAY, 5, GETDATE()));
DECLARE @OrderID1 INT = SCOPE_IDENTITY();
INSERT INTO Internal_Order_Details (order_id, product_id, quantity_ordered, quantity_confirmed)
VALUES (@OrderID1, (SELECT product_id FROM Products WHERE sku = N'FIN-DX1T'), 100, 100);

INSERT INTO Internal_Orders (store_id, kitchen_id, order_status, expected_delivery_date)
VALUES (@StoreID, @KitchenID, N'SHIPPING', GETDATE());
DECLARE @OrderID2 INT = SCOPE_IDENTITY();
INSERT INTO Internal_Order_Details (order_id, product_id, quantity_ordered, quantity_confirmed, quantity_shipped)
VALUES (@OrderID2, (SELECT product_id FROM Products WHERE sku = N'FIN-TC2T'), 50, 50, 50);

INSERT INTO Production_Batches (product_id, batch_code, quantity_planned, quantity_actual, mfg_date, exp_date, status)
VALUES (
    (SELECT product_id FROM Products WHERE sku = N'FIN-DX1T'),
    N'BATCH-TT-2026-001',
    100,
    0,
    CAST(GETDATE() AS DATE),
    DATEADD(MONTH, 3, CAST(GETDATE() AS DATE)),
    N'SCHEDULED'
);
DECLARE @BatchID INT = SCOPE_IDENTITY();

INSERT INTO Production_Batch_Orders (batch_id, order_id, allocated_quantity)
VALUES (@BatchID, @OrderID1, 100);

GO

PRINT N'Kitchen2026: hoàn tất DDL + seed.';
GO
