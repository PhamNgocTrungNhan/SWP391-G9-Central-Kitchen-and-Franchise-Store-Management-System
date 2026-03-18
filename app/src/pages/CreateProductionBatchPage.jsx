import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

function getToken() {
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

function parseArrayData(raw) {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.items)) return raw.items
    if (Array.isArray(raw?.data)) return raw.data
    return []
}

function parseSafeNumber(value, fallback = 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function parseIdFromLocationHeader(locationValue) {
    if (!locationValue) return 0
    const matched = String(locationValue).match(/\/(\d+)(?:\?.*)?$/)
    if (!matched) return 0
    const parsed = Number(matched[1])
    return Number.isFinite(parsed) ? parsed : 0
}

function normalizeOrderStatus(rawStatus) {
    const status = String(rawStatus || '').toUpperCase()
    if (status === 'APPROVED') return 'Approved'
    if (status === 'PENDING') return 'Pending'
    if (status === 'CONFIRMED') return 'Confirmed'
    if (status === 'PROCESSING') return 'Processing'
    if (status === 'SHIPPED') return 'Shipped'
    if (status === 'DELIVERED' || status === 'COMPLETED') return 'Delivered'
    if (status === 'CANCELLED') return 'Cancelled'
    if (status === 'REJECTED') return 'Rejected'
    return rawStatus || 'Pending'
}

export default function CreateProductionBatchPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [mode, setMode] = useState('order')
    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [products, setProducts] = useState([])
    const [productsLoading, setProductsLoading] = useState(false)

    const [selectedOrderId, setSelectedOrderId] = useState('')
    const [selectedOrderDetailKey, setSelectedOrderDetailKey] = useState('')

    const [productId, setProductId] = useState('')
    const [quantityPlanned, setQuantityPlanned] = useState('1')
    const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().slice(0, 16))
    const [autoCompleteBatch, setAutoCompleteBatch] = useState(true)
    const [autoTransferOrder, setAutoTransferOrder] = useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const toastMessage = error || success
    const toastType = error ? 'error' : (success ? 'success' : '')
    const closeToast = () => {
        setError('')
        setSuccess('')
    }

    useEffect(() => {
        if (!toastMessage) return undefined

        const timer = window.setTimeout(() => {
            closeToast()
        }, 2800)

        return () => window.clearTimeout(timer)
    }, [toastMessage])

    const selectedOrder = useMemo(() => {
        const id = Number(selectedOrderId)
        if (!id) return null
        return orders.find((order) => Number(order.orderId) === id) || null
    }, [orders, selectedOrderId])

    const selectedOrderDetails = selectedOrder?.details || []

    const selectedOrderDetail = useMemo(() => {
        if (!selectedOrderDetailKey) return null
        return selectedOrderDetails.find((detail) => detail.key === selectedOrderDetailKey) || null
    }, [selectedOrderDetails, selectedOrderDetailKey])

    const selectedProductName = useMemo(() => {
        const id = Number(productId)
        if (!id) return 'N/A'
        return products.find((product) => Number(product.id) === id)?.name || `Product #${id}`
    }, [products, productId])

    const manualDemandStats = useMemo(() => {
        const aggregate = new Map()

        orders.forEach((order) => {
            ;(order.details || []).forEach((detail) => {
                const id = Number(detail.productId)
                if (!id) return

                const qty = Math.max(0, Number(detail.quantityOrdered || 0))
                const existing = aggregate.get(id) || {
                    productId: id,
                    productName: detail.productName || `Product #${id}`,
                    quantityNeeded: 0,
                    orderCount: 0,
                }

                existing.quantityNeeded += qty
                existing.orderCount += 1
                aggregate.set(id, existing)
            })
        })

        const productsNeeded = Array.from(aggregate.values())
            .sort((a, b) => b.quantityNeeded - a.quantityNeeded)

        return {
            totalProductTypes: productsNeeded.length,
            totalQuantityNeeded: productsNeeded.reduce((sum, item) => sum + item.quantityNeeded, 0),
            topProducts: productsNeeded.slice(0, 5),
        }
    }, [orders])

    const fetchProducts = async () => {
        const tk = getToken()
        setProductsLoading(true)
        try {
            const response = await fetch(`${apiBase}/products`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách sản phẩm.')
            }

            const normalized = parseArrayData(data)
                .map((item) => {
                    const id = parseSafeNumber(item?.productId ?? item?.id, 0)
                    if (!id) return null
                    return {
                        id,
                        name: item?.productName || item?.name || `Product #${id}`,
                    }
                })
                .filter(Boolean)

            setProducts(normalized)
            if (!productId && normalized.length > 0) {
                setProductId(String(normalized[0].id))
            }
        } catch (requestError) {
            setProducts([])
            setError(requestError.message || 'Tải sản phẩm thất bại.')
        } finally {
            setProductsLoading(false)
        }
    }

    const normalizeOrderRow = (item, productMap) => {
        const orderId = parseSafeNumber(item?.orderId ?? item?.internalOrderId ?? item?.id, 0)
        if (!orderId) return null

        const detailsRaw = Array.isArray(item?.internalOrderDetails)
            ? item.internalOrderDetails
            : Array.isArray(item?.orderDetails)
                ? item.orderDetails
                : []

        const details = detailsRaw
            .map((row, idx) => {
                const detailProductId = parseSafeNumber(row?.productId, 0)
                const detailQty = parseSafeNumber(row?.quantityOrdered, 0)
                if (!detailProductId || detailQty <= 0) return null
                return {
                    key: `${orderId}-${detailProductId}-${idx}`,
                    productId: detailProductId,
                    productName: row?.product?.productName || row?.product?.name || productMap[detailProductId] || `Product #${detailProductId}`,
                    quantityOrdered: detailQty,
                }
            })
            .filter(Boolean)

        return {
            orderId,
            orderCode: item?.orderCode || `#${orderId}`,
            status: normalizeOrderStatus(item?.orderStatus || item?.status),
            storeId: parseSafeNumber(item?.storeId ?? item?.store?.storeId ?? item?.store?.id, 0),
            storeName: item?.store?.storeName || item?.store?.name || `Store #${item?.storeId || 'N/A'}`,
            details,
        }
    }

    const fetchApprovedOrders = async () => {
        const tk = getToken()
        if (!tk) {
            setOrders([])
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setOrdersLoading(true)
        try {
            const productMap = products.reduce((acc, product) => {
                acc[Number(product.id)] = product.name
                return acc
            }, {})

            const response = await fetch(`${apiBase}/internal-orders?status=APPROVED`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách đơn Approved.')
            }

            const baseOrders = parseArrayData(data)
                .map((item) => normalizeOrderRow(item, productMap))
                .filter(Boolean)
                .filter((order) => order.status === 'Approved')

            const hydratedOrders = await Promise.all(baseOrders.map(async (order) => {
                if (Array.isArray(order.details) && order.details.length > 0) return order

                const detailRes = await fetch(`${apiBase}/internal-orders/${order.orderId}`, {
                    method: 'GET',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                    },
                })

                const detailJson = await detailRes.json().catch(() => ({}))
                if (!detailRes.ok) return order

                return normalizeOrderRow(detailJson, productMap) || order
            }))

            const finalOrders = hydratedOrders.filter((order) => Array.isArray(order.details) && order.details.length > 0)
            setOrders(finalOrders)

            if (!selectedOrderId && finalOrders.length > 0) {
                setSelectedOrderId(String(finalOrders[0].orderId))
            }
        } catch (requestError) {
            setOrders([])
            setError(requestError.message || 'Tải đơn Approved thất bại.')
        } finally {
            setOrdersLoading(false)
        }
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    useEffect(() => {
        if (!products.length) return
        fetchApprovedOrders()
    }, [products.length])

    useEffect(() => {
        if (!selectedOrder || mode !== 'order') return

        const first = selectedOrder.details?.[0]
        if (!first) {
            setSelectedOrderDetailKey('')
            return
        }

        setSelectedOrderDetailKey((prev) => {
            if (prev && selectedOrder.details.some((detail) => detail.key === prev)) return prev
            return first.key
        })
    }, [selectedOrder, mode])

    useEffect(() => {
        if (mode !== 'order' || !selectedOrderDetail) return
        setProductId(String(selectedOrderDetail.productId))
        setQuantityPlanned(String(Math.max(1, Number(selectedOrderDetail.quantityOrdered || 1))))
    }, [mode, selectedOrderDetail])

    const handleCreate = async (event) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        const tk = getToken()
        if (!tk) {
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const pid = Number(productId)
        const qty = Number(quantityPlanned)
        if (!pid || pid < 1 || !Number.isFinite(qty) || qty < 1) {
            setError('Mã sản phẩm và số lượng kế hoạch phải lớn hơn 0.')
            return
        }

        if (!mfgDate) {
            setError('Vui lòng nhập ngày sản xuất.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${apiBase}/ProductionBatches`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: pid,
                    quantityPlanned: qty,
                    mfgDate: new Date(mfgDate).toISOString(),
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tạo mẻ sản xuất.')
            }

            const locationHeader = response.headers.get('Location') || response.headers.get('location') || response.headers.get('Content-Location') || response.headers.get('content-location')
            const headerBatchId = parseIdFromLocationHeader(locationHeader)
            const createdBatchId = Number(data?.productionBatchId ?? data?.batchId ?? data?.id ?? headerBatchId ?? 0)

            if (autoCompleteBatch && createdBatchId > 0) {
                const completeRes = await fetch(`${apiBase}/ProductionBatches/${createdBatchId}/status`, {
                    method: 'PUT',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'COMPLETED', quantityActual: qty }),
                })
                const completeData = await completeRes.json().catch(() => ({}))
                if (!completeRes.ok) {
                    throw new Error(completeData?.message || completeData?.title || 'Tạo mẻ thành công nhưng không thể chuyển COMPLETED để cộng tồn kho.')
                }
            }

            if (autoTransferOrder && mode === 'order' && selectedOrderId) {
                const transferRes = await fetch(`${apiBase}/Inventory/transfer/${encodeURIComponent(selectedOrderId)}`, {
                    method: 'POST',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                    },
                })
                const transferData = await transferRes.json().catch(() => ({}))
                if (!transferRes.ok) {
                    throw new Error(transferData?.message || transferData?.title || 'Tạo mẻ thành công nhưng không thể xuất kho theo đơn đã chọn.')
                }
            }

            const modeLabel = mode === 'order' ? 'từ đơn Approved' : 'thủ công'
            const inventoryHint = autoCompleteBatch
                ? ' Đã gửi chuyển trạng thái COMPLETED để backend cộng tồn kho thành phẩm.'
                : ''
            const transferHint = autoTransferOrder && mode === 'order'
                ? ' Đã gọi xuất kho theo đơn để backend trừ/chuyển tồn kho.'
                : ''

            setSuccess((data?.message || 'Tạo mẻ sản xuất thành công.') + ` (Nguồn: ${modeLabel}).` + inventoryHint + transferHint)
        } catch (requestError) {
            setError(requestError.message || 'Tạo mẻ sản xuất thất bại.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {toastMessage ? (
                <div className="fixed top-4 right-4 z-[80] pointer-events-none">
                    <div className="pointer-events-auto w-[min(92vw,24rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <div className="px-4 py-3 flex items-start gap-3">
                            <span className={`material-symbols-outlined mt-0.5 ${toastType === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {toastType === 'success' ? 'check_circle' : 'error'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{toastType === 'success' ? 'Thao tác thành công' : 'Có lỗi xảy ra'}</p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">{toastMessage}</p>
                            </div>
                            <button
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={closeToast}
                                aria-label="Đóng thông báo"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div className={`h-1 rounded-b-xl ${toastType === 'success' ? 'bg-emerald-500/80' : 'bg-red-500/80'}`} />
                    </div>
                </div>
            ) : null}

            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">precision_manufacturing</span>
                    <h2 className="text-lg font-bold leading-tight">Tạo mẻ sản xuất</h2>
                </div>
                <Link
                    to="/inventory"
                    className="flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Quay lại tồn kho
                </Link>
            </header>

            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
                <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                        Tạo mẻ riêng khỏi trang tồn kho. Bạn có thể tạo từ đơn Approved hoặc tạo mới thủ công.
                    </p>

                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setMode('order')}
                            className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${mode === 'order' ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            Tạo từ đơn Approved
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${mode === 'manual' ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            Tạo mới thủ công
                        </button>
                    </div>

                    {mode === 'order' ? (
                        <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-sm font-semibold mb-3">Nguồn đơn hàng Approved</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đơn hàng</span>
                                    <select
                                        value={selectedOrderId}
                                        onChange={(e) => setSelectedOrderId(e.target.value)}
                                        className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                        disabled={ordersLoading || orders.length === 0}
                                    >
                                        {orders.length === 0 ? <option value="">Không có đơn Approved</option> : null}
                                        {orders.map((order) => (
                                            <option key={order.orderId} value={String(order.orderId)}>
                                                {order.orderCode} - {order.storeName}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dòng sản phẩm trong đơn</span>
                                    <select
                                        value={selectedOrderDetailKey}
                                        onChange={(e) => setSelectedOrderDetailKey(e.target.value)}
                                        className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                        disabled={!selectedOrder || selectedOrderDetails.length === 0}
                                    >
                                        {selectedOrderDetails.length === 0 ? <option value="">Đơn chưa có chi tiết</option> : null}
                                        {selectedOrderDetails.map((detail) => (
                                            <option key={detail.key} value={detail.key}>
                                                {detail.productName} - SL đặt: {detail.quantityOrdered}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                Khi chọn dòng đơn, sản phẩm và số lượng kế hoạch bên dưới sẽ tự điền theo đơn.
                            </p>
                        </div>
                    ) : null}

                    {mode === 'manual' ? (
                        <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-sm font-semibold mb-3">Thống kê nhu cầu tạo mẻ thủ công (từ đơn Approved)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Tổng sản phẩm cần tạo</p>
                                    <p className="mt-1 text-xl font-bold">{manualDemandStats.totalProductTypes}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Tổng số lượng cần tạo</p>
                                    <p className="mt-1 text-xl font-bold">{manualDemandStats.totalQuantityNeeded}</p>
                                </div>
                            </div>

                            {manualDemandStats.topProducts.length > 0 ? (
                                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">SL cần tạo</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {manualDemandStats.topProducts.map((item) => (
                                                <tr key={item.productId}>
                                                    <td className="px-3 py-2 text-sm">{item.productName}</td>
                                                    <td className="px-3 py-2 text-sm font-semibold">{item.quantityNeeded}</td>
                                                    <td className="px-3 py-2 text-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setProductId(String(item.productId))
                                                                setQuantityPlanned(String(Math.max(1, Number(item.quantityNeeded || 1))))
                                                            }}
                                                            className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
                                                        >
                                                            Tạo nhanh
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Hiện chưa có dữ liệu đơn Approved để thống kê nhu cầu tạo mẻ.</p>
                            )}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tên sản phẩm</span>
                            <select
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                disabled={productsLoading || products.length === 0}
                            >
                                {products.length === 0 ? <option value="">Không có sản phẩm</option> : null}
                                {products.map((product) => (
                                    <option key={product.id} value={String(product.id)}>{product.name}</option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Số lượng kế hoạch</span>
                            <input
                                type="number"
                                min="1"
                                value={quantityPlanned}
                                onChange={(e) => setQuantityPlanned(e.target.value)}
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ngày sản xuất</span>
                            <input
                                type="datetime-local"
                                value={mfgDate}
                                onChange={(e) => setMfgDate(e.target.value)}
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                            />
                        </label>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                        <p className="text-sm font-semibold">Tùy chọn nghiệp vụ tồn kho</p>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={autoCompleteBatch}
                                onChange={(e) => setAutoCompleteBatch(e.target.checked)}
                            />
                            Tự chuyển trạng thái mẻ sang COMPLETED sau khi tạo (để backend cộng tồn kho thành phẩm)
                        </label>
                        {mode === 'order' ? (
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={autoTransferOrder}
                                    onChange={(e) => setAutoTransferOrder(e.target.checked)}
                                />
                                Tự xuất kho theo đơn đã chọn sau khi tạo (backend sẽ trừ/chuyển tồn kho)
                            </label>
                        ) : null}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Sản phẩm hiện tại: {selectedProductName}
                        </p>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                        >
                            {loading ? 'Đang tạo...' : 'Tạo mẻ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
