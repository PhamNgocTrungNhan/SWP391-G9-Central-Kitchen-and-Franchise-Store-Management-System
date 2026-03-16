import { useEffect, useMemo, useState } from 'react'

const statusStyle = {
    Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    Confirmed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    Processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabel = {
    Pending: 'Chờ xác nhận',
    Confirmed: 'Đã xác nhận',
    Processing: 'Đang xử lý',
    Shipped: 'Đang giao',
    Delivered: 'Đã hoàn tất',
    Cancelled: 'Đã hủy',
}

const apiStatusToUi = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
}

function normalizeStatus(rawStatus) {
    if (!rawStatus) return 'Pending'
    return apiStatusToUi[String(rawStatus).toUpperCase()] || rawStatus
}

function toReadableDate(dateString) {
    if (!dateString) return 'N/A'
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function resolveDefaultStoreId() {
    const directValue = localStorage.getItem('storeId') || localStorage.getItem('store_id') || localStorage.getItem('current_store_id')
    if (directValue && String(directValue).trim()) return String(directValue).trim()

    const userRaw = localStorage.getItem('user')
    if (!userRaw) return '1'

    try {
        const user = JSON.parse(userRaw)
        const candidate = user?.storeId || user?.store_id
        if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
            return String(candidate).trim()
        }
    } catch {
        return '1'
    }

    return '1'
}

export default function OrderManagementPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState('All')
    const [storeIdFilter, setStoreIdFilter] = useState(resolveDefaultStoreId)
    const [expandedId, setExpandedId] = useState(null)
    const [actionLoadingId, setActionLoadingId] = useState(null)
    const [notice, setNotice] = useState({ open: false, type: 'success', message: '' })

    const token = () => localStorage.getItem('auth_token') || localStorage.getItem('token') || ''
    const openNotice = (type, message) => setNotice({ open: true, type, message })
    const closeNotice = () => setNotice((prev) => ({ ...prev, open: false }))

    const normalizeOrders = (rawOrders) => {
        if (!Array.isArray(rawOrders)) return []

        return rawOrders
            .map((item) => {
                const orderId = Number(item?.orderId || item?.internalOrderId || item?.id)
                if (!orderId) return null

                const status = normalizeStatus(item?.orderStatus || item?.status)
                const details = Array.isArray(item?.internalOrderDetails)
                    ? item.internalOrderDetails
                    : Array.isArray(item?.orderDetails)
                        ? item.orderDetails
                        : []

                const itemCount = details.length
                const totalQty = details.reduce((sum, row) => sum + Number(row?.quantityOrdered || 0), 0)

                return {
                    orderId,
                    orderCode: item?.orderCode || `#${orderId}`,
                    storeName: item?.store?.storeName || item?.store?.name || `Store #${item?.storeId || 'N/A'}`,
                    createdAt: toReadableDate(item?.createdAt || item?.orderDate || item?.expectedDeliveryDate),
                    status,
                    statusStyle: statusStyle[status] || statusStyle.Pending,
                    details,
                    itemCount,
                    totalQty,
                }
            })
            .filter(Boolean)
    }

    const fetchOrders = async () => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const storeId = String(storeIdFilter || '').trim()
        if (!storeId) {
            openNotice('error', 'Vui lòng nhập Store ID để tải danh sách đơn hàng nội bộ.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${apiBase}/internal-orders?storeId=${encodeURIComponent(storeId)}`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách đơn hàng nội bộ.')
            }

            const records = Array.isArray(data) ? data : data?.items || []
            setOrders(normalizeOrders(records))
        } catch (error) {
            setOrders([])
            openNotice('error', error.message || 'Tải đơn hàng thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const confirmCompleted = async (orderId) => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setActionLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/confirm-completed`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Không tìm thấy đơn hàng. Vui lòng tải lại danh sách để lấy đúng Order ID.')
                }
                throw new Error(data?.message || data?.title || 'Không thể xác nhận hoàn tất đơn hàng.')
            }

            openNotice('success', data?.message || 'Đã xác nhận hoàn tất đơn hàng.')
            fetchOrders()
        } catch (error) {
            openNotice('error', error.message || 'Thao tác xác nhận hoàn tất thất bại.')
        } finally {
            setActionLoadingId(null)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const filters = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

    const filtered = useMemo(() => {
        if (filter === 'All') return orders
        return orders.filter((o) => o.status === filter)
    }, [filter, orders])

    const canConfirmCompleted = (status) => status === 'Shipped'

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">assignment</span>
                    <h2 className="text-lg font-bold leading-tight">Quản lý đơn hàng nội bộ</h2>
                </div>
                <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors" onClick={fetchOrders}>
                    <span className="material-symbols-outlined text-[18px]">refresh</span>Tải lại
                </button>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold">Đơn hàng từ cửa hàng</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi trạng thái và xác nhận hoàn tất các đơn nội bộ.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <label className="flex-1">
                            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Store ID</span>
                            <input
                                type="number"
                                min="1"
                                value={storeIdFilter}
                                onChange={(e) => setStoreIdFilter(e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                placeholder="Nhập Store ID"
                            />
                        </label>
                        <button
                            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                            onClick={fetchOrders}
                        >
                            Tải theo Store
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">API mới hiện hỗ trợ danh sách ổn định theo storeId (ví dụ: 1).</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Tổng đơn', value: orders.length, color: 'text-slate-700 dark:text-slate-200', icon: 'list' },
                        { label: 'Đang xử lý', value: orders.filter((o) => o.status === 'Processing').length, color: 'text-amber-600 dark:text-amber-400', icon: 'precision_manufacturing' },
                        { label: 'Đang giao', value: orders.filter((o) => o.status === 'Shipped').length, color: 'text-blue-600 dark:text-blue-400', icon: 'local_shipping' },
                        { label: 'Đã hoàn tất', value: orders.filter((o) => o.status === 'Delivered').length, color: 'text-emerald-600 dark:text-emerald-400', icon: 'check_circle' },
                    ].map(({ label, value, color, icon }) => (
                        <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm">
                            <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
                            <div>
                                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {filters.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex shrink-0 items-center px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filter === f ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            {f === 'All' ? 'Tất cả' : statusLabel[f] || f}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                {f === 'All' ? orders.length : orders.filter((o) => o.status === f).length}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    {loading ? <div className="text-sm text-slate-500">Đang tải dữ liệu...</div> : null}
                    {!loading && filtered.length === 0 ? <div className="text-sm text-slate-500">Không có đơn hàng phù hợp.</div> : null}

                    {!loading && filtered.map((order) => (
                        <div key={order.orderId} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors" onClick={() => setExpandedId(expandedId === order.orderId ? null : order.orderId)}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold">#{order.orderId}</span>
                                        <span className="text-xs text-slate-500">{order.orderCode}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{order.storeName}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{order.createdAt} • {order.itemCount} mặt hàng • SL: {order.totalQty}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${order.statusStyle}`}>{statusLabel[order.status] || order.status}</span>
                                    <span className="material-symbols-outlined text-slate-400 text-[20px] transition-transform" style={{ transform: expandedId === order.orderId ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                </div>
                            </div>

                            {expandedId === order.orderId ? (
                                <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/20">
                                    <div className="flex flex-col gap-2 mb-4">
                                        {(order.details || []).map((item) => (
                                            <div key={item?.detailId || `${order.orderId}-${item?.productId}`} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <span className="text-sm">{item?.product?.productName || item?.product?.name || `Product #${item?.productId || 'N/A'}`}</span>
                                                <span className="text-sm font-medium">{Number(item?.quantityOrdered || 0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                                            disabled={!canConfirmCompleted(order.status) || actionLoadingId === order.orderId}
                                            onClick={() => confirmCompleted(order.orderId)}
                                            title={!canConfirmCompleted(order.status) ? 'Chỉ đơn ở trạng thái Đang giao mới được xác nhận hoàn tất.' : ''}
                                        >
                                            {actionLoadingId === order.orderId ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            {notice.open ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                            <span className={`material-symbols-outlined ${notice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{notice.type === 'success' ? 'check_circle' : 'error'}</span>
                            <h4 className="font-semibold text-sm">{notice.type === 'success' ? 'Thông báo thành công' : 'Thông báo lỗi'}</h4>
                        </div>
                        <div className="px-5 py-4 text-sm">{notice.message}</div>
                        <div className="px-5 pb-5 flex justify-end">
                            <button className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white" onClick={closeNotice}>Đóng</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
