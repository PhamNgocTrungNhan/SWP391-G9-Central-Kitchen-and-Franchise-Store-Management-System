using Shop2026.Models;
using Shop2026.Context;

namespace Shop2026.DAL
{
    public class InternalOrderRepository
    {
        private readonly ApplicationDbContext _context;

        public InternalOrderRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public ApplicationDbContext GetContext() => _context;

        public List<InternalOrder> GetStoreOrders(int storeId, string? status)
        {
            var query = _context.InternalOrders
                        .Where(o => o.StoreId == storeId);

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(o => o.OrderStatus == status);
            }

            return query
                    .OrderByDescending(o => o.CreatedAt)
                    .ToList();
        }

        public InternalOrder CreateOrder(InternalOrder order)
        {
            _context.InternalOrders.Add(order);
            _context.SaveChanges();
            return order;
        }

        public void AddOrderDetails(List<InternalOrderDetail> details)
        {
            _context.InternalOrderDetails.AddRange(details);
            _context.SaveChanges();
        }

        public InternalOrder? GetOrderDetail(int orderId)
        {
            return _context.InternalOrders
                .Where(o => o.OrderId == orderId)
                .Select(o => new InternalOrder
                {
                    OrderId = o.OrderId,
                    StoreId = o.StoreId,
                    KitchenId = o.KitchenId,
                    ExpectedDeliveryDate = o.ExpectedDeliveryDate,
                    OrderStatus = o.OrderStatus,
                    PaymentStatus = o.PaymentStatus,
                    TotalAmount = o.TotalAmount,
                    CreatedAt = o.CreatedAt,
                    InternalOrderDetails = _context.InternalOrderDetails
                        .Where(d => d.OrderId == o.OrderId)
                        .ToList()
                })
                .FirstOrDefault();
        }

        public InternalOrder? GetOrderById(int orderId)
        {
            return _context.InternalOrders
                .FirstOrDefault(o => o.OrderId == orderId);
        }

        public void UpdateOrder(InternalOrder order)
        {
            _context.InternalOrders.Update(order);
            _context.SaveChanges();
        }

        public InternalOrder? ApproveOrder(int orderId, int approvedBy)
        {
            var order = _context.InternalOrders
                        .FirstOrDefault(o => o.OrderId == orderId);

            if (order == null)
                return null;

            if (order.OrderStatus != "PENDING")
                throw new Exception("Only PENDING orders can be approved");

            order.OrderStatus = "APPROVED";
            order.ApprovedBy = approvedBy;
            order.ApprovedAt = DateTime.UtcNow;

            _context.SaveChanges();

            return order;
        }

        public InternalOrder? RejectOrder(int orderId, string reason, int rejectedBy)
        {
            var order = _context.InternalOrders
                        .FirstOrDefault(o => o.OrderId == orderId);

            if (order == null)
                return null;

            if (order.OrderStatus != "PENDING")
                throw new Exception("Only PENDING orders can be rejected");

            order.OrderStatus = "REJECTED";
            order.RejectionReason = reason;
            order.ApprovedBy = rejectedBy;
            order.UpdatedAt = DateTime.Now;

            _context.SaveChanges();

            return order;
        }

        public InternalOrder? UpdateOrderStatus(int orderId, string status)
        {
            var order = _context.InternalOrders
                        .FirstOrDefault(o => o.OrderId == orderId);

            if (order == null)
                return null;

            order.OrderStatus = status;
            order.UpdatedAt = DateTime.Now;

            _context.SaveChanges();

            return order;
        }

        public List<InternalOrder> GetAllOrders(string? status)
        {
            var query = _context.InternalOrders.AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(o => o.OrderStatus == status);
            }

            return query
                    .OrderByDescending(o => o.CreatedAt)
                    .ToList();
        }

        public List<InternalOrder> GetKitchenOrders(int kitchenId, string? status)
        {
            var query = _context.InternalOrders.Where(o => o.KitchenId == kitchenId);

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(o => o.OrderStatus == status);
            }

            return query.OrderBy(o => o.ExpectedDeliveryDate).ToList();
        }

        public InternalOrder? SubmitFeedback(int orderId, int rating, string? comment)
        {
            var order = _context.InternalOrders.FirstOrDefault(o => o.OrderId == orderId);
            if (order == null)
                return null;

            order.Rating = rating;
            order.FeedbackComment = comment;
            order.UpdatedAt = DateTime.Now;

            _context.SaveChanges();
            return order;
        }

        // ==========================================
        // ✅ CÁC HÀM CHO LUỒNG THANH TOÁN & HOÀN TIỀN
        // ==========================================

        public decimal GetProductInternalPrice(int productId)
        {
            var product = _context.Products.Find(productId);
            return product?.InternalPrice ?? 0;
        }

        public void AddTransaction(Transaction transaction)
        {
            _context.Transactions.Add(transaction);
            _context.SaveChanges();
        }

        // 🚨 ĐÂY CHÍNH LÀ HÀM BẠN BỊ THIẾU LÚC NÃY
        public decimal GetTotalRefundedAmount(int orderId)
        {
            return _context.Transactions
                .Where(t => t.InternalOrderId == orderId && t.TransactionType == "EXPENSE")
                .Sum(t => t.Amount);
        }
    }
}