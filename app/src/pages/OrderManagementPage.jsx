import { Fragment, useEffect, useMemo, useState } from 'react'

const statusStyle = {
    Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    Approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    Confirmed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    Processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Produced: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    PartialShipping: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
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
    PartialShipping: 'Giao một phần',
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
    PARTIAL_SHIPPING: 'PartialShipping',
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
    if (normalized === 'Shipped' || normalized === 'PartialShipping') return true

    const upper = raw.toUpperCase().replace(/[\s-]+/g, '_')
    return upper === 'SHIPPING'
        || upper === 'PARTIAL_SHIPPING'
        || upper === 'IN_TRANSIT'
        || upper === 'INTRANSIT'
        || upper === 'DELIVERING'
        || upper === 'ON_THE_WAY'
        || upper === 'GIAO_MOT_PHAN'
        || raw === 'Đang giao'
        || raw === 'Giao một phần'
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
    const [storeNameMap, setStoreNameMap] = useState({})
    const [productNameMap, setProductNameMap] = useState({})
    const [productPriceMap, setProductPriceMap] = useState({})
    const [kitchenStockByProduct, setKitchenStockByProduct] = useState({})
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState('All')
    const [expandedId, setExpandedId] = useState(null)
    const [actionLoadingId, setActionLoadingId] = useState(null)
    const [shipLoadingId, setShipLoadingId] = useState(null)
    const [cancelLoadingId, setCancelLoadingId] = useState(null)
    const [detailLoadingId, setDetailLoadingId] = useState(null)
    const [shipDraftByOrder, setShipDraftByOrder] = useState({})
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

    const toNumber = (value, fallback = 0) => {
        const n = Number(value)
        return Number.isFinite(n) ? n : fallback
    }

    const parseArrayData = (raw) => {
        if (Array.isArray(raw)) return raw
        if (Array.isArray(raw?.items)) return raw.items
        if (Array.isArray(raw?.data)) return raw.data
        return []
    }

    const firstPositiveNumber = (...candidates) => {
        for (const candidate of candidates) {
            const value = toNumber(candidate, 0)
            if (value > 0) return value
        }
        return 0
    }

    const extractStoreId = (item) => toNumber(
        item?.storeId
        ?? item?.StoreId
        ?? item?.storeID
        ?? item?.store_id
        ?? item?.store?.storeId
        ?? item?.store?.StoreId
        ?? item?.store?.id,
        0,
    )

    const extractStoreName = (item) => {
        const raw = item?.storeName
            ?? item?.StoreName
            ?? item?.store?.storeName
            ?? item?.store?.StoreName
            ?? item?.store?.name

        if (typeof raw !== 'string') return ''
        return raw.trim()
    }

    const resolveStoreMeta = (item, nameMap = {}) => {
        const storeId = extractStoreId(item)
        const directStoreName = extractStoreName(item)
        if (directStoreName) {
            return { storeId, storeName: directStoreName }
        }

        const mappedName = storeId > 0 ? String(nameMap?.[storeId] || '').trim() : ''
        if (mappedName) {
            return { storeId, storeName: mappedName }
        }

        if (storeId > 0) {
            return { storeId, storeName: `Cửa hàng (ID: ${storeId})` }
        }

        return { storeId: 0, storeName: 'Cửa hàng chưa có tên' }
    }

    const getDetailQuantity = (row) => toNumber(
        row?.quantityOrdered
        ?? row?.quantity
        ?? row?.qty
        ?? row?.quantityConfirmed
        ?? row?.quantityShipped,
        0,
    )

    const getDetailConfirmed = (row) => toNumber(row?.quantityConfirmed, 0)
    const getDetailShipped = (row) => toNumber(row?.quantityShipped, 0)
    const getDetailTarget = (row) => {
        const confirmed = getDetailConfirmed(row)
        return confirmed > 0 ? confirmed : getDetailQuantity(row)
    }

    const deriveShippingStatusFromDetails = (baseStatus, details) => {
        const terminalStatuses = new Set(['Delivered', 'Cancelled', 'Rejected', 'Returned'])
        if (terminalStatuses.has(baseStatus)) return baseStatus
        if (!Array.isArray(details) || details.length === 0) return baseStatus

        const totals = details.reduce((acc, row) => {
            acc.target += getDetailTarget(row)
            acc.shipped += getDetailShipped(row)
            return acc
        }, { target: 0, shipped: 0 })

        if (totals.shipped <= 0) return baseStatus
        if (totals.target <= 0) return 'Shipped'
        if (totals.shipped >= totals.target) return 'Shipped'
        return 'PartialShipping'
    }

    const getRemainingToShip = (row) => {
        const remaining = getDetailTarget(row) - getDetailShipped(row)
        return remaining > 0 ? remaining : 0
    }

    const getKitchenStockByProductId = (productId) => {
        const numericProductId = Number(productId)
        if (!numericProductId) return null
        if (!Object.prototype.hasOwnProperty.call(kitchenStockByProduct, numericProductId)) return null
        return toNumber(kitchenStockByProduct[numericProductId], 0)
    }

    const getMaxShippableNow = (row) => {
        const remaining = getRemainingToShip(row)
        const stockQty = getKitchenStockByProductId(row?.productId)
        if (stockQty === null) return remaining
        return Math.max(0, Math.min(remaining, stockQty))
    }

    const getDetailUnitPrice = (row) => {
        const explicitUnitPrice = firstPositiveNumber(
            row?.unitPrice,
            row?.price,
            row?.internalPrice,
            row?.unit_price,
            row?.unitprice,
            row?.product?.internalPrice,
            row?.product?.price,
            row?.product?.unitPrice,
        )
        if (explicitUnitPrice > 0) return explicitUnitPrice

        const productId = toNumber(row?.productId, 0)
        const priceFromProductMap = productId > 0 ? toNumber(productPriceMap[productId], 0) : 0
        if (priceFromProductMap > 0) return priceFromProductMap

        const lineAmount = firstPositiveNumber(
            row?.lineTotal,
            row?.lineAmount,
            row?.subtotal,
            row?.subTotal,
            row?.totalAmount,
            row?.totalPrice,
            row?.amount,
        )
        const quantity = getDetailQuantity(row)
        if (lineAmount > 0 && quantity > 0) {
            return lineAmount / quantity
        }

        return 0
    }

    const getDetailSubtotal = (row) => {
        const explicitLineAmount = firstPositiveNumber(
            row?.lineTotal,
            row?.lineAmount,
            row?.subtotal,
            row?.subTotal,
            row?.totalAmount,
            row?.totalPrice,
            row?.amount,
        )
        if (explicitLineAmount > 0) return explicitLineAmount

        return getDetailUnitPrice(row) * getDetailQuantity(row)
    }

    const updateShipDraftValue = (orderId, productId, value) => {
        const numericOrderId = Number(orderId)
        const numericProductId = Number(productId)
        if (!numericOrderId || !numericProductId) return

        setShipDraftByOrder((prev) => ({
            ...prev,
            [numericOrderId]: {
                ...(prev[numericOrderId] || {}),
                [numericProductId]: value,
            },
        }))
    }

    const clearShipDraft = (orderId) => {
        const numericOrderId = Number(orderId)
        if (!numericOrderId) return

        setShipDraftByOrder((prev) => {
            if (!prev[numericOrderId]) return prev
            const next = { ...prev }
            delete next[numericOrderId]
            return next
        })
    }

    const buildShipPartialPayload = (order) => {
        const numericOrderId = Number(order?.orderId)
        const detailRows = Array.isArray(order?.details) ? order.details : []
        const draftRows = shipDraftByOrder[numericOrderId] || {}
        const payload = []

        for (const row of detailRows) {
            const productId = Number(row?.productId)
            if (!productId) continue

            const draftValue = String(draftRows[productId] ?? '').trim()
            if (!draftValue) continue

            const quantityToShip = Number(draftValue)
            if (!Number.isFinite(quantityToShip) || quantityToShip <= 0) {
                return { error: `Sản phẩm chưa có tên: số lượng giao phải lớn hơn 0.` }
            }

            if (quantityToShip < 0.01 || quantityToShip > 999999) {
                return { error: `Sản phẩm chưa có tên: số lượng giao phải trong khoảng 0.01 đến 999999.` }
            }

            const remaining = getRemainingToShip(row)
            if (remaining <= 0) {
                continue
            }

            const stockQty = getKitchenStockByProductId(productId)
            if (stockQty !== null && quantityToShip > stockQty) {
                return { error: `Sản phẩm chưa có tên: tồn kho bếp không đủ (${stockQty}).` }
            }

            if (quantityToShip > remaining) {
                return { error: `Sản phẩm chưa có tên: vượt số lượng còn lại (${remaining}).` }
            }

            payload.push({ productId, quantityToShip })
        }

        if (!payload.length) {
            return { error: 'Vui lòng nhập ít nhất 1 sản phẩm có số lượng giao hợp lệ.' }
        }

        return { payload }
    }

    useEffect(() => {
        if (!notice.open) return undefined

        const timer = window.setTimeout(() => {
            setNotice((prev) => ({ ...prev, open: false }))
        }, 2800)

        return () => window.clearTimeout(timer)
    }, [notice.open, notice.message])

    const normalizeOrders = (rawOrders, nameMap = storeNameMap) => {
        if (!Array.isArray(rawOrders)) return []

        return rawOrders
            .map((item) => {
                const orderId = Number(item?.orderId || item?.internalOrderId || item?.id)
                if (!orderId) return null
                const { storeId, storeName } = resolveStoreMeta(item, nameMap)

                const rawStatus = normalizeStatus(item?.orderStatus || item?.status)
                const details = Array.isArray(item?.internalOrderDetails)
                    ? item.internalOrderDetails
                    : Array.isArray(item?.orderDetails)
                        ? item.orderDetails
                        : []
                const status = deriveShippingStatusFromDetails(rawStatus, details)

                const itemCount = details.length
                const totalQty = details.reduce((sum, row) => sum + getDetailQuantity(row), 0)

                // Calculate totalAmount from details if not provided by backend
                let totalAmount = item?.totalAmount || 0
                if (!totalAmount && details.length > 0) {
                    totalAmount = details.reduce((sum, row) => sum + getDetailSubtotal(row), 0)
                }

                return {
                    orderId,
                    orderCode: item?.orderCode || `#${orderId}`,
                    storeId,
                    storeName,
                    createdAt: toReadableDate(item?.createdAt || item?.orderDate || item?.expectedDeliveryDate),
                    status,
                    statusStyle: statusStyle[status] || statusStyle.Pending,
                    details,
                    itemCount,
                    totalQty,
                    totalAmount,
                    paymentStatus: item?.paymentStatus || 'UNPAID',
                }
            })
            .filter(Boolean)
    }

    const fetchStoreMap = async () => {
        const tk = token()
        if (!tk) {
            setStoreNameMap({})
            return {}
        }

        try {
            const response = await fetch(`${apiBase}/Organization/stores`, {
                method: 'GET',
                headers: authHeaders(),
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                setStoreNameMap({})
                return {}
            }

            const records = parseArrayData(data)
            const nextMap = {}

            records.forEach((item) => {
                const storeId = toNumber(item?.storeId ?? item?.StoreId ?? item?.id, 0)
                const storeNameRaw = item?.storeName ?? item?.StoreName ?? item?.name
                const storeName = typeof storeNameRaw === 'string' ? storeNameRaw.trim() : ''

                if (storeId > 0 && storeName) {
                    nextMap[storeId] = storeName
                }
            })

            setStoreNameMap(nextMap)
            return nextMap
        } catch {
            setStoreNameMap({})
            return {}
        }
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
            const priceMap = {}
            records.forEach((item) => {
                const id = Number(item?.productId || item?.id)
                if (!id) return
                const name = item?.productName || item?.name
                if (!name) return
                map[id] = name

                const internalPrice = firstPositiveNumber(item?.internalPrice, item?.price, item?.unitPrice)
                if (internalPrice > 0) {
                    priceMap[id] = internalPrice
                }
            })
            setProductNameMap(map)
            setProductPriceMap(priceMap)
        } catch {
            setProductNameMap({})
            setProductPriceMap({})
        }
    }

    const fetchKitchenStock = async () => {
        const tk = token()
        if (!tk) {
            setKitchenStockByProduct({})
            return
        }

        try {
            const response = await fetch(`${apiBase}/Inventory/stock`, {
                method: 'GET',
                headers: authHeaders(),
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                setKitchenStockByProduct({})
                return
            }

            const records = parseArrayData(data)
            const kitchenRecords = records.filter((item) => String(item?.locationType || '').toUpperCase() === 'KITCHEN')
            const sourceRecords = kitchenRecords.length > 0 ? kitchenRecords : records
            const stockMap = {}

            sourceRecords.forEach((item) => {
                const productId = toNumber(item?.productId, 0)
                if (!productId) return
                const qty = toNumber(item?.currentQuantity ?? item?.quantity, 0)
                stockMap[productId] = toNumber(stockMap[productId], 0) + qty
            })

            setKitchenStockByProduct(stockMap)
        } catch {
            setKitchenStockByProduct({})
        }
    }

    const fetchOrders = async (storeMapOverride = null) => {
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

                    const totalQty = details.reduce((sum, row) => sum + getDetailQuantity(row), 0)

                    // Calculate totalAmount from details if not provided
                    let totalAmount = data?.totalAmount || 0
                    if (!totalAmount && details.length > 0) {
                        totalAmount = details.reduce((sum, row) => sum + getDetailSubtotal(row), 0)
                    }

                    return [order.orderId, { details, itemCount: details.length, totalQty, totalAmount }]
                } catch {
                    return [order.orderId, null]
                }
            }))

            const detailMap = new Map(detailPairs)
            return baseOrders.map((order) => {
                const hydrated = detailMap.get(order.orderId)
                if (!hydrated) return order
                const nextStatus = deriveShippingStatusFromDetails(order.status, hydrated.details)
                return {
                    ...order,
                    status: nextStatus,
                    statusStyle: statusStyle[nextStatus] || statusStyle.Pending,
                    details: hydrated.details,
                    itemCount: hydrated.itemCount,
                    totalQty: hydrated.totalQty,
                    totalAmount: hydrated.totalAmount || order.totalAmount,
                }
            })
        }

        setLoading(true)
        try {
            const records = await fetchOrderRecords(`${apiBase}/internal-orders?storeId=${encodeURIComponent(effectiveStoreId)}`)

            const recordsNeedStoreLookup = records.some((item) => {
                const storeId = extractStoreId(item)
                const storeName = extractStoreName(item)
                return storeId > 0 && !storeName
            })

            let effectiveStoreMap = storeMapOverride && typeof storeMapOverride === 'object'
                ? storeMapOverride
                : storeNameMap

            if (recordsNeedStoreLookup && Object.keys(effectiveStoreMap || {}).length === 0) {
                effectiveStoreMap = await fetchStoreMap()
            }

            const normalized = normalizeOrders(records, effectiveStoreMap)
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
            openNotice('error', 'Chỉ đơn ở trạng thái Đang giao hoặc Giao một phần mới được xác nhận hoàn tất.')
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

        if (targetOrder.status !== 'Processing') {
            openNotice('error', 'Chỉ đơn đang sản xuất mới có thể đánh dấu sẵn sàng.')
            return
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
                body: JSON.stringify({ status: 'PRODUCED' }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể cập nhật trạng thái đơn hàng.')
            }

            openNotice('success', data?.message || `Đơn hàng #${orderId} đã sẵn sàng xuất kho.`)
            await fetchOrders()
        } catch (error) {
            openNotice('error', error.message || 'Cập nhật trạng thái thất bại.')
        } finally {
            setActionLoadingId(null)
        }
    }

    const shipPartialOrder = async (orderId) => {
        const targetOrder = orders.find((item) => Number(item?.orderId) === Number(orderId))

        if (!targetOrder) {
            openNotice('error', 'Không tìm thấy đơn hàng để giao.')
            return
        }

        if (!canShipPartialOrder(targetOrder.status)) {
            openNotice('error', 'Chỉ đơn ở trạng thái Đã duyệt, Đang sản xuất, Sẵn sàng hoặc Giao một phần mới được giao tiếp.')
            return
        }

        const { payload, error } = buildShipPartialPayload(targetOrder)
        if (error) {
            openNotice('error', error)
            return
        }

        const tk = token()

        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setShipLoadingId(orderId)
        try {
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/ship-partial`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.message || data?.title || `Không thể giao từng phần. HTTP ${response.status}`)
            }

            const responseOrder = data?.order && typeof data.order === 'object' ? data.order : null
            if (responseOrder) {
                const responseStatus = normalizeStatus(responseOrder?.orderStatus || targetOrder.status)
                const nextDetails = Array.isArray(responseOrder?.internalOrderDetails)
                    ? responseOrder.internalOrderDetails
                    : Array.isArray(responseOrder?.orderDetails)
                        ? responseOrder.orderDetails
                        : null

                setOrders((prev) => prev.map((order) => {
                    if (Number(order?.orderId) !== Number(orderId)) return order

                    const resolvedDetails = Array.isArray(nextDetails) ? nextDetails : order.details
                    const nextStatus = deriveShippingStatusFromDetails(responseStatus, resolvedDetails)
                    const totalQty = Array.isArray(resolvedDetails)
                        ? resolvedDetails.reduce((sum, row) => sum + getDetailQuantity(row), 0)
                        : order.totalQty

                    return {
                        ...order,
                        status: nextStatus,
                        statusStyle: statusStyle[nextStatus] || statusStyle.Pending,
                        details: resolvedDetails,
                        itemCount: Array.isArray(resolvedDetails) ? resolvedDetails.length : order.itemCount,
                        totalQty,
                    }
                }))
            }

            setKitchenStockByProduct((prev) => {
                const next = { ...prev }
                payload.forEach((line) => {
                    const productId = toNumber(line?.productId, 0)
                    if (!productId || !Object.prototype.hasOwnProperty.call(next, productId)) return
                    const current = toNumber(next[productId], 0)
                    const deducted = current - toNumber(line?.quantityToShip, 0)
                    next[productId] = deducted > 0 ? deducted : 0
                })
                return next
            })

            clearShipDraft(orderId)
            openNotice('success', data?.message || `Đã ghi nhận giao từng phần cho đơn #${orderId}.`)

            await Promise.all([fetchOrders(), fetchKitchenStock()])
            if (expandedId === orderId) {
                await fetchOrderDetail(orderId)
            }
        } catch (error) {
            openNotice('error', error.message || 'Giao từng phần thất bại.')
        } finally {
            setShipLoadingId(null)
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

                const totalQty = details.reduce((sum, row) => sum + getDetailQuantity(row), 0)
                const rawStatus = normalizeStatus(data?.orderStatus || data?.status || order.status)
                const nextStatus = deriveShippingStatusFromDetails(rawStatus, details)

                // Calculate totalAmount from details if not provided
                let totalAmount = data?.totalAmount || order.totalAmount || 0
                if (!totalAmount && details.length > 0) {
                    totalAmount = details.reduce((sum, row) => sum + getDetailSubtotal(row), 0)
                }

                return {
                    ...order,
                    status: nextStatus,
                    statusStyle: statusStyle[nextStatus] || statusStyle.Pending,
                    details,
                    itemCount: details.length,
                    totalQty,
                    totalAmount,
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

    const refreshAllData = async () => {
        const [latestStoreMap] = await Promise.all([fetchStoreMap(), fetchProductMap(), fetchKitchenStock()])
        await fetchOrders(latestStoreMap)
    }

    useEffect(() => {
        refreshAllData()
    }, [])

    const filters = ['All', 'Pending', 'Approved', 'Rejected', 'Confirmed', 'Processing', 'Produced', 'PartialShipping', 'Shipped', 'Delivered', 'Cancelled', 'Returned']

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
        partialShipping: orders.filter((o) => o.status === 'PartialShipping').length,
        delivered: orders.filter((o) => o.status === 'Delivered').length,
        rejected: orders.filter((o) => o.status === 'Rejected').length,
        cancelled: orders.filter((o) => o.status === 'Cancelled').length,
    }), [orders])

    const canCancelOrder = (status) => status === 'Pending' // PENDING → CANCELLED
    const canApproveOrder = (status) => status === 'Pending' // PENDING → APPROVED
    const canRejectOrder = (status) => status === 'Pending' // PENDING → REJECTED
    const canShipPartialOrder = (status) => status === 'Approved' || status === 'Processing' || status === 'Produced' || status === 'PartialShipping'

    const getProductDisplayName = (item) => {
        const productId = Number(item?.productId)
        if (item?.product?.productName) return item.product.productName
        if (item?.product?.name) return item.product.name
        if (productId && productNameMap[productId]) return productNameMap[productId]
        if (productId) return `Sản phẩm chưa có tên`
        return 'Sản phẩm chưa xác định'
    }

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">assignment</span>
                    <h2 className="text-lg font-bold leading-tight">Quản lý đơn hàng nội bộ</h2>
                </div>
                <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors" onClick={refreshAllData}>
                    <span className="material-symbols-outlined text-[18px]">refresh</span>Tải lại
                </button>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold">Đơn hàng từ cửa hàng</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi trạng thái, giao từng phần và đồng bộ hoàn tất theo luồng mới.</p>
                </div>

                <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-900/15 p-4">
                    <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">Luồng test nhanh API giao từng phần</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 whitespace-nowrap">B1: Đơn ở Đã duyệt, Đang sản xuất, Sẵn sàng hoặc Giao một phần</span>
                        <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 whitespace-nowrap">B2: Nhập SL giao từng sản phẩm</span>
                        <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 whitespace-nowrap">B3: Gọi POST /ship-partial</span>
                        <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 whitespace-nowrap">B4: Nếu đủ 100% sẽ lên Đang giao</span>
                    </div>
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
                        <table className="list-nowrap w-full table-fixed text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="w-[14%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn hàng</th>
                                    <th className="w-[16%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Cửa hàng</th>
                                    <th className="w-[14%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tạo</th>
                                    <th className="w-[7%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mặt hàng</th>
                                    <th className="w-[7%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">SL</th>
                                    <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng tiền</th>
                                    <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                    <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((order) => (
                                    <Fragment key={order.orderId}>
                                        <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <p className="font-semibold">#{order.orderId}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{order.orderCode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">{order.storeName}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">{order.createdAt}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">{order.itemCount}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">{order.totalQty}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                {(order.totalAmount || 0).toLocaleString('vi-VN')} đ
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${order.statusStyle}`}>
                                                    {statusLabel[order.status] || order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
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
                                                <td colSpan={8} className="px-4 py-3">
                                                    {detailLoadingId === order.orderId ? <p className="mb-2 text-xs text-slate-500">Đang tải chi tiết đơn...</p> : null}
                                                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                                                        {canApproveOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-60 whitespace-nowrap"
                                                                disabled={actionLoadingId === order.orderId}
                                                                onClick={() => approveOrder(order.orderId)}
                                                            >
                                                                {actionLoadingId === order.orderId ? 'Đang duyệt...' : 'Duyệt đơn'}
                                                            </button>
                                                        )}
                                                        {canRejectOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors disabled:opacity-60 whitespace-nowrap"
                                                                disabled={actionLoadingId === order.orderId}
                                                                onClick={() => rejectOrder(order.orderId)}
                                                            >
                                                                {actionLoadingId === order.orderId ? 'Đang từ chối...' : 'Từ chối'}
                                                            </button>
                                                        )}
                                                        {canShipPartialOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 whitespace-nowrap"
                                                                disabled={shipLoadingId === order.orderId || !(order.details || []).some((row) => getRemainingToShip(row) > 0 && getMaxShippableNow(row) > 0)}
                                                                onClick={() => shipPartialOrder(order.orderId)}
                                                            >
                                                                {shipLoadingId === order.orderId ? 'Đang ghi nhận...' : 'Giao từng phần'}
                                                            </button>
                                                        )}
                                                        {canCancelOrder(order.status) && (
                                                            <button
                                                                className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-60 whitespace-nowrap"
                                                                disabled={cancelLoadingId === order.orderId}
                                                                onClick={() => cancelOrder(order.orderId)}
                                                            >
                                                                {cancelLoadingId === order.orderId ? 'Đang hủy...' : 'Hủy đơn'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {canShipPartialOrder(order.status) && !(order.details || []).some((row) => getRemainingToShip(row) > 0 && getMaxShippableNow(row) > 0) ? (
                                                        <div className="mb-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                                                            Hiện chưa có sản phẩm nào đủ điều kiện giao (hết tồn kho bếp hoặc đã giao đủ mục tiêu).
                                                        </div>
                                                    ) : null}
                                                    {(order.details || []).filter((row) => getRemainingToShip(row) > 0).length > 0 ? (
                                                        <table className="list-nowrap w-full text-left border-collapse rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                                            <thead>
                                                                <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Mục tiêu giao (đơn)</th>
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Đã giao (đơn)</th>
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Còn giao (đơn)</th>
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Tồn kho bếp</th>
                                                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Giao lần này</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(order.details || []).filter((row) => getRemainingToShip(row) > 0).map((item) => {
                                                                    const shipped = getDetailShipped(item)
                                                                    const target = getDetailTarget(item)
                                                                    const remaining = getRemainingToShip(item)
                                                                    const stockQty = getKitchenStockByProductId(item?.productId)
                                                                    const maxShippableNow = getMaxShippableNow(item)
                                                                    const draftValue = shipDraftByOrder[order.orderId]?.[Number(item?.productId)] ?? ''

                                                                    return (
                                                                        <tr key={item?.detailId || `${order.orderId}-${item?.productId}`} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                                            <td className="px-3 py-2 text-sm whitespace-nowrap">{getProductDisplayName(item)}</td>
                                                                            <td className="px-3 py-2 text-sm font-semibold text-center whitespace-nowrap">{target}</td>
                                                                            <td className="px-3 py-2 text-sm font-semibold text-center text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{shipped}</td>
                                                                            <td className={`px-3 py-2 text-sm font-semibold text-center whitespace-nowrap ${remaining <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{remaining}</td>
                                                                            <td className={`px-3 py-2 text-sm font-semibold text-center whitespace-nowrap ${stockQty !== null && stockQty <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                                {stockQty === null ? 'N/A' : stockQty}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-center">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    max={maxShippableNow > 0 ? maxShippableNow : undefined}
                                                                                    value={draftValue}
                                                                                    disabled={!canShipPartialOrder(order.status) || maxShippableNow <= 0 || shipLoadingId === order.orderId}
                                                                                    onChange={(event) => updateShipDraftValue(order.orderId, item?.productId, event.target.value)}
                                                                                    placeholder="Nhập SL"
                                                                                    className="h-8 w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm text-center"
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <p className="text-xs text-slate-500">Đơn này đã giao đủ các sản phẩm.</p>
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
