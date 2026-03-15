# Internal Order APIs

Tai lieu nay mo ta cac API da duoc xac nhan cho chuc nang Internal Order trong he thong.

## Base URL

- Development backend: `http://localhost:5202`
- Frontend Vite: goi qua proxy `/api`

## Authentication

Tat ca API ben duoi deu la protected API.

- Header dung:
  - `Authorization: Bearer <JWT_TOKEN>`
- Luu y:
  - Neu gui token khong co prefix `Bearer ` thi se bi `401 Unauthorized`.

---

## 1) Tao Internal Order

- Method: `POST`
- Endpoint: `/api/internal-orders`
- Mo ta: Tao don dat hang tu cua hang den bep trung tam.

### Request Headers

- `accept: */*`
- `Content-Type: application/json`
- `Authorization: Bearer <JWT_TOKEN>`

### Request Body (mau)

```json
{
  "storeId": 1,
  "expectedDeliveryDate": "2026-03-16T08:00:00.000Z",
  "orderDetails": [
    {
      "productId": 1,
      "quantityOrdered": 10,
      "quantityConfirmed": 0,
      "quantityShipped": 0
    }
  ]
}
```

### cURL

```bash
curl -X POST "http://localhost:5202/api/internal-orders" \\
  -H "accept: */*" \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "storeId": 1,
    "expectedDeliveryDate": "2026-03-16T08:00:00.000Z",
    "orderDetails": [
      {
        "productId": 1,
        "quantityOrdered": 10,
        "quantityConfirmed": 0,
        "quantityShipped": 0
      }
    ]
  }'
```

### Response

- Success: `200` hoac `201` (tuy backend implementation)
- Error thuong gap:
  - `401 Unauthorized`: token sai/het han/thieu Bearer
  - `400 Bad Request`: payload khong hop le

---

## 2) Lay danh sach Internal Orders

- Method: `GET`
- Endpoint: `/api/internal-orders`
- Mo ta: Lay danh sach don hang noi bo de hien thi tab "My Orders".

### Request Headers

- `accept: */*`
- `Authorization: Bearer <JWT_TOKEN>`

### cURL

```bash
curl -X GET "http://localhost:5202/api/internal-orders" \\
  -H "accept: */*" \\
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Response

- Success: `200 OK`
- Du lieu tra ve thuong la array, vi du:

```json
[]
```

Hoac:

```json
[
  {
    "id": 101,
    "storeId": 1,
    "status": "Pending",
    "createdAt": "2026-03-15T09:30:00Z",
    "expectedDeliveryDate": "2026-03-16T08:00:00Z",
    "orderDetails": [
      {
        "productId": 1,
        "quantityOrdered": 10,
        "quantityConfirmed": 0,
        "quantityShipped": 0
      }
    ]
  }
]
```

---

## Frontend integration da lam

File: `app/src/pages/StoreOrderPage.jsx`

- Place Order:
  - Submit se goi `POST /api/internal-orders`
  - Tu dong map cart -> `orderDetails`
  - Hien loading/success/error ro rang
- My Orders:
  - Khi mo tab se goi `GET /api/internal-orders`
  - Hien loading, error, empty state
  - Chuyen du lieu API sang card UI de theo doi trang thai

---

## TODO khi co data that

- Chot schema response chinh xac cho order list (ten field id/date/status).
- Them API chi tiet don (`GET /api/internal-orders/{id}`) neu backend co.
- Them API cap nhat trang thai don neu backend ho tro.
