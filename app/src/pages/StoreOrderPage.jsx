import { useEffect, useState } from 'react'
import { decodeJwtPayload, getStoredToken } from '../utils/auth'

const fallbackStoreOptions = []
const fallbackProductOptions = []

const supplierInactiveLabel = 'Ngừng hoạt động'

const statusColors = { ok: 'bg-emerald-500', low: 'bg-amber-500', critical: 'bg-red-500' }
const stockBg = { ok: '', low: 'bg-amber-50 dark:bg-amber-900/10', critical: 'bg-red-50 dark:bg-red-900/10' }
const orderStatusStyle = {
    'Đã nhận hàng': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Hoàn thành': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Đang giao': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Giao một phần': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    'Đã hoàn tiền': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    'Đã sản xuất': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    'Đã duyệt': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'Đã xác nhận': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Đã từ chối': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'Chờ duyệt': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    'Đã hủy': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Đã trả hàng': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const paymentStatusStyle = {
    UNPAID: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    REFUNDED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PARTIAL_REFUND: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

const paymentStatusLabel = {
    UNPAID: 'Chưa thanh toán',
    PAID: 'Đã thanh toán',
    REFUNDED: 'Đã hoàn tiền',
    PARTIAL_REFUND: 'Hoàn một phần',
}

const apiStatusToUi = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang xử lý',
    PRODUCED: 'Đã sản xuất',
    PARTIAL_SHIPPING: 'Giao một phần',
    SHIPPED: 'Đang giao',
    SHIPPING: 'Đang giao',
    REFUNDED: 'Đã hoàn tiền',
    DELIVERED: 'Đã nhận hàng',
    COMPLETED: 'Đã nhận hàng',
    CANCELLED: 'Đã hủy',
    REJECTED: 'Đã từ chối',
    RETURNED: 'Đã trả hàng',
}

const inventoryActionLabel = {
    IN: 'Nhập kho',
    OUT: 'Xuất kho',
    ADJUST: 'Điều chỉnh',
    TRANSFER_IN: 'Chuyển vào',
    TRANSFER_OUT: 'Chuyển ra',
}

function parseArrayData(raw) {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.items)) return raw.items
    if (Array.isArray(raw?.data)) return raw.data
    return []
}

function parseSafeNumber(value, fallback = 0) {
    if (typeof value === 'string') {
        const raw = value.trim()
        if (!raw) return fallback

        let normalized = raw.replace(/\s/g, '')
        if (normalized.includes(',') && !normalized.includes('.')) {
            normalized = normalized.replace(',', '.')
        }

        const n = Number(normalized)
        return Number.isFinite(n) ? n : fallback
    }

    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function getDetailOrderedQty(row) {
    return parseSafeNumber(
        row?.quantityOrdered
        ?? row?.orderedQuantity
        ?? row?.quantity
        ?? row?.qty
        ?? row?.quantity_ordered,
        0,
    )
}

function getDetailConfirmedQty(row) {
    return parseSafeNumber(
        row?.quantityConfirmed
        ?? row?.confirmedQuantity
        ?? row?.quantity_confirmed,
        0,
    )
}

function getDetailShippedQty(row) {
    return parseSafeNumber(
        row?.quantityShipped
        ?? row?.shippedQuantity
        ?? row?.quantity_shipped
        ?? row?.shippedQty
        ?? row?.deliveredQuantity,
        0,
    )
}

function getDetailUnitPrice(row) {
    const direct = parseSafeNumber(
        row?.unitPrice
        ?? row?.price
        ?? row?.internalPrice
        ?? row?.unit_price
        ?? row?.product?.internalPrice
        ?? row?.product?.price,
        0,
    )
    if (direct > 0) return direct

    const lineAmount = parseSafeNumber(
        row?.lineTotal
        ?? row?.lineAmount
        ?? row?.subtotal
        ?? row?.subTotal
        ?? row?.totalAmount
        ?? row?.totalPrice
        ?? row?.amount,
        0,
    )

    const qty = getDetailOrderedQty(row)
    if (lineAmount > 0 && qty > 0) return lineAmount / qty
    return 0
}

function normalizeLocationType(locationType) {
    const raw = String(locationType || '').toUpperCase()
    if (raw === 'KITCHEN') return 'Bếp trung tâm'
    if (raw === 'STORE') return 'Cửa hàng'
    return locationType || 'Không có'
}

function resolveInventoryStatus(row) {
    const current = parseSafeNumber(row?.currentQuantity, 0)
    const min = parseSafeNumber(row?.minimumQuantity ?? row?.minQuantity ?? row?.reorderLevel ?? row?.safetyStock, 0)

    if (current <= 0) return 'critical'
    if (min > 0 && current <= min) return 'low'
    if (min === 0 && current <= 10) return 'low'
    return 'ok'
}

function toInventoryRow(item, productNameById) {
    const productId = parseSafeNumber(item?.productId, 0)
    const status = resolveInventoryStatus(item)
    const min = parseSafeNumber(item?.minimumQuantity ?? item?.minQuantity ?? item?.reorderLevel ?? item?.safetyStock, 0)

    return {
        id: parseSafeNumber(item?.inventoryId ?? item?.id, productId),
        productId,
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Sản phẩm chưa có tên`,
        locationType: normalizeLocationType(item?.locationType),
        locationId: parseSafeNumber(item?.locationId, 0),
        currentQuantity: parseSafeNumber(item?.currentQuantity, 0),
        minQuantity: min,
        lastUpdated: item?.lastUpdated || item?.updatedAt || item?.modifiedAt || null,
        status,
    }
}

function toInventoryLogRow(item, productNameById) {
    const productId = parseSafeNumber(item?.productId, 0)
    const rawAction = String(item?.transactionType || item?.type || item?.action || '').toUpperCase()
    const rawReason = String(item?.reason || '').toUpperCase()
    const referenceType = String(item?.referenceType || '').toUpperCase()
    const action = inventoryActionLabel[rawAction]
        || inventoryActionLabel[rawReason]
        || (rawReason === 'INITIAL_STOCK' ? 'Khởi tạo tồn kho' : '')
        || item?.transactionType
        || item?.type
        || item?.action
        || item?.reason
        || 'Không có'

    return {
        id: parseSafeNumber(item?.logId ?? item?.transactionId ?? item?.id, 0),
        inventoryId: parseSafeNumber(item?.inventoryId, 0),
        productId,
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Sản phẩm chưa có tên`,
        locationType: normalizeLocationType(item?.locationType),
        locationTypeRaw: String(item?.locationType || '').toUpperCase(),
        locationId: parseSafeNumber(item?.locationId, 0),
        action,
        quantityChange: parseSafeNumber(item?.quantityChanged ?? item?.changeQuantity ?? item?.quantity ?? item?.amount, 0),
        note: item?.note || item?.reason || item?.description || '',
        reason: item?.reason || '',
        referenceType: referenceType || 'Không có',
        referenceId: item?.referenceId,
        createdAt: item?.createdAt || item?.transactionDate || item?.timestamp || null,
    }
}

function resolveStoreIdFromTokenOrStorage() {
    const direct = localStorage.getItem('store_id') || localStorage.getItem('storeId') || localStorage.getItem('current_store_id')
    if (String(direct || '').trim()) return Number(direct)

    const payload = decodeJwtPayload(getStoredToken()) || {}
    const claimStoreId = payload?.storeId || payload?.StoreId || payload?.store_id
    if (String(claimStoreId || '').trim()) return Number(claimStoreId)

    const userRaw = localStorage.getItem('user')
    if (userRaw) {
        try {
            const user = JSON.parse(userRaw)
            const userStoreId = user?.storeId || user?.store_id
            if (String(userStoreId || '').trim()) return Number(userStoreId)
        } catch {
            return 0
        }
    }

    return 0
}

function resolveStoreNameFromTokenOrStorage() {
    const payload = decodeJwtPayload(getStoredToken()) || {}
    const claimName = String(payload?.storeName || payload?.StoreName || payload?.store_name || '').trim()
    if (claimName) return claimName

    const userRaw = localStorage.getItem('user')
    if (!userRaw) return ''

    try {
        const user = JSON.parse(userRaw)
        return String(user?.storeName || user?.StoreName || '').trim()
    } catch {
        return ''
    }
}

function normalizeSupplierList(raw) {
    const records = parseArrayData(raw)
    return records
        .map((item) => {
            const supplierId = parseSafeNumber(item?.supplierId ?? item?.id, 0)
            if (!supplierId) return null
            return {
                supplierId,
                supplierName: item?.supplierName || item?.name || 'Nhà cung cấp chưa có tên',
                contactInfo: item?.contactInfo || 'Chưa có thông tin',
                address: item?.address || 'Chưa có địa chỉ',
                isActive: item?.isActive !== false,
            }
        })
        .filter(Boolean)
}

export default function StoreOrderPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const ordersPerPage = 12
    const [tab, setTab] = useState(0) // 0=Place Order, 1=My Orders
    const [inventoryFilter, setInventoryFilter] = useState('store')
    const [showCreateOrderForm, setShowCreateOrderForm] = useState(false)
    const [orders, setOrders] = useState([])
    const [ordersPage, setOrdersPage] = useState(1)
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [ordersError, setOrdersError] = useState('')
    const [ordersStatusFilter, setOrdersStatusFilter] = useState('')
    const [detailOrderId, setDetailOrderId] = useState('')
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState('')
    const [detailOrder, setDetailOrder] = useState(null)
    const [cancelLoading, setCancelLoading] = useState(false)
    const [receiveLoading, setReceiveLoading] = useState(false)
    const [returnLoading, setReturnLoading] = useState(false)
    const [statusUpdating, setStatusUpdating] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitSuccess, setSubmitSuccess] = useState('')
    const [lastCreatedOrderId, setLastCreatedOrderId] = useState(null)
    const [orderDetailRows, setOrderDetailRows] = useState([])
    const [formStoreId, setFormStoreId] = useState(() => {
        const scopedStoreId = resolveStoreIdFromTokenOrStorage()
        return scopedStoreId > 0 ? String(scopedStoreId) : ''
    })
    const [storeOptions, setStoreOptions] = useState(fallbackStoreOptions)
    const [productOptions, setProductOptions] = useState(fallbackProductOptions)
    const [supplierOptions, setSupplierOptions] = useState([])
    const [optionsLoading, setOptionsLoading] = useState(false)
    const [inventoryLoading, setInventoryLoading] = useState(false)
    const [inventoryError, setInventoryError] = useState('')
    const [inventoryInfo, setInventoryInfo] = useState('')
    const [uiWarning, setUiWarning] = useState('')
    const [inventoryRows, setInventoryRows] = useState([])
    const [inventoryLogs, setInventoryLogs] = useState([])
    const [formExpectedDeliveryDate, setFormExpectedDeliveryDate] = useState(() => {
        const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const offset = date.getTimezoneOffset() * 60 * 1000
        return new Date(date.getTime() - offset).toISOString().slice(0, 16)
    })
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null)
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [storeNameById, setStoreNameById] = useState({})

    const getStoreIdFromItem = (item) => Number(item?.storeId ?? item?.id)
    const getStoreNameFromItem = (item, id) => item?.storeName || item?.name || ''
    const getProductIdFromItem = (item) => Number(item?.productId ?? item?.id)
    const getProductNameFromItem = (item, id) => item?.productName || item?.name || ''

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
                return {
                    id,
                    name: getName(item, id),
                    internalPrice: item?.internalPrice || 0,
                }
            })
            .filter(Boolean)
    }

    const buildStoreNameMapFromOptions = (stores) => {
        return (Array.isArray(stores) ? stores : []).reduce((acc, item) => {
            const id = Number(item?.id ?? item?.storeId)
            const name = String(item?.name ?? item?.storeName ?? '').trim()
            if (id > 0 && name) acc[id] = name
            return acc
        }, {})
    }

    const fetchStoreNameMap = async () => {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (!token) return {}

        try {
            const response = await fetch(`${apiBase}/Organization/stores`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) return {}

            const normalizedStores = toOptionList(data, getStoreIdFromItem, getStoreNameFromItem)
            const nextMap = buildStoreNameMapFromOptions(normalizedStores)
            if (Object.keys(nextMap).length) {
                setStoreNameById((prev) => ({ ...prev, ...nextMap }))
            }
            return nextMap
        } catch {
            return {}
        }
    }

    const fetchDropdownOptions = async () => {
        setOrdersError('')
        setOptionsLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            const headers = {
                accept: '*/*',
                Authorization: `Bearer ${token}`,
            }

            const scopedStoreId = resolveStoreIdFromTokenOrStorage()
            const storeRes = await fetch(`${apiBase}/Organization/stores`, { method: 'GET', headers })
            const storesJson = await storeRes.json().catch(() => ({}))
            if (!storeRes.ok) {
                throw new Error(extractErrorMessage(storesJson, 'Không thể tải danh sách cửa hàng.'))
            }

            let stores = toOptionList(storesJson, getStoreIdFromItem, getStoreNameFromItem)
            if (scopedStoreId > 0) {
                stores = stores.filter((item) => Number(item.id) === scopedStoreId)
            }
            if (!stores.length) {
                throw new Error('Không tìm thấy dữ liệu cửa hàng phù hợp tài khoản hiện tại.')
            }

            const productRes = await fetch(`${apiBase}/Products/manufactured`, { method: 'GET', headers })
            const productsJson = await productRes.json().catch(() => ({}))
            if (!productRes.ok) {
                throw new Error(extractErrorMessage(productsJson, 'Không thể tải danh sách sản phẩm sản xuất.'))
            }

            let products = toOptionList(productsJson, getProductIdFromItem, getProductNameFromItem)

            // Filter only FINISHED products
            if (products.length > 0) {
                const rawProducts = parseArrayData(productsJson)
                products = products.filter(p => {
                    const rawProduct = rawProducts.find(rp => Number(rp?.productId || rp?.id) === Number(p.id))
                    const productType = String(rawProduct?.productType || '').toUpperCase()
                    return productType === 'FINISHED'
                })
            }

            if (!products.length) {
                throw new Error('Không có sản phẩm FINISHED để tạo đơn.')
            }

            setStoreOptions(stores)
            setStoreNameById((prev) => ({ ...prev, ...buildStoreNameMapFromOptions(stores) }))
            setProductOptions(products)
            setSupplierOptions([])
        } catch (error) {
            setStoreOptions([])
            setStoreNameById({})
            setProductOptions([])
            setSupplierOptions([])
            setOrdersError(error.message || 'Tải danh mục cửa hàng/sản phẩm thất bại.')
        } finally {
            setOptionsLoading(false)
        }
    }

    const createEmptyOrderDetailRow = () => ({
        productId: productOptions[0] ? String(productOptions[0].id) : '',
        quantityOrdered: '1',
    })

    const toReadableDate = (dateString) => {
        if (!dateString) return 'Không có'
        const d = new Date(dateString)
        if (Number.isNaN(d.getTime())) return dateString
        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const fetchInventory = async () => {
        setInventoryError('')
        setInventoryInfo('')

        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (!token) {
            setInventoryRows([])
            setInventoryLogs([])
            setInventoryInfo('')
            setInventoryError('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const parsedStoreId = Number(formStoreId)
        if (inventoryFilter === 'store' && (!parsedStoreId || parsedStoreId < 1)) {
            setInventoryRows([])
            setInventoryLogs([])
            setInventoryInfo('')
            setInventoryError('Mã cửa hàng không hợp lệ để tải tồn kho theo cửa hàng.')
            return
        }

        setInventoryLoading(true)
        try {
            const headers = {
                accept: '*/*',
                Authorization: `Bearer ${token}`,
            }

            const inventoryUrl = inventoryFilter === 'store'
                ? `${apiBase}/Inventory/store/${parsedStoreId}`
                : `${apiBase}/Inventory/stock`

            const inventoryRes = await fetch(inventoryUrl, { method: 'GET', headers })
            const logsRes = await fetch(`${apiBase}/Inventory/logs`, { method: 'GET', headers })

            const inventoryJson = await inventoryRes.json().catch(() => [])
            const logsJson = await logsRes.json().catch(() => [])

            if (!inventoryRes.ok) {
                throw new Error(inventoryJson?.message || inventoryJson?.title || 'Không thể tải dữ liệu tồn kho.')
            }

            if (!logsRes.ok) {
                setInventoryInfo('Không thể tải nhật ký tồn kho từ /Inventory/logs (backend đang lỗi hoặc chưa sẵn sàng). Vẫn hiển thị dữ liệu tồn kho hiện tại.')
            }

            const productNameById = productOptions.reduce((acc, item) => {
                const id = Number(item?.id)
                if (id > 0) acc[id] = item?.name || `Sản phẩm chưa có tên`
                return acc
            }, {})

            let inventoryRecords = parseArrayData(inventoryJson)

            if (inventoryFilter === 'store' && inventoryRecords.length === 0) {
                setInventoryInfo('Cửa hàng hiện tại chưa có bản ghi tồn kho trong hệ thống.')
            }

            const normalizedInventory = inventoryRecords
                .map((item) => toInventoryRow(item, productNameById))
                .filter((item) => item.productId > 0)

            const normalizedLogs = logsRes.ok
                ? parseArrayData(logsJson)
                    .map((item) => toInventoryLogRow(item, productNameById))
                    .filter((item) => item.id > 0 || item.inventoryId > 0)
                    .filter((item) => {
                        if (inventoryFilter !== 'store') return true
                        return item.locationTypeRaw === 'STORE' && item.locationId === parsedStoreId
                    })
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .slice(0, 20)
                : []

            if (inventoryFilter === 'store' && normalizedLogs.length === 0 && !inventoryInfo) {
                setInventoryInfo('Hiện chưa có lịch sử biến động tồn kho cho cửa hàng hiện tại.')
            }

            setInventoryRows(normalizedInventory)
            setInventoryLogs(normalizedLogs)
        } catch (error) {
            setInventoryRows([])
            setInventoryLogs([])
            setInventoryInfo('')
            setInventoryError(error.message || 'Tải tồn kho thất bại.')
        } finally {
            setInventoryLoading(false)
        }
    }

    const normalizeStatus = (rawStatus) => {
        if (!rawStatus) return 'Pending'
        const raw = String(rawStatus).trim().toUpperCase()
        const aliases = {
            PARTIALSHIPPING: 'PARTIAL_SHIPPING',
            GIAO_MOT_PHAN: 'PARTIAL_SHIPPING',
        }
        const normalized = aliases[raw] || raw
        return apiStatusToUi[normalized] || rawStatus
    }

    const deriveStatusFromDetails = (baseStatus, details, sourceOrder = null) => {
        const normalizedBase = String(baseStatus || '')
        const rows = Array.isArray(details) ? details : []
        const topLevelShipped = parseSafeNumber(
            sourceOrder?.totalShippedQuantity
            ?? sourceOrder?.shippedQuantity
            ?? sourceOrder?.quantityShipped
            ?? sourceOrder?.totalQuantityShipped,
            0,
        )

        if (normalizedBase === 'Đang giao' || normalizedBase === 'Giao một phần' || normalizedBase === 'Đã nhận hàng' || normalizedBase === 'Hoàn thành' || normalizedBase === 'Đã hủy' || normalizedBase === 'Đã từ chối' || normalizedBase === 'Đã trả hàng' || normalizedBase === 'Đã hoàn tiền') {
            return normalizedBase
        }

        if (!rows.length) {
            return topLevelShipped > 0 ? 'Giao một phần' : normalizedBase
        }

        const anyShipped = rows.some((row) => getDetailShippedQty(row) > 0) || topLevelShipped > 0
        if (!anyShipped) return normalizedBase

        const allReached = rows.every((row) => {
            const ordered = getDetailOrderedQty(row)
            const confirmed = getDetailConfirmedQty(row)
            const shipped = getDetailShippedQty(row)
            const target = confirmed > 0 ? confirmed : ordered
            if (target <= 0) return true
            return shipped >= target
        })

        return allReached ? 'Đang giao' : 'Giao một phần'
    }

    const normalizePaymentStatus = (rawPaymentStatus) => {
        const raw = String(rawPaymentStatus || '').trim().toUpperCase()
        if (!raw) return 'UNPAID'

        const aliases = {
            UNPAID: 'UNPAID',
            NOT_PAID: 'UNPAID',
            PENDING: 'UNPAID',
            WAITING_PAYMENT: 'UNPAID',
            PAID: 'PAID',
            SUCCESS: 'PAID',
            COMPLETED: 'PAID',
            REFUNDED: 'REFUNDED',
            REFUND: 'REFUNDED',
            PARTIAL_REFUND: 'PARTIAL_REFUND',
            PARTIALLY_REFUNDED: 'PARTIAL_REFUND',
            PARTIALREFUND: 'PARTIAL_REFUND',
        }

        return aliases[raw] || raw
    }

    const canCancelOrderInList = (rawStatus) => {
        const normalized = normalizeApiOrderStatus(rawStatus)
        return normalized === 'PENDING'
    }

    const isShippedLikeStatus = (rawStatus) => {
        const normalized = normalizeApiOrderStatus(rawStatus)
        return normalized === 'SHIPPING' || normalized === 'PARTIAL_SHIPPING'
    }

    const normalizeApiOrderStatus = (rawStatus) => {
        const raw = String(rawStatus || '').trim().toUpperCase()
        if (!raw) return ''

        const statusAliases = {
            'CHỜ DUYỆT': 'PENDING',
            'ĐÃ DUYỆT': 'APPROVED',
            'ĐANG XỬ LÝ': 'PROCESSING',
            'ĐANG SẢN XUẤT': 'PROCESSING',
            'ĐÃ SẢN XUẤT': 'PRODUCED',
            'ĐANG GIAO': 'SHIPPING',
            'GIAO MỘT PHẦN': 'PARTIAL_SHIPPING',
            'GIAO_MOT_PHAN': 'PARTIAL_SHIPPING',
            PARTIAL_SHIPPING: 'PARTIAL_SHIPPING',
            PARTIALSHIPPING: 'PARTIAL_SHIPPING',
            SHIPPED: 'SHIPPING',
            'ĐÃ XÁC NHẬN': 'CONFIRMED',
            'ĐÃ NHẬN HÀNG': 'COMPLETED',
            'HOÀN THÀNH': 'COMPLETED',
            'ĐÃ HỦY': 'CANCELLED',
            'ĐÃ TỪ CHỐI': 'REJECTED',
            'ĐÃ TRẢ HÀNG': 'RETURNED',
        }

        return statusAliases[raw] || raw
    }

    const getBackendOrderStatus = (order) => {
        return normalizeApiOrderStatus(
            order?.backendStatus
            || order?.rawOrderStatus
            || order?.statusApi
            || order?.statusCode
            || order?.orderStatus
            || order?.status,
        )
    }

    const canPayOrder = (rawStatus, rawPaymentStatus) => {
        const normalizedStatus = normalizeApiOrderStatus(rawStatus)
        const normalizedPayment = normalizePaymentStatus(rawPaymentStatus)
        const payableStatuses = ['APPROVED', 'PROCESSING', 'PRODUCED', 'PARTIAL_SHIPPING', 'SHIPPING']
        return normalizedPayment === 'UNPAID' && payableStatuses.includes(normalizedStatus)
    }

    const isPendingOrder = (rawStatus) => {
        return normalizeApiOrderStatus(rawStatus) === 'PENDING'
    }

    const canReceiveOrder = (rawStatus, rawPaymentStatus) => {
        return normalizeApiOrderStatus(rawStatus) === 'SHIPPING' && normalizePaymentStatus(rawPaymentStatus) === 'PAID'
    }

    const canReturnOrder = (rawStatus) => {
        return isShippedLikeStatus(rawStatus)
    }

    const isShippingUnpaidOrder = (rawStatus, rawPaymentStatus) => {
        return normalizeApiOrderStatus(rawStatus) === 'SHIPPING' && normalizePaymentStatus(rawPaymentStatus) === 'UNPAID'
    }

    const extractErrorMessage = (data, fallback) => {
        if (typeof data?.message === 'string' && data.message.trim()) return data.message
        if (typeof data?.title === 'string' && data.title.trim()) return data.title
        if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail

        const firstError = Object.values(data?.errors || {}).find((value) => Array.isArray(value) && value.length)
        if (firstError && firstError[0]) return String(firstError[0])

        return fallback
    }

    const getOrderStatusActions = (rawStatus) => {
        // Store staff KHÔNG được phép xuất kho
        // Chỉ có SUPPLY_COORDINATOR mới xuất kho từ Order Management page
        return []
    }

    const getStoreNameById = (storeId) => {
        const id = Number(storeId)
        if (!id || id < 1) return 'Không có'
        return storeNameById[id] || storeOptions.find((s) => Number(s.id) === id)?.name || 'Không có'
    }

    const getProductNameById = (productId) => {
        const id = Number(productId)
        if (!id || id < 1) return 'Không có'
        return productOptions.find((p) => Number(p.id) === id)?.name || 'Không có'
    }

    const getProductPriceById = (productId) => {
        const id = Number(productId)
        if (!id || id < 1) return 0
        return productOptions.find((p) => Number(p.id) === id)?.internalPrice || 0
    }

    const buildDetailRowsWithPrice = (rows, totalAmount) => {
        const safeRows = Array.isArray(rows) ? rows : []
        const mapped = safeRows.map((row) => {
            const quantity = getDetailOrderedQty(row)
            const unitPrice = getDetailUnitPrice(row)
            return {
                row,
                quantity,
                unitPrice,
            }
        })

        const unknownRows = mapped.filter((item) => item.quantity > 0 && item.unitPrice <= 0)
        const safeTotalAmount = parseSafeNumber(totalAmount, 0)

        let derivedUnitPrice = 0
        if (safeTotalAmount > 0 && unknownRows.length > 0) {
            const knownAmount = mapped.reduce((sum, item) => (
                item.unitPrice > 0 ? sum + (item.unitPrice * item.quantity) : sum
            ), 0)
            const unknownQuantity = unknownRows.reduce((sum, item) => sum + item.quantity, 0)
            const remainingAmount = Math.max(0, safeTotalAmount - knownAmount)
            derivedUnitPrice = unknownQuantity > 0 ? remainingAmount / unknownQuantity : 0
        }

        return mapped.map((item) => {
            const resolvedUnitPrice = item.unitPrice > 0 ? item.unitPrice : derivedUnitPrice
            return {
                ...item.row,
                _quantity: item.quantity,
                _unitPrice: resolvedUnitPrice,
                _subtotal: resolvedUnitPrice * item.quantity,
            }
        })
    }

    const normalizeOrders = (rawOrders, storeMapOverride = null) => {
        const effectiveStoreMap = storeMapOverride && typeof storeMapOverride === 'object'
            ? storeMapOverride
            : storeNameById

        if (!Array.isArray(rawOrders)) return []
        return rawOrders.map((item) => {
            const numericId = Number(item?.id || item?.internalOrderId || item?.orderId)
            if (!numericId || numericId < 1) return null

            const backendStatus = normalizeApiOrderStatus(item?.orderStatus || item?.status)
            const baseStatus = normalizeStatus(item?.status || item?.orderStatus)

            // Try multiple possible field names for order details
            const orderDetails = Array.isArray(item?.orderDetails)
                ? item.orderDetails
                : Array.isArray(item?.internalOrderDetails)
                    ? item.internalOrderDetails
                    : Array.isArray(item?.details)
                        ? item.details
                        : []

            const status = deriveStatusFromDetails(baseStatus, orderDetails, item)

            // Improved product name extraction - prioritize nested product object
            const productNames = Array.from(new Set(
                orderDetails.map((d) => {
                    // Try to get from nested product object first
                    if (d?.product?.productName) return d.product.productName
                    if (d?.product?.name) return d.product.name
                    if (d?.productName) return d.productName
                    // Fallback to productOptions lookup
                    const productId = Number(d?.productId)
                    if (productId > 0) {
                        const found = productOptions.find(p => Number(p.id) === productId)
                        if (found) return found.name
                        return `Sản phẩm chưa có tên`
                    }
                    return null
                }).filter(Boolean)
            ))

            const totalQuantity = orderDetails.reduce((sum, row) => {
                const qty = getDetailOrderedQty(row)
                return sum + qty
            }, 0)

            const productLabel = orderDetails.length === 0
                ? 'Nhấn xem chi tiết'
                : productNames.length === 0
                    ? 'Đang tải...'
                    : productNames.length === 1
                        ? productNames[0]
                        : `${productNames[0]} +${productNames.length - 1}`

            const allProductNames = productNames.join('\n') // For tooltip
            const resolvedStoreId = Number(item?.storeId ?? item?.store?.storeId ?? item?.store?.id)
            return {
                id: `${numericId}`,
                orderId: numericId,
                date: toReadableDate(item?.createdAt || item?.orderDate || item?.expectedDeliveryDate),
                items: orderDetails.length,
                totalQuantity,
                storeName: item?.store?.storeName
                    || item?.store?.name
                    || item?.storeName
                    || effectiveStoreMap[resolvedStoreId]
                    || getStoreNameById(resolvedStoreId),
                productLabel,
                allProductNames, // Add this for tooltip
                hasMultipleProducts: productNames.length > 1,
                backendStatus,
                status,
                statusStyle: orderStatusStyle[status] || orderStatusStyle['Chờ duyệt'],
                paymentStatus: normalizePaymentStatus(item?.paymentStatus),
                totalAmount: item?.totalAmount || 0,
            }
        }).filter(Boolean)
    }

    const fetchMyOrders = async () => {
        setOrdersError('')
        setOrdersLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            const params = new URLSearchParams()
            const parsedStoreId = Number(formStoreId)
            if (!(parsedStoreId > 0)) {
                throw new Error('Không xác định được cửa hàng hiện tại để tải đơn hàng.')
            }
            const effectiveStoreId = parsedStoreId
            params.set('storeId', String(effectiveStoreId))
            if (ordersStatusFilter) {
                params.set('status', String(ordersStatusFilter).toLowerCase())
            }

            const query = params.toString() ? `?${params.toString()}` : ''
            const response = await fetch(`${apiBase}/internal-orders${query}`, {
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

            let records = Array.isArray(data) ? data : data?.items || []

            // Fetch details for each order to get product info
            if (records.length > 0) {
                const detailPromises = records.map(async (order) => {
                    const orderId = Number(order?.id || order?.internalOrderId || order?.orderId)
                    if (!orderId) return order

                    try {
                        const detailRes = await fetch(`${apiBase}/internal-orders/${orderId}`, {
                            method: 'GET',
                            headers: {
                                accept: '*/*',
                                Authorization: `Bearer ${token}`,
                            },
                        })

                        if (detailRes.ok) {
                            const detailData = await detailRes.json().catch(() => ({}))
                            // Merge detail data with list data
                            return {
                                ...order,
                                orderDetails: detailData.orderDetails || detailData.internalOrderDetails || order.orderDetails,
                                internalOrderDetails: detailData.internalOrderDetails || detailData.orderDetails || order.internalOrderDetails,
                            }
                        }
                    } catch (err) {
                        // Failed to fetch detail for order
                    }

                    return order
                })

                records = await Promise.all(detailPromises)
            }

            const hasMissingStoreName = records.some((item) => {
                const id = Number(item?.storeId ?? item?.store?.storeId ?? item?.store?.id)
                const name = String(item?.store?.storeName || item?.store?.name || item?.storeName || '').trim()
                return id > 0 && !name
            })
            let latestStoreMap = storeNameById
            if (hasMissingStoreName && !Object.keys(storeNameById).length) {
                latestStoreMap = await fetchStoreNameMap()
            }

            setOrders(normalizeOrders(records, latestStoreMap))
        } catch (error) {
            setOrders([])
            setOrdersError(error.message || 'Tải đơn hàng thất bại.')
        } finally {
            setOrdersLoading(false)
        }
    }

    const fetchOrderById = async (idArg) => {
        setDetailError('')
        setUiWarning('')
        setDetailOrder(null)

        const orderId = Number(idArg ?? detailOrderId)
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
                if (response.status === 404) {
                    setOrdersError('Order không tồn tại. Đã quay lại danh sách đơn.')
                    return
                }
                throw new Error(extractErrorMessage(data, 'Không thể tải chi tiết đơn hàng.'))
            }

            const detailRows = data?.internalOrderDetails || data?.orderDetails || []
            const backendStatus = normalizeApiOrderStatus(data?.orderStatus || data?.status)
            const displayStatus = deriveStatusFromDetails(
                normalizeStatus(data?.orderStatus || data?.status),
                detailRows,
                data,
            )

            const resolvedStoreId = Number(data?.storeId ?? data?.store?.storeId ?? data?.store?.id)
            let resolvedStoreName = String(data?.store?.storeName || data?.store?.name || data?.storeName || '').trim()

            if (!resolvedStoreName && resolvedStoreId > 0) {
                let latestStoreMap = storeNameById
                if (!Object.keys(storeNameById).length) {
                    latestStoreMap = await fetchStoreNameMap()
                }
                resolvedStoreName = latestStoreMap[resolvedStoreId] || getStoreNameById(resolvedStoreId)
            }

            setDetailOrder({
                ...data,
                storeId: resolvedStoreId > 0 ? resolvedStoreId : data?.storeId,
                storeName: resolvedStoreName || 'Không có',
                backendStatus,
                orderStatus: displayStatus,
                paymentStatus: normalizePaymentStatus(data?.paymentStatus),
            })
        } catch (error) {
            setDetailError(error.message || 'Tải chi tiết đơn thất bại.')
        } finally {
            setDetailLoading(false)
        }
    }

    const addOrderDetailRow = () => {
        setOrderDetailRows((prev) => [...prev, { productId: '', quantityOrdered: '1' }])
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
            setDetailOrder((prev) => prev ? { ...prev, backendStatus: 'CANCELLED', orderStatus: updatedStatus, status: updatedStatus } : prev)
            fetchMyOrders()
        } catch (error) {
            setDetailError(error.message || 'Hủy đơn thất bại.')
        } finally {
            setCancelLoading(false)
        }
    }

    const confirmReceivedById = async (orderId) => {
        setDetailError('')
        setUiWarning('')

        const currentBackendStatus = getBackendOrderStatus(detailOrder)
        if (normalizeApiOrderStatus(currentBackendStatus) !== 'SHIPPING') {
            setDetailError('Chỉ đơn ở trạng thái SHIPPING mới có thể xác nhận nhận hàng.')
            return
        }

        const currentPaymentStatus = normalizePaymentStatus(detailOrder?.paymentStatus)
        if (currentPaymentStatus !== 'PAID') {
            setUiWarning('Đơn chưa thanh toán, chưa thể xác nhận nhận hàng.')
            return
        }

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            setReceiveLoading(true)
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/confirm-completed`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Không có quyền thao tác đơn này.')
                }
                if (response.status === 404) {
                    setDetailOrder(null)
                    setOrdersError('Order không tồn tại. Đã quay lại danh sách đơn.')
                    fetchMyOrders()
                    return
                }

                const backendMessage = extractErrorMessage(data, 'Không thể xác nhận đã nhận hàng.')
                if (/chưa\s*thanh\s*toán|not\s*paid/i.test(backendMessage)) {
                    setUiWarning('Đơn chưa thanh toán, chưa thể xác nhận nhận hàng.')
                    return
                }

                throw new Error(backendMessage)
            }

            const updatedStatus = normalizeStatus('DELIVERED')
            setDetailOrder((prev) => prev ? { ...prev, backendStatus: 'COMPLETED', orderStatus: updatedStatus, status: updatedStatus } : prev)
            setSubmitSuccess(data?.message || `Đơn ${orderId} đã được xác nhận nhận hàng.`)
            fetchMyOrders()
        } catch (error) {
            setDetailError(error.message || 'Xác nhận nhận hàng thất bại.')
        } finally {
            setReceiveLoading(false)
        }
    }

    const returnOrderById = async (orderId) => {
        setDetailError('')
        setUiWarning('')

        const currentBackendStatus = getBackendOrderStatus(detailOrder)
        if (!isShippedLikeStatus(currentBackendStatus)) {
            setDetailError('Chỉ đơn đang giao SHIPPING hoặc PARTIAL_SHIPPING mới có thể trả hàng.')
            return
        }

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            const reason = window.prompt('Nhập lý do trả hàng (bắt buộc):', '')

            if (!reason || !reason.trim()) {
                setDetailError('Vui lòng nhập lý do trả hàng.')
                return
            }

            setReturnLoading(true)
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/return`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason.trim() }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể trả hàng cho đơn này.')
            }

            const updatedStatus = normalizeStatus('RETURNED')
            setDetailOrder((prev) => prev ? { ...prev, backendStatus: 'RETURNED', orderStatus: updatedStatus, status: updatedStatus } : prev)
            setSubmitSuccess(data?.message || `Đã trả hàng thành công. Kho Kitchen đã được hoàn trả.`)
            fetchMyOrders()
        } catch (error) {
            setDetailError(error.message || 'Trả hàng thất bại.')
        } finally {
            setReturnLoading(false)
        }
    }

    const updateOrderStatusById = async (orderId, nextStatus) => {
        setDetailError('')
        setSubmitError('')

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            setStatusUpdating(`${orderId}-${nextStatus}`)
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: nextStatus }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || `Không thể chuyển trạng thái sang ${nextStatus}.`)
            }

            const updatedOrder = data?.order
            if (updatedOrder && Number(updatedOrder?.orderId || updatedOrder?.id) === Number(orderId)) {
                setDetailOrder((prev) => (prev
                    ? {
                        ...prev,
                        ...updatedOrder,
                        backendStatus: normalizeApiOrderStatus(updatedOrder?.orderStatus || updatedOrder?.status || prev?.backendStatus),
                        paymentStatus: normalizePaymentStatus(updatedOrder?.paymentStatus ?? prev?.paymentStatus),
                    }
                    : prev))
            } else {
                const updatedStatus = normalizeStatus(nextStatus)
                setDetailOrder((prev) => (prev
                    ? {
                        ...prev,
                        backendStatus: normalizeApiOrderStatus(nextStatus),
                        orderStatus: updatedStatus,
                        status: updatedStatus,
                    }
                    : prev))
            }

            setSubmitSuccess(data?.message || `Đơn ${orderId} đã chuyển sang ${nextStatus}.`)
            fetchMyOrders()
        } catch (error) {
            setDetailError(error.message || 'Cập nhật trạng thái đơn hàng thất bại.')
        } finally {
            setStatusUpdating('')
        }
    }

    const openPaymentModal = (order) => {
        const orderBackendStatus = normalizeApiOrderStatus(order?.backendStatus || order?.orderStatus || order?.status)
        if (!canPayOrder(orderBackendStatus, order?.paymentStatus)) {
            if (isPendingOrder(orderBackendStatus)) {
                setUiWarning('Đơn chưa duyệt, chưa thể thanh toán.')
            } else {
                setUiWarning('Đơn hiện không ở trạng thái cho phép thanh toán.')
            }
            return
        }

        setSelectedPaymentOrder(order)
        setShowPaymentModal(true)
    }

    const handlePaymentMethod = async (method) => {
        if (!selectedPaymentOrder) return

        const selectedBackendStatus = normalizeApiOrderStatus(
            selectedPaymentOrder?.backendStatus
            || selectedPaymentOrder?.orderStatus
            || detailOrder?.backendStatus
            || detailOrder?.orderStatus
            || detailOrder?.status,
        )

        if (!canPayOrder(selectedBackendStatus, selectedPaymentOrder?.paymentStatus || detailOrder?.paymentStatus)) {
            if (isPendingOrder(selectedBackendStatus)) {
                setDetailError('Đơn chưa duyệt, chưa thể thanh toán.')
            } else {
                setDetailError('Đơn hiện không ở trạng thái cho phép thanh toán.')
            }
            setShowPaymentModal(false)
            return
        }

        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        if (!token) {
            setDetailError('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setPaymentLoading(true)
        try {
            if (method === 'bank') {
                // Bank transfer - manual payment
                const response = await fetch(`${apiBase}/internal-orders/${selectedPaymentOrder.orderId}/pay`, {
                    method: 'POST',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${token}`,
                    },
                })

                const data = await response.json().catch(() => ({}))

                if (!response.ok) {
                    throw new Error(data?.message || data?.title || 'Không thể xác nhận thanh toán.')
                }

                setSubmitSuccess('Đã xác nhận thanh toán chuyển khoản thành công.')
                setShowPaymentModal(false)
                setSelectedPaymentOrder(null)
                fetchMyOrders()
                if (detailOrder && Number(detailOrder.orderId || detailOrder.id) === Number(selectedPaymentOrder.orderId)) {
                    fetchOrderById(selectedPaymentOrder.orderId)
                }
            } else if (method === 'vnpay') {
                // VNPAY - redirect to payment gateway
                const returnUrl = `${window.location.origin}/payment-result`

                console.log('💳 Creating VNPAY payment link')
                console.log('💳 Order ID:', selectedPaymentOrder.orderId)
                console.log('💳 Return URL:', returnUrl)

                const response = await fetch(
                    `${apiBase}/internal-orders/${selectedPaymentOrder.orderId}/vnpay-link?returnUrl=${encodeURIComponent(returnUrl)}`,
                    {
                        method: 'POST',
                        headers: {
                            accept: '*/*',
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                const data = await response.json().catch(() => ({}))

                console.log('💳 VNPAY API response:', {
                    status: response.status,
                    ok: response.ok,
                    data: data
                })

                if (!response.ok) {
                    throw new Error(data?.message || data?.title || 'Không thể tạo link thanh toán VNPAY.')
                }

                const paymentUrl = data?.paymentUrl || data?.checkoutUrl || data?.url

                console.log('💳 Payment URL:', paymentUrl)

                if (!paymentUrl) {
                    throw new Error('Backend không trả về link thanh toán.')
                }

                // Redirect to VNPAY
                console.log('💳 Redirecting to VNPAY...')
                window.location.href = paymentUrl
            }
        } catch (error) {
            setDetailError(error.message || 'Thanh toán thất bại.')
        } finally {
            setPaymentLoading(false)
        }
    }


    useEffect(() => {
        if (tab === 1) {
            fetchMyOrders()
        }
    }, [tab, formStoreId, ordersStatusFilter])

    useEffect(() => {
        setOrdersPage(1)
    }, [orders, tab, ordersStatusFilter, formStoreId])

    useEffect(() => {
        if (tab === 2) {
            fetchInventory()
        }
    }, [tab, formStoreId, inventoryFilter])

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
            .filter((row) => row.productId > 0 && Number.isFinite(row.quantityOrdered) && row.quantityOrdered > 0)

        if (!orderDetails.length) {
            setSubmitError('Vui lòng nhập ít nhất 1 dòng order detail hợp lệ (productId > 0 và quantityOrdered > 0).')
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
            setSubmitSuccess(orderCode ? `Tạo đơn hàng thành công: ${orderCode}` : 'Tạo đơn hàng thành công.')
            setOrderDetailRows([createEmptyOrderDetailRow()])
            setShowCreateOrderForm(false)
            setTab(1)
        } catch (error) {
            setSubmitError(error.message || 'Không thể kết nối API nội bộ.')
        } finally {
            setSubmitting(false)
        }
    }

    const toastMessage = submitError
        || detailError
        || ordersError
        || inventoryError
        || uiWarning
        || submitSuccess
        || inventoryInfo

    const toastType = (submitError || detailError || ordersError || inventoryError)
        ? 'error'
        : (uiWarning || inventoryInfo)
            ? 'warning'
            : toastMessage
                ? 'success'
                : ''

    const totalOrderPages = Math.max(1, Math.ceil(orders.length / ordersPerPage))
    const currentOrderPage = Math.min(Math.max(ordersPage, 1), totalOrderPages)
    const pagedOrders = orders.slice((currentOrderPage - 1) * ordersPerPage, currentOrderPage * ordersPerPage)

    const openOrderDetailFromRow = (order) => {
        const selectedId = Number(order?.orderId || order?.id)
        if (selectedId > 0) {
            setDetailOrderId(String(selectedId))
            fetchOrderById(selectedId)
        }
    }

    const clearToast = () => {
        setSubmitError('')
        setDetailError('')
        setOrdersError('')
        setInventoryError('')
        setUiWarning('')
        setSubmitSuccess('')
        setInventoryInfo('')
    }

    useEffect(() => {
        if (!toastMessage) return undefined

        const timer = window.setTimeout(() => {
            clearToast()
        }, 3200)

        return () => window.clearTimeout(timer)
    }, [toastMessage])

    const detailBackendStatus = getBackendOrderStatus(detailOrder)
    const detailDisplayStatus = normalizeStatus(detailOrder?.orderStatus || detailOrder?.status)
    const detailShippingLike = isShippedLikeStatus(detailDisplayStatus) || isShippedLikeStatus(detailBackendStatus)

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {toastMessage ? (
                <div className="fixed top-4 right-4 z-[80] pointer-events-none">
                    <div className="pointer-events-auto w-[min(92vw,24rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <div className="px-4 py-3 flex items-start gap-3">
                            <span className={`material-symbols-outlined mt-0.5 ${toastType === 'success' ? 'text-emerald-600 dark:text-emerald-400' : toastType === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                {toastType === 'success' ? 'check_circle' : toastType === 'warning' ? 'warning' : 'error'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">
                                    {toastType === 'success' ? 'Thao tác thành công' : toastType === 'warning' ? 'Thông báo' : 'Có lỗi xảy ra'}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">{toastMessage}</p>
                            </div>
                            <button
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={clearToast}
                                aria-label="Đóng thông báo"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div className={`h-1 rounded-b-xl ${toastType === 'success' ? 'bg-emerald-500/80' : toastType === 'warning' ? 'bg-amber-500/80' : 'bg-red-500/80'}`} />
                    </div>
                </div>
            ) : null}

            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">storefront</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Cổng đặt hàng cửa hàng</h2>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Chi nhánh 042</span>
                </div>
                <div className="flex flex-1 justify-end gap-6 items-center">
                    <nav className="hidden md:flex items-center gap-8">
                        {['Tạo Đơn Hàng', 'Danh Sách Đơn'].map((item, i) => (
                            <button key={item} onClick={() => setTab(i)} className={`text-sm font-medium transition-colors ${i === tab ? 'text-primary font-semibold border-b-2 border-primary pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-primary'}`}>{item}</button>
                        ))}
                    </nav>
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-full size-9" />
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

                {/* TAB 0: Place Order */}
                {tab === 0 && (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">Tạo đơn hàng</h1>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold">Tạo đơn hàng theo biểu mẫu</p>
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
                                + Tạo đơn hàng
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">Danh sách sản phẩm</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click vào sản phẩm để thêm vào giỏ hàng</p>
                                </div>
                                {orderDetailRows.length > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                                        <span className="text-sm font-semibold">{orderDetailRows.length} sản phẩm</span>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {productOptions.length > 0 ? (
                                    productOptions.map((product) => {
                                        const inCart = orderDetailRows.find(row => Number(row.productId) === Number(product.id))
                                        const quantity = inCart ? Number(inCart.quantityOrdered) : 0
                                        const price = product.internalPrice || 0

                                        return (
                                            <div
                                                key={product.id}
                                                onClick={() => {
                                                    // Add product to order details WITHOUT opening form
                                                    const existingIndex = orderDetailRows.findIndex(row => Number(row.productId) === Number(product.id))
                                                    if (existingIndex >= 0) {
                                                        // Increase quantity if already exists
                                                        const currentQty = Number(orderDetailRows[existingIndex].quantityOrdered) || 0
                                                        updateOrderDetailRow(existingIndex, 'quantityOrdered', String(currentQty + 1))
                                                    } else {
                                                        // Add new row
                                                        setOrderDetailRows(prev => [...prev, { productId: String(product.id), quantityOrdered: '1' }])
                                                    }
                                                }}
                                                className={`rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer ${quantity > 0
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mã: {product.id}</p>
                                                        <p className="text-sm font-bold text-primary mt-1">
                                                            {price.toLocaleString('vi-VN')} đ
                                                        </p>
                                                        {quantity > 0 ? (
                                                            <div className="mt-3 flex items-center justify-center w-full h-8 rounded-lg bg-primary text-white text-xs font-semibold">
                                                                <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                                                                Đã thêm: {quantity}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-3 flex items-center justify-center w-full h-8 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors">
                                                                <span className="material-symbols-outlined text-[16px] mr-1">add</span>
                                                                Thêm vào đơn
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="col-span-full text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                                        Chưa có dữ liệu sản phẩm.
                                    </div>
                                )}
                            </div>
                        </div>

                        {showCreateOrderForm && (
                            <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-start justify-center p-4 pt-6 md:pt-10 overflow-y-auto">
                                <div className="w-full max-w-3xl max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <p className="text-base font-semibold">Tạo đơn hàng</p>
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
                                                    <option key={store.id} value={String(store.id)}>{store.name} ({store.id})</option>
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

                                    <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-sm font-semibold">Sản phẩm đã chọn ({orderDetailRows.length})</p>
                                            <button
                                                type="button"
                                                onClick={addOrderDetailRow}
                                                className="flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">add</span>
                                                Thêm sản phẩm
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {orderDetailRows.map((row, index) => {
                                                const selectedProduct = productOptions.find(p => String(p.id) === String(row.productId))
                                                const isNewRow = !selectedProduct || row.productId === ''
                                                const price = selectedProduct?.internalPrice || 0
                                                const quantity = Number(row.quantityOrdered) || 0
                                                const subtotal = price * quantity

                                                return (
                                                    <div key={`detail-row-${index}`} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            {isNewRow ? (
                                                                <select
                                                                    value={row.productId}
                                                                    onChange={(e) => updateOrderDetailRow(index, 'productId', e.target.value)}
                                                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium"
                                                                >
                                                                    <option value="">-- Chọn sản phẩm --</option>
                                                                    {productOptions.map((product) => (
                                                                        <option key={product.id} value={String(product.id)}>
                                                                            {product.name} - {(product.internalPrice || 0).toLocaleString('vi-VN')} đ
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <div className="px-3 py-2">
                                                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedProduct.name}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Mã: {selectedProduct.id}</p>
                                                                        <span className="text-xs text-slate-400">•</span>
                                                                        <p className="text-xs font-semibold text-primary">{price.toLocaleString('vi-VN')} đ</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <label className="flex flex-col gap-1">
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Số lượng</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={row.quantityOrdered}
                                                                    onChange={(e) => updateOrderDetailRow(index, 'quantityOrdered', e.target.value)}
                                                                    className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-center font-semibold"
                                                                />
                                                            </label>
                                                            {!isNewRow && (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Thành tiền</span>
                                                                    <div className="h-9 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center">
                                                                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                                                            {subtotal.toLocaleString('vi-VN')} đ
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOrderDetailRow(index)}
                                                                disabled={orderDetailRows.length === 1}
                                                                className="mt-5 w-9 h-9 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                                                title="Xóa sản phẩm"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Total Amount Display */}
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tổng cộng:</p>
                                            <p className="text-xl font-bold text-primary">
                                                {orderDetailRows.reduce((total, row) => {
                                                    const product = productOptions.find(p => String(p.id) === String(row.productId))
                                                    const price = product?.internalPrice || 0
                                                    const quantity = Number(row.quantityOrdered) || 0
                                                    return total + (price * quantity)
                                                }, 0).toLocaleString('vi-VN')} đ
                                            </p>
                                        </div>
                                    </div>

                                    {optionsLoading && (
                                        <div className="mb-3 text-xs">
                                            <p className="text-slate-500 dark:text-slate-400">Đang tải danh sách cửa hàng/sản phẩm...</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setOrderDetailRows([createEmptyOrderDetailRow()])}
                                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Xóa mẫu nhập
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
                            <h1 className="text-2xl font-bold">Danh sách đơn hàng</h1>
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
                                            <option key={store.id} value={String(store.id)}>{store.name} ({store.id})</option>
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
                                        <option value="">Tất cả</option>
                                        <option value="PENDING">Chờ duyệt</option>
                                        <option value="APPROVED">Đã duyệt</option>
                                        <option value="PARTIAL_SHIPPING">Giao một phần</option>
                                        <option value="SHIPPING">Đang giao</option>
                                        <option value="COMPLETED">Đã nhận hàng</option>
                                        <option value="REJECTED">Đã từ chối</option>
                                        <option value="CANCELLED">Đã hủy</option>
                                    </select>
                                </label>
                                <button
                                    onClick={fetchMyOrders}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90"
                                >
                                    Tải danh sách
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">Danh sách đơn</p>
                                {detailLoading && <p className="text-xs text-slate-500 dark:text-slate-400">Đang tải chi tiết đơn...</p>}
                            </div>
                        </div>
                        {ordersLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách đơn hàng...</p>}
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
                                            Xem ngay đơn vừa tạo {lastCreatedOrderId}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {!ordersLoading && !ordersError && orders.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                                    Nhấn vào từng dòng để xem chi tiết và thao tác.
                                </div>
                                <table className="list-nowrap w-full text-left border-collapse table-fixed">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Cửa hàng</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">SL</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Tổng tiền</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Thanh toán</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {pagedOrders.map((order) => {
                                            const normalizedPaymentStatus = normalizePaymentStatus(order.paymentStatus)

                                            return (
                                                <tr
                                                    key={order.id}
                                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                                    onClick={() => openOrderDetailFromRow(order)}
                                                    title={`Xem chi tiết đơn ${order.id}`}
                                                >
                                                    <td className="px-3 py-2 text-xs font-semibold">{order.id}</td>
                                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{order.storeName}</td>
                                                    <td className="px-3 py-2 text-xs max-w-[180px]">
                                                        <div className="flex items-center gap-1">
                                                            <span className="whitespace-nowrap">{order.productLabel}</span>
                                                            {order.hasMultipleProducts && (
                                                                <div className="relative group flex-shrink-0">
                                                                    <span className="material-symbols-outlined text-[14px] text-slate-400 hover:text-primary cursor-help">
                                                                        info
                                                                    </span>
                                                                    <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-max max-w-xs bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-lg p-3 border border-slate-700">
                                                                        <p className="font-semibold mb-1">Tất cả sản phẩm:</p>
                                                                        <div className="whitespace-pre-line">{order.allProductNames}</div>
                                                                        <div className="absolute -top-1 left-2 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-l border-t border-slate-700 transform rotate-45"></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-center">{order.totalQuantity}</td>
                                                    <td className="px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">
                                                        {(order.totalAmount || 0).toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${order.statusStyle}`}>{order.status}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${paymentStatusStyle[normalizedPaymentStatus] || paymentStatusStyle.UNPAID}`}>
                                                            {paymentStatusLabel[normalizedPaymentStatus] || normalizedPaymentStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    openOrderDetailFromRow(order)
                                                                }}
                                                                className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                title="Xem chi tiết"
                                                                aria-label="Xem chi tiết"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                            </button>

                                                            {canCancelOrderInList(order.backendStatus || order.status) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation()
                                                                        if (!window.confirm(`Xác nhận hủy đơn ${order.orderId}?`)) return
                                                                        await cancelOrderById(order.orderId)
                                                                    }}
                                                                    disabled={cancelLoading || receiveLoading || returnLoading}
                                                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                                                                    title="Hủy đơn"
                                                                    aria-label="Hủy đơn"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Trang {currentOrderPage}/{totalOrderPages} • {orders.length} đơn hàng
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentOrderPage <= 1}
                                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                        >
                                            Trước
                                        </button>
                                        <button
                                            onClick={() => setOrdersPage((prev) => Math.min(totalOrderPages, prev + 1))}
                                            disabled={currentOrderPage >= totalOrderPages}
                                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {detailOrder && (
                            <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto">
                                <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-3rem)] flex flex-col">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-[24px]">receipt_long</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-lg">Chi tiết đơn hàng</p>
                                                <p className="text-white/80 text-sm">{detailOrder.orderId || detailOrder.id}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDetailOrder(null)
                                                setDetailError('')
                                            }}
                                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-white text-[20px]">close</span>
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 overflow-y-auto min-h-0">
                                        {/* Status and Payment */}
                                        <div className="flex flex-wrap items-center gap-2 mb-6">
                                            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${orderStatusStyle[detailDisplayStatus] || orderStatusStyle['Chờ duyệt']}`}>
                                                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                                                <span>{detailDisplayStatus}</span>
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${paymentStatusStyle[normalizePaymentStatus(detailOrder.paymentStatus)] || paymentStatusStyle.UNPAID}`}>
                                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                                <span>{paymentStatusLabel[normalizePaymentStatus(detailOrder.paymentStatus)] || normalizePaymentStatus(detailOrder.paymentStatus)}</span>
                                            </span>
                                        </div>

                                        {/* Info Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Cửa hàng</p>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {detailOrder?.storeName || detailOrder?.store?.storeName || detailOrder?.store?.name || getStoreNameById(detailOrder?.storeId)}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ngày tạo</p>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toReadableDate(detailOrder.createdAt)}</p>
                                            </div>
                                            <div className="rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">payments</span>
                                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">Tổng tiền</p>
                                                </div>
                                                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                                    {(detailOrder.totalAmount || 0).toLocaleString('vi-VN')} đ
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-primary text-[20px]">local_shipping</span>
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Giao dự kiến</p>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toReadableDate(detailOrder.expectedDeliveryDate)}</p>
                                            </div>
                                        </div>

                                        {/* Products Table */}
                                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
                                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách sản phẩm</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 dark:bg-slate-800/30">
                                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Sản phẩm</th>
                                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-center">Đơn giá</th>
                                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-center">Đặt</th>
                                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-center">Đã giao</th>
                                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Thành tiền</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {buildDetailRowsWithPrice(detailOrder.internalOrderDetails || detailOrder.orderDetails || [], detailOrder.totalAmount).length > 0 ? (
                                                            buildDetailRowsWithPrice(detailOrder.internalOrderDetails || detailOrder.orderDetails || [], detailOrder.totalAmount).map((row, idx) => {
                                                                const unitPrice = row._unitPrice || 0
                                                                const quantity = row._quantity || 0
                                                                const subtotal = row._subtotal || 0

                                                                return (
                                                                    <tr key={row.detailId || `${row.productId}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="material-symbols-outlined text-slate-400 text-[20px]">inventory_2</span>
                                                                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                                                    {row?.product?.productName || row?.product?.name || getProductNameById(row.productId)}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-300">
                                                                            {unitPrice.toLocaleString('vi-VN')} đ
                                                                        </td>
                                                                        <td className="px-4 py-3 text-sm text-center font-semibold text-slate-900 dark:text-slate-100">{quantity}</td>
                                                                        <td className="px-4 py-3 text-sm text-center font-semibold text-emerald-600 dark:text-emerald-400">{getDetailShippedQty(row)}</td>
                                                                        <td className="px-4 py-3 text-sm text-right font-bold text-slate-900 dark:text-slate-100">
                                                                            {subtotal.toLocaleString('vi-VN')} đ
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="px-4 py-6 text-sm text-center text-slate-500 dark:text-slate-400">Đơn hàng chưa có chi tiết sản phẩm.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Error Message */}
                                        {detailError && (
                                            <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                                <div className="flex items-start gap-2">
                                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[20px]">error</span>
                                                    <p className="text-sm text-red-700 dark:text-red-300">{detailError}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        {detailBackendStatus !== 'CANCELLED' && (
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {canPayOrder(detailBackendStatus, detailOrder.paymentStatus) && (
                                                    <button
                                                        onClick={() => openPaymentModal({
                                                            orderId: detailOrder.orderId || detailOrder.id,
                                                            totalAmount: detailOrder.totalAmount || 0,
                                                            orderStatus: detailBackendStatus,
                                                            backendStatus: detailBackendStatus,
                                                            paymentStatus: detailOrder.paymentStatus,
                                                        })}
                                                        className="flex-1 min-w-[140px] h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">payments</span>
                                                        Thanh toán
                                                    </button>
                                                )}

                                                {isPendingOrder(detailBackendStatus) && (
                                                    <div className="w-full rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                                                        Đơn chưa duyệt, chưa thể thanh toán.
                                                    </div>
                                                )}

                                                {isShippingUnpaidOrder(detailBackendStatus, detailOrder.paymentStatus) && (
                                                    <div className="w-full rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                                                        Đơn chưa thanh toán, vui lòng thanh toán trước khi nhận hàng.
                                                    </div>
                                                )}

                                                {detailShippingLike && (
                                                    <>
                                                        {canReceiveOrder(detailBackendStatus, detailOrder.paymentStatus) && (
                                                            <button
                                                                onClick={() => confirmReceivedById(detailOrder.orderId || detailOrder.id)}
                                                                disabled={receiveLoading || returnLoading}
                                                                className="flex-1 min-w-[140px] h-11 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                                {receiveLoading ? 'Đang xác nhận...' : 'Đã nhận hàng'}
                                                            </button>
                                                        )}
                                                        {canReturnOrder(detailBackendStatus) && (
                                                            <button
                                                                onClick={() => returnOrderById(detailOrder.orderId || detailOrder.id)}
                                                                disabled={receiveLoading || returnLoading}
                                                                className="flex-1 min-w-[140px] h-11 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
                                                                {returnLoading ? 'Đang gửi...' : 'Trả hàng'}
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                {normalizeApiOrderStatus(detailBackendStatus) === 'PARTIAL_SHIPPING' && (
                                                    <div className="w-full rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                                                        Đơn đang giao một phần. Chỉ khi giao đủ và lên SHIPPING mới xác nhận đã nhận hàng.
                                                    </div>
                                                )}

                                                {getOrderStatusActions(detailBackendStatus).map((action) => (
                                                    <button
                                                        key={`detail-${detailOrder.orderId || detailOrder.id}-${action.status}`}
                                                        onClick={() => updateOrderStatusById(detailOrder.orderId || detailOrder.id, action.status)}
                                                        disabled={statusUpdating === `${detailOrder.orderId || detailOrder.id}-${action.status}` || cancelLoading || receiveLoading || returnLoading}
                                                        className="flex-1 min-w-[140px] h-11 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
                                                    >
                                                        {statusUpdating === `${detailOrder.orderId || detailOrder.id}-${action.status}` ? 'Đang cập nhật...' : action.label}
                                                    </button>
                                                ))}
                                                {isPendingOrder(detailBackendStatus) && (
                                                    <button
                                                        onClick={() => cancelOrderById(detailOrder.orderId || detailOrder.id)}
                                                        disabled={cancelLoading || receiveLoading || returnLoading}
                                                        className="h-11 px-4 rounded-lg border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                        {cancelLoading ? 'Đang hủy...' : 'Hủy đơn'}
                                                    </button>
                                                )}

                                            </div>
                                        )}
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
                                <h1 className="text-2xl font-bold">Tồn Kho</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Đồng bộ trực tiếp từ API Inventory theo cửa hàng hoặc toàn hệ thống.</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={inventoryFilter}
                                    onChange={(e) => setInventoryFilter(e.target.value)}
                                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                                >
                                    <option value="store">Theo cửa hàng đã chọn</option>
                                    <option value="all">Toàn hệ thống</option>
                                </select>
                                <button
                                    onClick={fetchInventory}
                                    className="flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                                    Tải lại
                                </button>
                                <button onClick={() => setTab(0)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>Đặt thêm hàng
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Mặt hàng', value: inventoryRows.length },
                                { label: 'Sắp hết', value: inventoryRows.filter((row) => row.status === 'low').length },
                                { label: 'Cần bổ sung ngay', value: inventoryRows.filter((row) => row.status === 'critical').length },
                                { label: 'Tổng số lượng', value: inventoryRows.reduce((sum, row) => sum + Number(row.currentQuantity || 0), 0) },
                            ].map((card) => (
                                <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-4">{card.label}</p>
                                    <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                            <table className="w-full min-w-[840px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        {['Sản phẩm', 'Vị trí', 'Số lượng hiện tại', 'Mức tối thiểu', 'Cập nhật lần cuối', 'Trạng thái', 'Hành động'].map(h => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {inventoryLoading ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Đang tải tồn kho...</td>
                                        </tr>
                                    ) : null}

                                    {!inventoryLoading && inventoryRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Không có dữ liệu tồn kho phù hợp.</td>
                                        </tr>
                                    ) : null}

                                    {!inventoryLoading && inventoryRows.map((item) => (
                                        <tr key={`${item.id}-${item.productId}`} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${stockBg[item.status]}`}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400">inventory_2</span>
                                                    <div>
                                                        <p className="font-medium text-sm">{item.productName}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Mã sản phẩm: {item.productId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{item.locationType} {item.locationId || 'Không có'}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-bold text-sm ${item.status === 'critical' ? 'text-red-600 dark:text-red-400' : item.status === 'low' ? 'text-amber-600 dark:text-amber-400' : ''}`}>{item.currentQuantity}</span>
                                                    <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        <div className={`h-full rounded-full ${statusColors[item.status]}`} style={{ width: `${Math.min(100, (item.currentQuantity / Math.max(1, item.minQuantity * 2)) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{item.minQuantity || '-'}</td>
                                            <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{toReadableDate(item.lastUpdated)}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${item.status === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : item.status === 'low' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
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

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">Lịch sử biến động tồn kho</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Hiển thị 20 giao dịch gần nhất</p>
                            </div>
                            <table className="w-full min-w-[820px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        {['Mã log', 'Sản phẩm', 'Vị trí', 'Lý do/Loại giao dịch', 'Số lượng thay đổi', 'Tham chiếu', 'Thời gian'].map((h) => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {inventoryLoading ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Đang tải logs...</td>
                                        </tr>
                                    ) : null}

                                    {!inventoryLoading && inventoryLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Chưa có giao dịch tồn kho.</td>
                                        </tr>
                                    ) : null}

                                    {!inventoryLoading && inventoryLogs.map((log) => (
                                        <tr key={`${log.id}-${log.inventoryId}-${log.createdAt || 'no-date'}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-semibold">{log.id || log.inventoryId}</td>
                                            <td className="px-5 py-3 text-sm">{log.productName}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{log.locationType} {log.locationId || 'Không có'}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                <p>{log.action}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Reason: {log.reason || '-'}</p>
                                            </td>
                                            <td className={`px-5 py-3 text-sm font-semibold ${log.quantityChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                <p>{log.referenceType || 'Không có'}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Ref ID: {log.referenceId ?? '-'}</p>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{toReadableDate(log.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedPaymentOrder && (
                <div
                    className="fixed inset-0 z-[70] flex items-start md:items-center justify-center bg-slate-900/45 p-4 overflow-y-auto"
                    onClick={() => !paymentLoading && setShowPaymentModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-semibold">Chọn phương thức thanh toán</h3>
                            <button
                                type="button"
                                onClick={() => !paymentLoading && setShowPaymentModal(false)}
                                disabled={paymentLoading}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm">
                                <span className="font-semibold">Đơn hàng:</span> {selectedPaymentOrder.orderId}
                            </p>
                            <p className="text-sm mt-1">
                                <span className="font-semibold">Tổng tiền:</span>{' '}
                                {(selectedPaymentOrder.totalAmount || 0).toLocaleString('vi-VN')} đ
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handlePaymentMethod('bank')}
                                disabled={paymentLoading}
                                className="w-full h-12 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60 flex items-center gap-3"
                            >
                                <span className="material-symbols-outlined text-[24px] text-primary">account_balance</span>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chuyển khoản thủ công</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Xác nhận đã nhận tiền</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handlePaymentMethod('vnpay')}
                                disabled={paymentLoading}
                                className="w-full h-12 px-4 rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-60 flex items-center gap-3"
                            >
                                <span className="material-symbols-outlined text-[24px] text-blue-600 dark:text-blue-400">qr_code</span>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">VNPAY</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Thanh toán qua cổng VNPAY</p>
                                </div>
                            </button>
                        </div>

                        {paymentLoading && (
                            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                                    Đang xử lý thanh toán...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    )
}
