import { useEffect, useState } from 'react'

const storeInventory = [
    { name: 'All-Purpose Flour', unit: 'kg', stock: 45, min: 20, icon: 'grain', status: 'ok' },
    { name: 'Fresh Tomatoes', unit: 'kg', stock: 8, min: 15, icon: 'eco', status: 'low' },
    { name: 'Mozzarella Cheese', unit: 'kg', stock: 3, min: 10, icon: 'kitchen', status: 'critical' },
    { name: 'Tomato Sauce Base', unit: 'L', stock: 22, min: 10, icon: 'soup_kitchen', status: 'ok' },
    { name: 'Pizza Dough Base', unit: 'kg', stock: 12, min: 15, icon: 'bakery_dining', status: 'low' },
]

const catalog = [
    { productId: 1, name: 'All-Purpose Flour', unit: 'kg', price: '$1.20/kg', icon: 'grain' },
    { productId: 2, name: 'Fresh Basil Leaves', unit: 'bunch', price: '$0.80/bunch', icon: 'eco' },
    { productId: 3, name: 'Pizza Dough Base', unit: 'kg', price: '$2.50/kg', icon: 'bakery_dining' },
    { productId: 4, name: 'House Burger Sauce', unit: 'L', price: '$4.00/L', icon: 'soup_kitchen' },
    { productId: 5, name: 'Mozzarella Cheese', unit: 'kg', price: '$8.50/kg', icon: 'kitchen' },
    { productId: 6, name: 'Tomato Sauce Base', unit: 'L', price: '$3.20/L', icon: 'local_pizza' },
]

const statusColors = { ok: 'bg-emerald-500', low: 'bg-amber-500', critical: 'bg-red-500' }
const stockBg = { ok: '', low: 'bg-amber-50 dark:bg-amber-900/10', critical: 'bg-red-50 dark:bg-red-900/10' }
const orderStatusStyle = {
    Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'In Transit': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Confirmed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const apiStatusToUi = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
}

export default function StoreOrderPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const [tab, setTab] = useState(0) // 0=Place Order, 1=My Orders, 2=Store Inventory
    const [cart, setCart] = useState({})
    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [ordersError, setOrdersError] = useState('')
    const [detailOrderId, setDetailOrderId] = useState('')
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState('')
    const [detailOrder, setDetailOrder] = useState(null)
    const [cancelLoading, setCancelLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitSuccess, setSubmitSuccess] = useState('')

    const addToCart = (name) => setCart(c => ({ ...c, [name]: (c[name] || 0) + 1 }))
    const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

    const toReadableDate = (dateString) => {
        if (!dateString) return 'N/A'
        const d = new Date(dateString)
        if (Number.isNaN(d.getTime())) return dateString
        return d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const normalizeStatus = (rawStatus) => {
        if (!rawStatus) return 'Pending'
        return apiStatusToUi[String(rawStatus).toUpperCase()] || rawStatus
    }

    const normalizeOrders = (rawOrders) => {
        if (!Array.isArray(rawOrders)) return []
        return rawOrders.map((item, index) => {
            const status = normalizeStatus(item?.status || item?.orderStatus)
            const orderDetails = Array.isArray(item?.orderDetails) ? item.orderDetails : Array.isArray(item?.internalOrderDetails) ? item.internalOrderDetails : []
            const idValue = item?.id || item?.internalOrderId || item?.orderId || `TEMP-${index + 1}`
            return {
                id: `#${idValue}`,
                date: toReadableDate(item?.createdAt || item?.orderDate || item?.expectedDeliveryDate),
                items: orderDetails.length,
                status,
                statusStyle: orderStatusStyle[status] || orderStatusStyle.Pending,
            }
        })
    }

    const fetchMyOrders = async () => {
        setOrdersError('')
        setOrdersLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            const response = await fetch(`${apiBase}/internal-orders`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách đơn hàng.')
            }

            const records = Array.isArray(data) ? data : data?.items || []
            setOrders(normalizeOrders(records))
        } catch (error) {
            setOrders([])
            setOrdersError(error.message || 'Tải đơn hàng thất bại.')
        } finally {
            setOrdersLoading(false)
        }
    }

    const fetchOrderById = async () => {
        setDetailError('')
        setDetailOrder(null)

        const orderId = Number(detailOrderId)
        if (!orderId || orderId < 1) {
            setDetailError('Vui lòng nhập Order ID hợp lệ (số nguyên > 0).')
            return
        }

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            setDetailLoading(true)
            const response = await fetch(`${apiBase}/internal-orders/${orderId}`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải chi tiết đơn hàng.')
            }

            setDetailOrder(data)
        } catch (error) {
            setDetailError(error.message || 'Tải chi tiết đơn thất bại.')
        } finally {
            setDetailLoading(false)
        }
    }

    const cancelOrderById = async (orderId) => {
        setDetailError('')
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            setCancelLoading(true)
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể hủy đơn hàng.')
            }

            const updatedStatus = normalizeStatus('CANCELLED')
            setDetailOrder((prev) => prev ? { ...prev, orderStatus: updatedStatus, status: updatedStatus } : prev)
            fetchMyOrders()
        } catch (error) {
            setDetailError(error.message || 'Hủy đơn thất bại.')
        } finally {
            setCancelLoading(false)
        }
    }

    useEffect(() => {
        if (tab === 1) {
            fetchMyOrders()
        }
    }, [tab])

    const handleSubmitOrder = async () => {
        setSubmitError('')
        setSubmitSuccess('')

        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (!token) {
            setSubmitError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại để gửi đơn hàng.')
            return
        }

        const orderDetails = Object.entries(cart)
            .filter(([, quantity]) => quantity > 0)
            .map(([name, quantity]) => {
                const item = catalog.find(c => c.name === name)
                return {
                    productId: item?.productId ?? 0,
                    quantityOrdered: quantity,
                    quantityConfirmed: 0,
                    quantityShipped: 0,
                }
            })
            .filter(item => item.productId > 0)

        if (!orderDetails.length) {
            setSubmitError('Giỏ hàng đang trống hoặc chưa map được sản phẩm hợp lệ.')
            return
        }

        const payload = {
            storeId: Number(localStorage.getItem('store_id') || 1),
            expectedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            orderDetails,
        }

        setSubmitting(true)
        try {
            const response = await fetch(`${apiBase}/internal-orders`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Gửi đơn hàng thất bại.')
            }

            const orderCode = data?.id || data?.orderId || data?.code
            setSubmitSuccess(orderCode ? `Tạo đơn hàng thành công: #${orderCode}` : 'Tạo đơn hàng thành công.')
            setCart({})
            setTab(1)
        } catch (error) {
            setSubmitError(error.message || 'Không thể kết nối API nội bộ.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">storefront</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Store Staff Portal</h2>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Franchise #042 – Downtown Express</span>
                </div>
                <div className="flex flex-1 justify-end gap-6 items-center">
                    <nav className="hidden md:flex items-center gap-8">
                        {['Place Order', 'My Orders', 'Store Inventory'].map((item, i) => (
                            <button key={item} onClick={() => setTab(i)} className={`text-sm font-medium transition-colors ${i === tab ? 'text-primary font-semibold border-b-2 border-primary pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-primary'}`}>{item}</button>
                        ))}
                    </nav>
                    <button className="relative text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-full size-9" />
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

                {/* TAB 0: Place Order */}
                {tab === 0 && (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">Đặt Hàng Từ Bếp Trung Tâm</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Chọn nguyên liệu hoặc bán thành phẩm cần bổ sung.</p>
                            </div>
                            {cartCount > 0 && (
                                <button className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                                    <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                                    Xem Giỏ Hàng ({cartCount} sản phẩm)
                                </button>
                            )}
                        </div>

                        {/* Search bar */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none" placeholder="Tìm nguyên liệu, bán thành phẩm..." />
                        </div>

                        {/* Catalog Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {catalog.map(({ name, unit, price, icon }) => (
                                <div key={name} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-2xl">{icon}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Đơn vị: {unit}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-primary font-bold">{price}</span>
                                        <div className="flex items-center gap-2">
                                            {cart[name] > 0 && (
                                                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{cart[name]} {unit}</span>
                                            )}
                                            <button onClick={() => addToCart(name)} className="flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">add</span>Thêm
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {cartCount > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                                <h3 className="font-semibold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">shopping_cart</span>Đơn Hàng Của Bạn</h3>
                                <div className="flex flex-col gap-2 mb-4">
                                    {Object.entries(cart).filter(([, q]) => q > 0).map(([name, qty]) => {
                                        const item = catalog.find(c => c.name === name)
                                        return (
                                            <div key={name} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-sm font-medium">{name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-slate-500">{qty} {item?.unit}</span>
                                                    <button onClick={() => setCart(c => ({ ...c, [name]: Math.max(0, c[name] - 1) }))} className="text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">remove_circle</span></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Lưu Nháp</button>
                                    <button
                                        onClick={handleSubmitOrder}
                                        disabled={submitting}
                                        className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined text-[16px] mr-1 align-middle">send</span>Gửi Đơn Đặt Hàng
                                    </button>
                                </div>
                                {submitSuccess && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{submitSuccess}</p>}
                                {submitError && <p className="mt-3 text-sm text-red-600 dark:text-red-400 font-medium">{submitError}</p>}
                            </div>
                        )}
                    </>
                )}

                {/* TAB 1: My Orders */}
                {tab === 1 && (
                    <>
                        <div>
                            <h1 className="text-2xl font-bold">Đơn Hàng Của Tôi</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi trạng thái xử lý và giao hàng của các đơn đặt.</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                                <label className="flex-1">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tra cứu chi tiết theo Order ID</p>
                                    <input
                                        type="number"
                                        min="1"
                                        value={detailOrderId}
                                        onChange={(e) => setDetailOrderId(e.target.value)}
                                        placeholder="Ví dụ: 8"
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </label>
                                <button
                                    onClick={fetchOrderById}
                                    disabled={detailLoading}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {detailLoading ? 'Đang lấy...' : 'Fetch Chi Tiết'}
                                </button>
                            </div>
                            {detailError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{detailError}</p>}
                            {detailOrder && (
                                <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/40">
                                    <div className="flex flex-wrap gap-3 items-center justify-between">
                                        <p className="text-sm font-semibold">Order #{detailOrder.orderId || detailOrder.id}</p>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${orderStatusStyle[normalizeStatus(detailOrder.orderStatus || detailOrder.status)] || orderStatusStyle.Pending}`}>
                                            {normalizeStatus(detailOrder.orderStatus || detailOrder.status)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Expected delivery: {toReadableDate(detailOrder.expectedDeliveryDate)}</p>
                                    {normalizeStatus(detailOrder.orderStatus || detailOrder.status) !== 'Cancelled' && (
                                        <div className="mt-3">
                                            <button
                                                onClick={() => cancelOrderById(detailOrder.orderId || detailOrder.id)}
                                                disabled={cancelLoading}
                                                className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60"
                                            >
                                                {cancelLoading ? 'Đang hủy...' : 'Hủy Đơn Này'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="mt-3 text-sm">
                                        {(detailOrder.internalOrderDetails || detailOrder.orderDetails || []).length > 0 ? (
                                            (detailOrder.internalOrderDetails || detailOrder.orderDetails || []).map((row) => (
                                                <div key={row.detailId || `${row.productId}-${row.quantityOrdered}`} className="py-1.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0 flex items-center justify-between">
                                                    <span>Product #{row.productId}</span>
                                                    <span className="text-slate-600 dark:text-slate-300">Ordered: {row.quantityOrdered} | Confirmed: {row.quantityConfirmed} | Shipped: {row.quantityShipped}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-500 dark:text-slate-400">Đơn hàng chưa có chi tiết sản phẩm.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {ordersLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách đơn hàng...</p>}
                        {ordersError && <p className="text-sm text-red-600 dark:text-red-400">{ordersError}</p>}
                        {!ordersLoading && !ordersError && orders.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                                Chưa có đơn hàng nào từ API `/api/internal-orders`.
                            </div>
                        )}
                        <div className="flex flex-col gap-4">
                            {orders.map(order => (
                                <div key={order.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="font-bold text-base">{order.id}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.date} • {order.items} sản phẩm</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${order.statusStyle}`}>{order.status}</span>
                                            <button className="flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">visibility</span>Chi Tiết
                                            </button>
                                            {order.status === 'In Transit' && (
                                                <button onClick={() => setTab(0)} className="flex items-center gap-1 h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">fact_check</span>Xác Nhận Nhận Hàng
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Order progress bar */}
                                    <div className="mt-4">
                                        <div className="flex items-center gap-1">
                                            {['Đã đặt', 'Đang xử lý', 'Xuất kho', 'Đang giao', 'Đã nhận'].map((step, i) => {
                                                const statusMap = { Pending: 0, Confirmed: 1, Processing: 2, Shipped: 3, 'In Transit': 3, Delivered: 4 }
                                                const activeStep = statusMap[order.status] ?? 0
                                                const done = i <= activeStep
                                                return (
                                                    <div key={step} className="flex-1 flex items-center">
                                                        <div className="flex flex-col items-center gap-1 flex-1">
                                                            <div className={`size-5 rounded-full flex items-center justify-center text-[10px] ${done ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                                {done ? '✓' : i + 1}
                                                            </div>
                                                            <span className={`text-[9px] text-center leading-tight ${done ? 'text-primary font-medium' : 'text-slate-400'}`}>{step}</span>
                                                        </div>
                                                        {i < 4 && <div className={`h-0.5 flex-1 mx-1 ${done && i < activeStep ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* TAB 2: Store Inventory */}
                {tab === 2 && (
                    <>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">Tồn Kho Cửa Hàng</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Xem tồn kho hiện tại và cảnh báo hàng sắp hết tại cửa hàng.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-800">
                                    <span className="size-1.5 rounded-full bg-red-500" />2 mặt hàng cần đặt ngay
                                </div>
                                <button onClick={() => setTab(0)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>Đặt Thêm Hàng
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        {['Nguyên liệu / Bán thành phẩm', 'Tồn kho', 'Tối thiểu', 'Trạng thái', 'Hành động'].map(h => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {storeInventory.map(item => (
                                        <tr key={item.name} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${stockBg[item.status]}`}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400">{item.icon}</span>
                                                    <span className="font-medium text-sm">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-bold text-sm ${item.status === 'critical' ? 'text-red-600 dark:text-red-400' : item.status === 'low' ? 'text-amber-600 dark:text-amber-400' : ''}`}>{item.stock} {item.unit}</span>
                                                    <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        <div className={`h-full rounded-full ${statusColors[item.status]}`} style={{ width: `${Math.min(100, (item.stock / (item.min * 2)) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{item.min} {item.unit}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : item.status === 'low' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                    <span className={`size-1.5 rounded-full ${statusColors[item.status]}`} />
                                                    {item.status === 'critical' ? 'Cần đặt ngay' : item.status === 'low' ? 'Sắp hết' : 'Đủ hàng'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {item.status !== 'ok' && (
                                                    <button onClick={() => setTab(0)} className="flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
                                                        <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>Đặt thêm
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}
