import { Fragment, useEffect, useMemo, useState } from 'react'

const statusStyle = {
    Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    Approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    Confirmed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    Processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Produced: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    Shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const statusLabel = {
    Pending: 'Chờ xác nhận',
    Approved: 'Đã duyệt',
    Confirmed: 'Đã xác nhận',
    Processing: 'Đang sản xuất',
    Produced: 'Sẵn sàng',
    Shipped: 'Đang giao',
    Delivered: 'Đã hoàn tất',
    Rejected: 'Đã từ chối',
    Cancelled: 'Đã hủy',
    Returned: 'Đã trả hàng',
}

const apiStatusToUi = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    PRODUCED: 'Produced',
    SHIPPED: 'Shipped',
    SHIPPING: 'Shipped',
    IN_TRANSIT: 'Shipped',
    INTRANSIT: 'Shipped',
    DELIVERING: 'Shipped',
    ON_THE_WAY: 'Shipped',
    DELIVERED: 'Delivered',
    COMPLETED: 'Delivered',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned',
}

function normalizeStatus(rawStatus) {
    if (!rawStatus) return 'Pending'
    return apiStatusToUi[String(rawStatus).toUpperCase()] || rawStatus
}

function isShippingStatus(status) {
    if (!status) return false

    const raw = String(status).trim()
    if (!raw) return false

    const normalized = normalizeStatus(raw)
    if (normalized === 'Shipped') return true

    const upper = raw.toUpperCase().replace(/[\s-]+/g, '_')
    return upper === 'SHIPPING' || upper === 'IN_TRANSIT' || upper === 'INTRANSIT' || upper === 'DELIVERING' || upper === 'ON_THE_WAY' || raw === 'Đang giao'
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
    const [productNameMap, setProductNameMap] = useState({})
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState('All')
    const [expandedId, setExpandedId] = useState(null)
    const [actionLoadingId, setActionLoadingId] = useState(null)
    const [transferLoadingId, setTransferLoadingId] = useState(null)
    const [cancelLoadingId, setCancelLoadingId] = useState(null)
    const [detailLoadingId, setDetailLoadingId] = useState(null)
    const [notice, setNotice] = useState({ open: false, type: 'success', message: '' })

    const token = () => {
        const candidates = [
            localStorage.getItem('auth_token'),
            localStorage.getItem('token'),
            localStorage.getItem('access_token'),
            sessionStorage.getItem('auth_token'),
            sessionStorage.getItem('token'),
            sessionStorage.getItem('access_token'),
        ]
        const first = candidates.find((item) => String(item || '').trim())
        return first ? String(first).replace(/^Bearer\s+/i, '').trim() : ''
    }

    const authHeaders = () => {
        const tk = token()
        return {
            accept: '*/*',
            ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
        }
    }

    const openNotice = (type, message) => setNotice({ open: true, type, message })
    const closeNotice = () => setNotice((prev) => ({ ...prev, open: false }))

    useEffect(() => {
        if (!notice.open) return undefined

        const timer = window.setTimeout(() => {
            setNotice((prev) => ({ ...prev, open: false }))
        }, 2800)

        return () => window.clearTimeout(timer)
    }, [notice.open, notice.message])

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

    const fetchProductMap = async () => {
        const tk = token()
        try {
            const response = await fetch(`${apiBase}/Products/manufactured`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) return

            const records = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
            const map = {}
            records.forEach((item) => {
                const id = Number(item?.productId || item?.id)
                if (!id) return
                const name = item?.productName || item?.name
                if (!name) return
                map[id] = name
            })
            setProductNameMap(map)
        } catch {
            setProductNameMap({})
        }
    }

    const fetchOrders = async () => {
        const effectiveStoreId = resolveDefaultStoreId()
        const tk = token()

        if (!tk) {
            setOrders([])
            openNotice('error', 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
            return
        }

        setLoading(true)

        const fetchOrderRecords = async (url) => {
            const response = await fetch(url, {
                method: 'GET',
                headers: authHeaders(),
            })
            const data = await response.json().catch(() => [])

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Bạn không có quyền xem danh sách đơn hàng. Vui lòng đăng nhập đúng tài khoản có quyền.')
                }
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách đơn hàng nội bộ.')
            }

            const records = Array.isArray(data) ? data : data?.items || []
            return records
        }

        const hydrateOrdersWithDetails = async (baseOrders) => {
            const needHydrate = baseOrders.filter((order) => !Array.isArray(order.details) || order.details.length === 0)
            if (!needHydrate.length) return baseOrders

            const detailPairs = await Promise.all(needHydrate.map(async (order) => {
                try {
                    const response = await fetch(`${apiBase}/internal-orders/${order.orderId}`, {
                        method: 'GET',
                        headers: authHeaders(),
                    })
                    const data = await response.json().catch(() => ({}))
                    if (!response.ok) return [order.orderId, null]

                    const details = Array.isArray(data?.internalOrderDetails)
                        ? data.internalOrderDetails
                        : Array.isArray(data?.orderDetails)
                            ? data.orderDetails
                            : []

                    const totalQty = details.reduce((sum, row) => sum + Number(row?.quantityOrdered || 0), 0)
                    return [order.orderId, { details, itemCount: details.length, totalQty }]
                } catch {
                    return [order.orderId, null]
                }
            }))

            const detailMap = new Map(detailPairs)
            return baseOrders.map((order) => {
                const hydrated = detailMap.get(order.orderId)
                if (!hydrated) return order
                return {
                    ...order,
                    details: hydrated.details,
                    itemCount: hydrated.itemCount,
                    totalQty: hydrated.totalQty,
                }
            })
        }

        setLoading(true)
        try {
            const records = await fetchOrderRecords(`${apiBase}/internal-orders?storeId=${encodeURIComponent(effectiveStoreId)}`)

            const normalized = normalizeOrders(records)
            const hydrated = await hydrateOrdersWithDetails(normalized)

            setOrders(hydrated)
        } catch (error) {
            setOrders([])
            openNotice('error', error.message || 'Tải đơn hàng thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const confirmCompleted = async (order) => {
        const orderId = Number(order?.orderId)
        const status = String(order?.status || '')

        if (!orderId) {
            openNotice('error', 'Order ID không hợp lệ.')
            return
        }

        if (!isShippingStatus(status)) {
            openNotice('error', 'Chỉ đơn ở trạng thái Đang giao mới được xác nhận hoàn tất.')
            return
        }

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

    const approveOrder = async (orderId) => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setActionLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/approve`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể duyệt đơn hàng.')
            }

            openNotice('success', data?.message || 'Đã duyệt đơn hàng thành công.')
            fetchOrders()
        } catch (error) {
            openNotice('error', error.message || 'Duyệt đơn hàng thất bại.')
        } finally {
            setActionLoadingId(null)
        }
    }

    const rejectOrder = async (orderId) => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const reason = window.prompt('Nhập lý do từ chối (có thể bỏ trống):', '')

        setActionLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/reject`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason || '' }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể từ chối đơn hàng.')
            }

            openNotice('success', data?.message || 'Đã từ chối đơn hàng.')
            fetchOrders()
        } catch (error) {
            openNotice('error', error.message || 'Từ chối đơn hàng thất bại.')
        } finally {
            setActionLoadingId(null)
        }
    }

    const cancelOrder = async (orderId) => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setCancelLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể hủy đơn hàng.')
            }

            openNotice('success', data?.message || 'Đã hủy đơn hàng thành công.')
            fetchOrders()
        } catch (error) {
            openNotice('error', error.message || 'Hủy đơn hàng thất bại.')
        } finally {
            setCancelLoadingId(null)
        }
    }

    const markAsProduced = async (orderId) => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const targetOrder = orders.find((item) => Number(item?.orderId) === Number(orderId))
        if (!targetOrder) {
            openNotice('error', 'Không tìm thấy đơn hàng.')
            return
        }

        let nextStatus = 'PROCESSING'
        let successMessage = `Đơn hàng #${orderId} đã chuyển sang đang sản xuất.`

        if (targetOrder.status === 'Processing') {
            nextStatus = 'PRODUCED'
            successMessage = `Đơn hàng #${orderId} đã sẵn sàng xuất kho.`
        }

        setActionLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: nextStatus }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể cập nhật trạng thái đơn hàng.')
            }

            openNotice('success', data?.message || successMessage)
            await fetchOrders()
        } catch (error) {
            openNotice('error', error.message || 'Cập nhật trạng thái thất bại.')
        } finally {
            setActionLoadingId(null)
        }
    }

    const transferOrder = async (orderId) => {
        const targetOrder = orders.find((item) => Number(item?.orderId) === Number(orderId))

        if (!targetOrder) {
            openNotice('error', 'Không tìm thấy đơn hàng để xuất kho.')
            return
        }

        if (!canTransferOrder(targetOrder.status)) {
            openNotice('error', 'Chỉ đơn ở trạng thái Đang sản xuất hoặc Sẵn sàng mới được xuất kho.')
            return
        }

        const tk = token()

        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setTransferLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'SHIPPING' }),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.message || data?.title || `Không thể xuất kho cho đơn hàng này. Status: ${response.status}`)
            }

            openNotice('success', data?.message || `Đã xuất kho cho đơn hàng #${orderId}. Kho Kitchen đã được trừ.`)

            await new Promise(resolve => setTimeout(resolve, 1000))
            await fetchOrders()
        } catch (error) {
            openNotice('error', error.message || 'Xuất kho thất bại.')
        } finally {
            setTransferLoadingId(null)
        }
    }

    const fetchOrderDetail = async (orderId) => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
            return
        }

        setDetailLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}`, {
                method: 'GET',
                headers: authHeaders(),
            })
            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Bạn không có quyền xem chi tiết đơn hàng này.')
                }
                throw new Error(data?.message || data?.title || 'Không thể tải chi tiết đơn hàng.')
            }

            const details = Array.isArray(data?.internalOrderDetails)
                ? data.internalOrderDetails
                : Array.isArray(data?.orderDetails)
                    ? data.orderDetails
                    : []

            setOrders((prev) => prev.map((order) => {
                if (order.orderId !== orderId) return order

                const totalQty = details.reduce((sum, row) => sum + Number(row?.quantityOrdered || 0), 0)
                return {
                    ...order,
                    details,
                    itemCount: details.length,
                    totalQty,
                }
            }))
        } catch (error) {
            openNotice('error', error.message || 'Tải chi tiết đơn hàng thất bại.')
        } finally {
            setDetailLoadingId(null)
        }
    }

    const handleToggleExpand = (order) => {
        const nextExpanded = expandedId === order.orderId ? null : order.orderId
        setExpandedId(nextExpanded)

        if (nextExpanded === order.orderId && (!Array.isArray(order.details) || order.details.length === 0)) {
            fetchOrderDetail(order.orderId)
        }
    }

    useEffect(() => {
        fetchOrders()
        fetchProductMap()
    }, [])

    const filters = ['All', 'Pending', 'Approved', 'Rejected', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

    const filtered = useMemo(() => {
        if (filter === 'All') return orders
        return orders.filter((o) => o.status === filter)
    }, [filter, orders])

    const stats = useMemo(() => ({
        total: orders.length,
        pending: orders.filter((o) => o.status === 'Pending').length,
        approved: orders.filter((o) => o.status === 'Approved').length,
        processing: orders.filter((o) => o.status === 'Processing').length,
        shipped: orders.filter((o) => isShippingStatus(o.status)).length,
        delivered: orders.filter((o) => o.status === 'Delivered').length,
        rejected: orders.filter((o) => o.status === 'Rejected').length,
        cancelled: orders.filter((o) => o.status === 'Cancelled').length,
    }), [orders])

    const canConfirmCompleted = (status) => isShippingStatus(status)
    const canCancelOrder = (status) => status === 'Pending'
    const canApproveOrder = (status) => status === 'Pending'
    const canRejectOrder = (status) => status === 'Pending'
    const canMarkAsProduced = (status) => status === 'Approved' || status === 'Processing' // APPROVED hoặc PROCESSING
    const canTransferOrder = (status) => status === 'Processing' || status === 'Produced' // PROCESSING hoặc PRODUCED có thể xuất kho

    const getProductDisplayName = (item) => {
        const productId = Number(item?.productId)
        if (item?.product?.productName) return item.product.productName
        if (item?.product?.name) return item.product.name
        if (productId && productNameMap[productId]) return productNameMap[productId]
        if (productId) return `Sản phẩm #${productId}`
        return 'Sản phẩm chưa xác định'
    }

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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Tổng đơn hàng', value: stats.total, icon: 'receipt_long', color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Chờ duyệt', value: stats.pending, icon: 'pending', color: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Đang giao', value: stats.shipped, icon: 'local_shipping', color: 'text-indigo-600 dark:text-indigo-400' },
                        { label: 'Hoàn tất', value: stats.delivered, icon: 'check_circle', color: 'text-emerald-600 dark:text-emerald-400' },
                    ].map((card) => (
                        <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined text-[32px] ${card.color}`}>{card.icon}</span>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Lọc theo trạng thái</span>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="All">Tất cả</option>
                            {filters.filter(f => f !== 'All').map((f) => (
                                <option key={f} value={f}>{statusLabel[f] || f}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {loading ? <div className="px-4 py-3 text-sm text-slate-500">Đang tải dữ liệu...</div> : null}
                    {!loading && filtered.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">Không có đơn hàng phù hợp.</div> : null}

                    {!loading && filtered.length > 0 ? (
                        <table className="w-full table-fixed text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="w-[16%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn hàng</th>
                                    <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Cửa hàng</th>
                                    <th className="w-[16%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tạo</th>
                                    <th className="w-[8%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mặt hàng</th>
                                    <th className="w-[8%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">SL</th>
                                    <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                    <th className="w-[22%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((order) => (
                                    <Fragment key={order.orderId}>
                                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-sm whitespace-normal break-words">
                                                <p className="font-semibold">#{order.orderId}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{order.orderCode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-normal break-words">{order.storeName}</td>
                                            <td className="px-4 py-3 text-sm whitespace-normal break-words">{order.createdAt}</td>
                                            <td className="px-4 py-3 text-sm">{order.itemCount}</td>
                                            <td className="px-4 py-3 text-sm">{order.totalQty}</td>
                                            <td className="px-4 py-3 text-sm whitespace-normal break-words">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${order.statusStyle}`}>
                                                    {statusLabel[order.status] || order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-normal">
                                                <button
                                                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    onClick={() => handleToggleExpand(order)}
                                                >
                                                    {expandedId === order.orderId ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === order.orderId ? (
                                            <tr className="bg-slate-50/60 dark:bg-slate-800/20">
                                                <td colSpan={7} className="px-4 py-3">
                                                    {detailLoadingId === order.orderId ? <p className="mb-2 text-xs text-slate-500">Đang tải chi tiết đơn...</p> : null}
                                                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                                                        {canApproveOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-60"
                                                                disabled={actionLoadingId === order.orderId}
                                                                onClick={() => approveOrder(order.orderId)}
                                                            >
                                                                {actionLoadingId === order.orderId ? 'Đang duyệt...' : 'Duyệt đơn'}
                                                            </button>
                                                        )}
                                                        {canRejectOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors disabled:opacity-60"
                                                                disabled={actionLoadingId === order.orderId}
                                                                onClick={() => rejectOrder(order.orderId)}
                                                            >
                                                                {actionLoadingId === order.orderId ? 'Đang từ chối...' : 'Từ chối'}
                                                            </button>
                                                        )}
                                                        {canMarkAsProduced(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-60"
                                                                disabled={actionLoadingId === order.orderId}
                                                                onClick={() => markAsProduced(order.orderId)}
                                                            >
                                                                {actionLoadingId === order.orderId ? 'Đang cập nhật...' : 'Sẵn sàng'}
                                                            </button>
                                                        )}
                                                        {canTransferOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                                                                disabled={transferLoadingId === order.orderId}
                                                                onClick={() => transferOrder(order.orderId)}
                                                            >
                                                                {transferLoadingId === order.orderId ? 'Đang xuất kho...' : 'Xuất kho'}
                                                            </button>
                                                        )}
                                                        {canConfirmCompleted(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                                                                disabled={actionLoadingId === order.orderId}
                                                                onClick={() => confirmCompleted(order)}
                                                            >
                                                                {actionLoadingId === order.orderId ? 'Đang xử lý...' : 'Hoàn tất'}
                                                            </button>
                                                        )}
                                                        {canCancelOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
                                                                disabled={cancelLoadingId === order.orderId}
                                                                onClick={() => cancelOrder(order.orderId)}
                                                            >
                                                                {cancelLoadingId === order.orderId ? 'Đang hủy...' : 'Hủy đơn'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {(order.details || []).length > 0 ? (
                                                        <table className="w-full text-left border-collapse rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                                            <thead>
                                                                <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng đặt</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(order.details || []).map((item) => (
                                                                    <tr key={item?.detailId || `${order.orderId}-${item?.productId}`} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                                        <td className="px-3 py-2 text-sm">{getProductDisplayName(item)}</td>
                                                                        <td className="px-3 py-2 text-sm font-medium">{Number(item?.quantityOrdered || 0)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <p className="text-xs text-slate-500">Đơn này chưa có dòng chi tiết hoặc API chưa trả chi tiết.</p>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    ) : null}
                </div>
            </div>

            {notice.open ? (
                <div className="fixed top-4 right-4 z-[60] pointer-events-none">
                    <div className="pointer-events-auto w-[min(92vw,24rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <div className="px-4 py-3 flex items-start gap-3">
                            <span className={`material-symbols-outlined mt-0.5 ${notice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {notice.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">
                                    {notice.type === 'success' ? 'Thao tác thành công' : 'Có lỗi xảy ra'}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">{notice.message}</p>
                            </div>
                            <button
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={closeNotice}
                                aria-label="Đóng thông báo"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div className={`h-1 rounded-b-xl ${notice.type === 'success' ? 'bg-emerald-500/80' : 'bg-red-500/80'}`} />
                    </div>
                </div>
            ) : null}
        </div>
    )
}
