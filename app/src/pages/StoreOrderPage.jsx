import { useEffect, useState } from 'react'

const storeInventory = [
    { name: 'All-Purpose Flour', unit: 'kg', stock: 45, min: 20, icon: 'grain', status: 'ok' },
    { name: 'Fresh Tomatoes', unit: 'kg', stock: 8, min: 15, icon: 'eco', status: 'low' },
    { name: 'Mozzarella Cheese', unit: 'kg', stock: 3, min: 10, icon: 'kitchen', status: 'critical' },
    { name: 'Tomato Sauce Base', unit: 'L', stock: 22, min: 10, icon: 'soup_kitchen', status: 'ok' },
    { name: 'Pizza Dough Base', unit: 'kg', stock: 12, min: 15, icon: 'bakery_dining', status: 'low' },
]

const fallbackStoreOptions = [{ id: 1, name: 'Store #1' }]
const fallbackProductOptions = [
    { id: 1, name: 'All-Purpose Flour' },
    { id: 2, name: 'Fresh Basil Leaves' },
    { id: 3, name: 'Pizza Dough Base' },
    { id: 4, name: 'House Burger Sauce' },
    { id: 5, name: 'Mozzarella Cheese' },
    { id: 6, name: 'Tomato Sauce Base' },
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
    const [showCreateOrderForm, setShowCreateOrderForm] = useState(false)
    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [ordersError, setOrdersError] = useState('')
    const [ordersStatusFilter, setOrdersStatusFilter] = useState('')
    const [detailOrderId, setDetailOrderId] = useState('')
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState('')
    const [detailOrder, setDetailOrder] = useState(null)
    const [cancelLoading, setCancelLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitSuccess, setSubmitSuccess] = useState('')
    const [lastCreatedOrderId, setLastCreatedOrderId] = useState(null)
    const [orderDetailRows, setOrderDetailRows] = useState([{ productId: '', quantityOrdered: '1' }])
    const [formStoreId, setFormStoreId] = useState(localStorage.getItem('store_id') || '1')
    const [storeOptions, setStoreOptions] = useState(fallbackStoreOptions)
    const [productOptions, setProductOptions] = useState(fallbackProductOptions)
    const [optionsLoading, setOptionsLoading] = useState(false)
    const [optionsError, setOptionsError] = useState('')
    const [formExpectedDeliveryDate, setFormExpectedDeliveryDate] = useState(() => {
        const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const offset = date.getTimezoneOffset() * 60 * 1000
        return new Date(date.getTime() - offset).toISOString().slice(0, 16)
    })

    const getStoreIdFromItem = (item) => Number(item?.storeId ?? item?.id)
    const getStoreNameFromItem = (item, id) => item?.storeName || item?.name || `Store #${id}`
    const getProductIdFromItem = (item) => Number(item?.productId ?? item?.id)
    const getProductNameFromItem = (item, id) => item?.productName || item?.name || `Product #${id}`

    const toOptionList = (rawData, getId, getName) => {
        const records = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData?.items)
                ? rawData.items
                : Array.isArray(rawData?.data)
                    ? rawData.data
                    : []

        return records
            .map((item) => {
                const id = getId(item)
                if (!id || id < 1) return null
                return { id, name: getName(item, id) }
            })
            .filter(Boolean)
    }

    const fetchDropdownOptions = async () => {
        setOptionsLoading(true)
        setOptionsError('')
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const headers = {
                accept: '*/*',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }

            const [storeRes, productRes] = await Promise.all([
                fetch(`${apiBase}/Organization/stores`, { method: 'GET', headers }),
                fetch(`${apiBase}/products`, { method: 'GET', headers }),
            ])

            const storesJson = await storeRes.json().catch(() => [])
            const productsJson = await productRes.json().catch(() => [])

            const stores = storeRes.ok ? toOptionList(storesJson, getStoreIdFromItem, getStoreNameFromItem) : []
            const products = productRes.ok ? toOptionList(productsJson, getProductIdFromItem, getProductNameFromItem) : []

            setStoreOptions(stores.length ? stores : fallbackStoreOptions)
            setProductOptions(products.length ? products : fallbackProductOptions)

            if (!storeRes.ok || !productRes.ok) {
                setOptionsError('Không tải đủ danh sách Store/Product từ API. Đang dùng dữ liệu tạm để nhập nhanh.')
            }
        } catch {
            setStoreOptions(fallbackStoreOptions)
            setProductOptions(fallbackProductOptions)
            setOptionsError('Không kết nối được API Store/Product. Đang dùng dữ liệu tạm.')
        } finally {
            setOptionsLoading(false)
        }
    }

    const createEmptyOrderDetailRow = () => ({
        productId: productOptions[0] ? String(productOptions[0].id) : '',
        quantityOrdered: '1',
    })

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

    const getStoreNameById = (storeId) => {
        const id = Number(storeId)
        if (!id || id < 1) return 'N/A'
        return storeOptions.find((s) => Number(s.id) === id)?.name || `Store #${id}`
    }

    const getProductNameById = (productId) => {
        const id = Number(productId)
        if (!id || id < 1) return 'N/A'
        return productOptions.find((p) => Number(p.id) === id)?.name || `Product #${id}`
    }

    const normalizeOrders = (rawOrders) => {
        if (!Array.isArray(rawOrders)) return []
        return rawOrders.map((item) => {
            const numericId = Number(item?.id || item?.internalOrderId || item?.orderId)
            if (!numericId || numericId < 1) return null

            const status = normalizeStatus(item?.status || item?.orderStatus)
            const orderDetails = Array.isArray(item?.orderDetails) ? item.orderDetails : Array.isArray(item?.internalOrderDetails) ? item.internalOrderDetails : []
            const productNames = Array.from(new Set(orderDetails.map((d) => d?.product?.productName || d?.product?.name || getProductNameById(d?.productId)).filter(Boolean)))
            const totalQuantity = orderDetails.reduce((sum, row) => sum + Number(row?.quantityOrdered || 0), 0)
            const productLabel = productNames.length === 0
                ? 'N/A'
                : productNames.length === 1
                    ? productNames[0]
                    : `${productNames[0]} +${productNames.length - 1}`
            return {
                id: `#${numericId}`,
                orderId: numericId,
                date: toReadableDate(item?.createdAt || item?.orderDate || item?.expectedDeliveryDate),
                items: orderDetails.length,
                totalQuantity,
                storeName: item?.store?.storeName || item?.store?.name || getStoreNameById(item?.storeId),
                productLabel,
                status,
                statusStyle: orderStatusStyle[status] || orderStatusStyle.Pending,
            }
        }).filter(Boolean)
    }

    const fetchMyOrders = async () => {
        setOrdersError('')
        setOrdersLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

            const params = new URLSearchParams()
            const parsedStoreId = Number(formStoreId)
            if (parsedStoreId > 0) {
                params.set('storeId', String(parsedStoreId))
            }
            if (ordersStatusFilter) {
                params.set('status', ordersStatusFilter)
            }

            const query = params.toString() ? `?${params.toString()}` : ''
            const response = await fetch(`${apiBase}/internal-orders${query}`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    const fetchOrderById = async (idArg) => {
        setDetailError('')
        setDetailOrder(null)

        const orderId = Number(idArg ?? detailOrderId)
        if (!orderId || orderId < 1) {
            setDetailError('Vui lòng nhập Order ID hợp lệ (số nguyên > 0).')
            return
        }

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

            setDetailLoading(true)
            const response = await fetch(`${apiBase}/internal-orders/${orderId}`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    const addOrderDetailRow = () => {
        setOrderDetailRows((prev) => [...prev, createEmptyOrderDetailRow()])
    }

    const removeOrderDetailRow = (index) => {
        setOrderDetailRows((prev) => prev.filter((_, i) => i !== index))
    }

    const updateOrderDetailRow = (index, key, value) => {
        setOrderDetailRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
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
    }, [tab, formStoreId, ordersStatusFilter])

    useEffect(() => {
        fetchDropdownOptions()
    }, [])

    useEffect(() => {
        if (!storeOptions.length) return
        const selectedStoreExists = storeOptions.some((item) => String(item.id) === String(formStoreId))
        if (!selectedStoreExists) {
            setFormStoreId(String(storeOptions[0].id))
        }
    }, [storeOptions, formStoreId])

    useEffect(() => {
        if (!productOptions.length) return
        setOrderDetailRows((prev) => prev.map((row) => {
            if (row.productId) return row
            return { ...row, productId: String(productOptions[0].id) }
        }))
    }, [productOptions])

    const handleSubmitOrder = async () => {
        setSubmitError('')
        setSubmitSuccess('')

        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (!token) {
            setSubmitError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại để gửi đơn hàng.')
            return
        }

        const orderDetails = orderDetailRows
            .map((row) => ({
                productId: Number(row.productId),
                quantityOrdered: Number(row.quantityOrdered),
                quantityConfirmed: 0,
                quantityShipped: 0,
            }))
            .filter((row) => row.productId > 0 && Number.isFinite(row.quantityOrdered) && row.quantityOrdered >= 0)

        if (!orderDetails.length) {
            setSubmitError('Vui lòng nhập ít nhất 1 dòng order detail hợp lệ (productId > 0 và quantityOrdered >= 0).')
            return
        }

        const parsedStoreId = Number(formStoreId)
        if (!parsedStoreId || parsedStoreId < 1) {
            setSubmitError('Store ID không hợp lệ. Vui lòng nhập số lớn hơn 0.')
            return
        }

        if (!formExpectedDeliveryDate) {
            setSubmitError('Vui lòng nhập Expected Delivery Date.')
            return
        }

        const payload = {
            storeId: parsedStoreId,
            expectedDeliveryDate: new Date(formExpectedDeliveryDate).toISOString(),
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
            const createdId = Number(data?.orderId || data?.id)
            if (createdId > 0) {
                setLastCreatedOrderId(createdId)
                setDetailOrderId(String(createdId))
                fetchOrderById(createdId)
            }
            setSubmitSuccess(orderCode ? `Tạo đơn hàng thành công: #${orderCode}` : 'Tạo đơn hàng thành công.')
            setOrderDetailRows([createEmptyOrderDetailRow()])
            setShowCreateOrderForm(false)
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
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Cổng Đặt Hàng Cửa Hàng</h2>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Chi nhánh #042</span>
                </div>
                <div className="flex flex-1 justify-end gap-6 items-center">
                    <nav className="hidden md:flex items-center gap-8">
                        {['Tạo Đơn Hàng', 'Danh Sách Đơn', 'Tồn Kho Cửa Hàng'].map((item, i) => (
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
                                <h1 className="text-2xl font-bold">Tạo Đơn Hàng Nội Bộ</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Bấm nút bên dưới để mở form tạo đơn. Đã bỏ giỏ hàng và phần nhập trùng để tránh rối dữ liệu.</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold">Tạo đơn hàng theo biểu mẫu</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Chỉ còn một form duy nhất: Store ID, ngày giao dự kiến và danh sách sản phẩm theo Product ID.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSubmitError('')
                                    setSubmitSuccess('')
                                    fetchDropdownOptions()
                                    setShowCreateOrderForm(true)
                                }}
                                className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90"
                            >
                                + Tạo Đơn Hàng
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-sm font-semibold">Danh sách sản phẩm</p>
                            </div>
                            <table className="w-full min-w-[680px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã</th>
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên sản phẩm</th>
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {productOptions.length > 0 ? (
                                        productOptions.map((product) => (
                                            <tr key={product.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-2 text-sm font-semibold">#{product.id}</td>
                                                <td className="px-4 py-2 text-sm">{product.name}</td>
                                                <td className="px-4 py-2 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateOrderForm(true)}
                                                        className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    >
                                                        Tạo đơn
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Chưa có dữ liệu sản phẩm.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {submitSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{submitSuccess}</p>}
                        {submitError && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{submitError}</p>}

                        {showCreateOrderForm && (
                            <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                                <div className="w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <p className="text-base font-semibold">Form Tạo Đơn Hàng</p>
                                        <button
                                            onClick={() => setShowCreateOrderForm(false)}
                                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            Đóng
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                        <label className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chọn cửa hàng</span>
                                            <select
                                                value={formStoreId}
                                                onChange={(e) => setFormStoreId(e.target.value)}
                                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                {storeOptions.map((store) => (
                                                    <option key={store.id} value={String(store.id)}>{store.name} (#{store.id})</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ngày giờ giao dự kiến</span>
                                            <input
                                                type="datetime-local"
                                                value={formExpectedDeliveryDate}
                                                onChange={(e) => setFormExpectedDeliveryDate(e.target.value)}
                                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </label>
                                    </div>

                                    <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold">Chi tiết đơn hàng</p>
                                            <button
                                                type="button"
                                                onClick={addOrderDetailRow}
                                                className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                + Thêm dòng sản phẩm
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {orderDetailRows.map((row, index) => (
                                                <div key={`detail-row-${index}`} className="grid grid-cols-12 gap-2 items-end">
                                                    <label className="col-span-5 flex flex-col gap-1">
                                                        <span className="text-[11px] text-slate-500">Chọn sản phẩm</span>
                                                        <select
                                                            value={row.productId}
                                                            onChange={(e) => updateOrderDetailRow(index, 'productId', e.target.value)}
                                                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                                        >
                                                            {productOptions.map((product) => (
                                                                <option key={product.id} value={String(product.id)}>{product.name} (#{product.id})</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className="col-span-5 flex flex-col gap-1">
                                                        <span className="text-[11px] text-slate-500">Số lượng đặt</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={row.quantityOrdered}
                                                            onChange={(e) => updateOrderDetailRow(index, 'quantityOrdered', e.target.value)}
                                                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                                        />
                                                    </label>
                                                    <div className="col-span-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOrderDetailRow(index)}
                                                            disabled={orderDetailRows.length === 1}
                                                            className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {(optionsLoading || optionsError) && (
                                        <div className="mb-3 text-xs">
                                            {optionsLoading && <p className="text-slate-500 dark:text-slate-400">Đang tải danh sách Store/Product...</p>}
                                            {optionsError && <p className="text-amber-600 dark:text-amber-400">{optionsError}</p>}
                                        </div>
                                    )}

                                    <div className="flex gap-3 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setOrderDetailRows([createEmptyOrderDetailRow()])}
                                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Xóa Mẫu Nhập
                                        </button>
                                        <button
                                            onClick={handleSubmitOrder}
                                            disabled={submitting}
                                            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
                                        >
                                            <span className="material-symbols-outlined text-[16px] mr-1 align-middle">send</span>{submitting ? 'Đang tạo đơn...' : 'Tạo Đơn Hàng'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* TAB 1: My Orders */}
                {tab === 1 && (
                    <>
                        <div>
                            <h1 className="text-2xl font-bold">Danh Sách Đơn Hàng</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Xem đơn theo mã cửa hàng và trạng thái để quản lý/hủy nhanh.</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lọc theo cửa hàng</span>
                                    <select
                                        value={formStoreId}
                                        onChange={(e) => setFormStoreId(e.target.value)}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    >
                                        {storeOptions.map((store) => (
                                            <option key={store.id} value={String(store.id)}>{store.name} (#{store.id})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lọc theo trạng thái (tùy chọn)</span>
                                    <select
                                        value={ordersStatusFilter}
                                        onChange={(e) => setOrdersStatusFilter(e.target.value)}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    >
                                        <option value="">All</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="APPROVED">APPROVED</option>
                                        <option value="PROCESSING">PROCESSING</option>
                                        <option value="SHIPPING">SHIPPING</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                        <option value="REJECTED">REJECTED</option>
                                    </select>
                                </label>
                                <button
                                    onClick={fetchMyOrders}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90"
                                >
                                    Tải Danh Sách
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">Danh sách đơn (dạng bảng)</p>
                                {detailLoading && <p className="text-xs text-slate-500 dark:text-slate-400">Đang tải chi tiết đơn...</p>}
                            </div>
                        </div>
                        {ordersLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách đơn hàng...</p>}
                        {ordersError && <p className="text-sm text-red-600 dark:text-red-400">{ordersError}</p>}
                        {detailError && <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>}
                        {!ordersLoading && !ordersError && orders.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                                Không có đơn hàng nào phù hợp bộ lọc hiện tại.
                                {lastCreatedOrderId && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => {
                                                setDetailOrderId(String(lastCreatedOrderId))
                                                fetchOrderById(lastCreatedOrderId)
                                            }}
                                            className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                                        >
                                            Xem ngay đơn vừa tạo #{lastCreatedOrderId}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {!ordersLoading && !ordersError && orders.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                                <table className="w-full min-w-[720px] text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cửa hàng</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Số lượng</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-5 py-3 text-sm font-semibold">{order.id}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{order.storeName}</td>
                                                <td className="px-5 py-3 text-sm">{order.productLabel}</td>
                                                <td className="px-5 py-3 text-sm">{order.totalQuantity}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${order.statusStyle}`}>{order.status}</span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const selectedId = Number(order.orderId || String(order.id || '').replace('#', ''))
                                                                if (selectedId > 0) {
                                                                    setDetailOrderId(String(selectedId))
                                                                    fetchOrderById(selectedId)
                                                                }
                                                            }}
                                                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                        </button>
                                                        {order.status !== 'Cancelled' && (
                                                            <button
                                                                onClick={() => cancelOrderById(order.orderId)}
                                                                disabled={cancelLoading}
                                                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                                                                title="Hủy đơn"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {detailOrder && (
                            <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                                <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <p className="text-base font-semibold">Chi tiết đơn #{detailOrder.orderId || detailOrder.id}</p>
                                        <button
                                            onClick={() => {
                                                setDetailOrder(null)
                                                setDetailError('')
                                            }}
                                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            Đóng
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${orderStatusStyle[normalizeStatus(detailOrder.orderStatus || detailOrder.status)] || orderStatusStyle.Pending}`}>
                                            {normalizeStatus(detailOrder.orderStatus || detailOrder.status)}
                                        </span>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Ngày giao dự kiến: {toReadableDate(detailOrder.expectedDeliveryDate)}</p>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                                        <p><span className="font-semibold">Cửa hàng:</span> {detailOrder?.store?.storeName || detailOrder?.store?.name || getStoreNameById(detailOrder?.storeId)}</p>
                                        <p><span className="font-semibold">Ngày tạo:</span> {toReadableDate(detailOrder.createdAt)}</p>
                                    </div>
                                    {normalizeStatus(detailOrder.orderStatus || detailOrder.status) !== 'Cancelled' && (
                                        <div className="mt-3">
                                            <button
                                                onClick={() => cancelOrderById(detailOrder.orderId || detailOrder.id)}
                                                disabled={cancelLoading}
                                                className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60"
                                            >
                                                {cancelLoading ? 'Đang hủy đơn...' : 'Hủy Đơn Hàng Này'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đặt</th>
                                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Xác nhận</th>
                                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã giao</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {(detailOrder.internalOrderDetails || detailOrder.orderDetails || []).length > 0 ? (
                                                    (detailOrder.internalOrderDetails || detailOrder.orderDetails || []).map((row) => (
                                                        <tr key={row.detailId || `${row.productId}-${row.quantityOrdered}`}>
                                                            <td className="px-4 py-2 text-sm">{row?.product?.productName || row?.product?.name || getProductNameById(row.productId)}</td>
                                                            <td className="px-4 py-2 text-sm">{row.quantityOrdered}</td>
                                                            <td className="px-4 py-2 text-sm">{row.quantityConfirmed}</td>
                                                            <td className="px-4 py-2 text-sm">{row.quantityShipped}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Đơn hàng chưa có chi tiết sản phẩm.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
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
