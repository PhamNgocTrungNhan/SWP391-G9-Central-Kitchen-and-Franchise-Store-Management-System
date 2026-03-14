# Hướng dẫn kiểm tra lỗi 500 và CORS cho Backend

## 1. Lỗi CORS (Cross-Origin Resource Sharing)
- Khi frontend (React) gọi API backend mà bị lỗi: `No 'Access-Control-Allow-Origin' header is present on the requested resource`.
- Cách khắc phục: Thêm cấu hình CORS vào file `Program.cs` (hoặc `Startup.cs`) của backend ASP.NET Core:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.WithOrigins("http://localhost:5173")
                        .AllowAnyHeader()
                        .AllowAnyMethod());
});
app.UseCors("AllowFrontend");
```
- Đặt dòng `app.UseCors("AllowFrontend");` sau `app.UseRouting();` và trước `app.UseAuthorization();`.
- Khởi động lại backend sau khi sửa.

## 2. Lỗi 500 Internal Server Error
- Lỗi này xuất hiện khi backend gặp lỗi xử lý request (ví dụ: sai dữ liệu, lỗi database, exception chưa xử lý).
- Cách kiểm tra:
    1. Mở log hoặc terminal nơi đang chạy backend để xem chi tiết lỗi.
    2. Đọc thông báo lỗi hoặc stack trace để xác định nguyên nhân.
    3. Thường gặp: sai tên trường, dữ liệu đầu vào không hợp lệ, lỗi kết nối database, exception chưa bắt.
- Nếu cần hỗ trợ, gửi log lỗi chi tiết cho người hỗ trợ.

## 3. Lưu ý cho input password
- Thêm thuộc tính `autoComplete="current-password"` cho input password để trình duyệt không cảnh báo.

Ví dụ:
```jsx
<input type="password" autoComplete="current-password" ... />
```

---
Nếu cần hỗ trợ thêm, gửi log lỗi backend hoặc mô tả chi tiết vấn đề.