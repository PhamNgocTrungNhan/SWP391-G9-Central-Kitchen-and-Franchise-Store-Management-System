-- Chạy một lần trên SQL Server: thêm cột đơn vị hiển thị cho từng dòng tồn kho.
IF COL_LENGTH('dbo.Inventory', 'display_unit') IS NULL
BEGIN
    ALTER TABLE dbo.Inventory ADD display_unit NVARCHAR(50) NULL;
END
GO
