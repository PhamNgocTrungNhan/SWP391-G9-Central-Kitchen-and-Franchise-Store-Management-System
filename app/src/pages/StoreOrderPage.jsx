import { useEffect, useState } from 'react'
import { decodeJwtPayload, getStoredToken } from '../utils/auth'

const fallbackStoreOptions = [{ id: 1, name: 'Cửa hàng #1' }]
const fallbackProductOptions = [
    { id: 1, name: 'Bột mì đa dụng' },
    { id: 2, name: 'Lá húng tươi' },
    { id: 3, name: 'Đế bánh pizza' },
    { id: 4, name: 'Sốt burger' },
    { id: 5, name: 'Phô mai Mozzarella' },
    { id: 6, name: 'Sốt cà chua nền' },
]

const supplierInactiveLabel = 'Ngừng hoạt động'

const statusColors = { ok: 'bg-emerald-500', low: 'bg-amber-500', critical: 'bg-red-500' }
const stockBg = { ok: '', low: 'bg-amber-50 dark:bg-amber-900/10', critical: 'bg-red-50 dark:bg-red-900/10' }
const orderStatusStyle = {
    Delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'In Transit': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    Confirmed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const apiStatusToUi = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    SHIPPING: 'Shipped',
    DELIVERED: 'Delivered',
    COMPLETED: 'Delivered',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
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
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function normalizeLocationType(locationType) {
    const raw = String(locationType || '').toUpperCase()
    if (raw === 'KITCHEN') return 'Bếp trung tâm'
    if (raw === 'STORE') return 'Cửa hàng'
    return locationType || 'N/A'
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
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
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
        || 'N/A'

    return {
        id: parseSafeNumber(item?.logId ?? item?.transactionId ?? item?.id, 0),
        inventoryId: parseSafeNumber(item?.inventoryId, 0),
        productId,
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
        locationType: normalizeLocationType(item?.locationType),
        locationTypeRaw: String(item?.locationType || '').toUpperCase(),
        locationId: parseSafeNumber(item?.locationId, 0),
        action,
        quantityChange: parseSafeNumber(item?.quantityChanged ?? item?.changeQuantity ?? item?.quantity ?? item?.amount, 0),
        note: item?.note || item?.reason || item?.description || '',
        reason: item?.reason || '',
        referenceType: referenceType || 'N/A',
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

function normalizeSupplierList(raw) {
    const records = parseArrayData(raw)
    return records
        .map((item) => {
            const supplierId = parseSafeNumber(item?.supplierId ?? item?.id, 0)
            if (!supplierId) return null
            return {
                supplierId,
                supplierName: item?.supplierName || item?.name || `Nhà cung cấp #${supplierId}`,
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
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitSuccess, setSubmitSuccess] = useState('')
    const [lastCreatedOrderId, setLastCreatedOrderId] = useState(null)
    const [orderDetailRows, setOrderDetailRows] = useState([{ productId: '', quantityOrdered: '1' }])
    const [formStoreId, setFormStoreId] = useState(localStorage.getItem('store_id') || '1')
    const [storeOptions, setStoreOptions] = useState(fallbackStoreOptions)
    const [productOptions, setProductOptions] = useState(fallbackProductOptions)
    const [supplierOptions, setSupplierOptions] = useState([])
    const [optionsLoading, setOptionsLoading] = useState(false)
    const [optionsError, setOptionsError] = useState('')
    const [inventoryLoading, setInventoryLoading] = useState(false)
    const [inventoryError, setInventoryError] = useState('')
    const [inventoryInfo, setInventoryInfo] = useState('')
    const [inventoryRows, setInventoryRows] = useState([])
    const [inventoryLogs, setInventoryLogs] = useState([])
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

            const [storeRes, productRes, supplierRes] = await Promise.all([
                fetch(`${apiBase}/Organization/stores`, { method: 'GET', headers }),
                fetch(`${apiBase}/Products/manufactured`, { method: 'GET', headers }),
                fetch(`${apiBase}/Suppliers`, { method: 'GET', headers }),
            ])

            const storesJson = await storeRes.json().catch(() => [])
            const productsJson = await productRes.json().catch(() => [])
            const suppliersJson = await supplierRes.json().catch(() => [])

            let stores = storeRes.ok ? toOptionList(storesJson, getStoreIdFromItem, getStoreNameFromItem) : []
            if (!stores.length) {
                const scopedStoreId = resolveStoreIdFromTokenOrStorage()
                if (scopedStoreId > 0) {
                    stores = [{ id: scopedStoreId, name: `Cửa hàng #${scopedStoreId}` }]
                }
            }

            let products = productRes.ok ? toOptionList(productsJson, getProductIdFromItem, getProductNameFromItem) : []

            if (!products.length) {
                const inventoryRes = await fetch(`${apiBase}/Inventory/stock`, { method: 'GET', headers })
                const inventoryJson = await inventoryRes.json().catch(() => [])
                if (inventoryRes.ok) {
                    const inventoryProductMap = new Map()
                    parseArrayData(inventoryJson).forEach((item) => {
                        const id = parseSafeNumber(item?.productId, 0)
                        if (!id || inventoryProductMap.has(id)) return
                        const name = item?.product?.productName || item?.product?.name || `Sản phẩm #${id}`
                        inventoryProductMap.set(id, { id, name })
                    })
                    products = Array.from(inventoryProductMap.values())
                }
            }

            const suppliers = supplierRes.ok ? normalizeSupplierList(suppliersJson) : []

            setStoreOptions(stores.length ? stores : fallbackStoreOptions)
            setProductOptions(products.length ? products : fallbackProductOptions)
            setSupplierOptions(suppliers)

            if (!storeRes.ok || !productRes.ok || !supplierRes.ok) {
                setOptionsError('Một số API danh mục bị hạn chế quyền. Hệ thống đã tự fallback để vẫn tạo đơn bình thường.')
            }
        } catch {
            setStoreOptions(fallbackStoreOptions)
            setProductOptions(fallbackProductOptions)
            setSupplierOptions([])
            setOptionsError('Không kết nối được API danh mục. Đang dùng dữ liệu tạm.')
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
            setInventoryError('Store ID không hợp lệ để tải tồn kho theo cửa hàng.')
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
                if (id > 0) acc[id] = item?.name || `Product #${id}`
                return acc
            }, {})

            let inventoryRecords = parseArrayData(inventoryJson)

            if (inventoryFilter === 'store' && inventoryRecords.length === 0) {
                const stockRes = await fetch(`${apiBase}/Inventory/stock`, { method: 'GET', headers })
                const stockJson = await stockRes.json().catch(() => [])

                if (stockRes.ok) {
                    const stockRecords = parseArrayData(stockJson)
                    const storeScopedFromStock = stockRecords.filter((row) => {
                        const rowLocationType = String(row?.locationType || '').toUpperCase()
                        const rowLocationId = Number(row?.locationId)
                        return rowLocationType === 'STORE' && rowLocationId === parsedStoreId
                    })

                    inventoryRecords = storeScopedFromStock
                    if (storeScopedFromStock.length > 0) {
                        setInventoryInfo('API /Inventory/store/' + parsedStoreId + ' đang trả rỗng, đã tự fallback từ /Inventory/stock để hiển thị dữ liệu store.')
                    } else {
                        setInventoryInfo('Store #' + parsedStoreId + ' hiện chưa có bản ghi tồn kho trong hệ thống.')
                    }
                }
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
                setInventoryInfo('Hiện chưa có lịch sử biến động tồn kho cho Store #' + parsedStoreId + '.')
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
        return apiStatusToUi[String(rawStatus).toUpperCase()] || rawStatus
    }

    const isShippedLikeStatus = (rawStatus) => {
        const normalized = String(normalizeStatus(rawStatus)).toUpperCase()
        return normalized === 'SHIPPED' || normalized === 'IN TRANSIT'
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
            const effectiveStoreId = parsedStoreId > 0 ? parsedStoreId : 1
            params.set('storeId', String(effectiveStoreId))
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

    const confirmReceivedById = async (orderId) => {
        setDetailError('')
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
                throw new Error(data?.message || data?.title || 'Không thể xác nhận đã nhận hàng.')
            }

            const updatedStatus = normalizeStatus('DELIVERED')
            setDetailOrder((prev) => prev ? { ...prev, orderStatus: updatedStatus, status: updatedStatus } : prev)
            setSubmitSuccess(data?.message || `Đơn #${orderId} đã được xác nhận nhận hàng.`)
            fetchMyOrders()
        } catch (error) {
            setDetailError(error.message || 'Xác nhận nhận hàng thất bại.')
        } finally {
            setReceiveLoading(false)
        }
    }

    const returnOrderById = async (orderId) => {
        setDetailError('')
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
            }

            const reason = window.prompt('Nhập lý do trả hàng (có thể bỏ trống):', '')

            setReturnLoading(true)
            const response = await fetch(`${apiBase}/internal-orders/${orderId}/reject`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason || 'Store trả hàng sau khi nhận lô giao.' }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể trả hàng cho đơn này.')
            }

            const updatedStatus = normalizeStatus('REJECTED')
            setDetailOrder((prev) => prev ? { ...prev, orderStatus: updatedStatus, status: updatedStatus } : prev)
            setSubmitSuccess(data?.message || `Đã gửi yêu cầu trả hàng cho đơn #${orderId}.`)
            fetchMyOrders()
        } catch (error) {
            setDetailError(error.message || 'Trả hàng thất bại.')
        } finally {
            setReturnLoading(false)
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

    const toastMessage = submitError
        || detailError
        || ordersError
        || inventoryError
        || optionsError
        || submitSuccess
        || inventoryInfo

    const toastType = (submitError || detailError || ordersError || inventoryError)
        ? 'error'
        : (optionsError || inventoryInfo)
            ? 'warning'
            : toastMessage
                ? 'success'
                : ''

    const totalOrderPages = Math.max(1, Math.ceil(orders.length / ordersPerPage))
    const currentOrderPage = Math.min(Math.max(ordersPage, 1), totalOrderPages)
    const pagedOrders = orders.slice((currentOrderPage - 1) * ordersPerPage, currentOrderPage * ordersPerPage)

    const clearToast = () => {
        setSubmitError('')
        setDetailError('')
        setOrdersError('')
        setInventoryError('')
        setOptionsError('')
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
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Cổng Đặt Hàng Cửa Hàng</h2>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Chi nhánh #042</span>
                </div>
                <div className="flex flex-1 justify-end gap-6 items-center">
                    <nav className="hidden md:flex items-center gap-8">
                        {['Tạo Đơn Hàng', 'Danh Sách Đơn'].map((item, i) => (
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

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-sm font-semibold">Danh sách nhà cung cấp</p>
                            </div>
                            <table className="w-full min-w-[760px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã NCC</th>
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên nhà cung cấp</th>
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Địa chỉ</th>
                                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {supplierOptions.length > 0 ? (
                                        supplierOptions.map((supplier) => (
                                            <tr key={supplier.supplierId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-2 text-sm font-semibold">#{supplier.supplierId}</td>
                                                <td className="px-4 py-2 text-sm">{supplier.supplierName}</td>
                                                <td className="px-4 py-2 text-sm">{supplier.contactInfo}</td>
                                                <td className="px-4 py-2 text-sm">{supplier.address}</td>
                                                <td className="px-4 py-2 text-sm">
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${supplier.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                        {supplier.isActive ? 'Đang hoạt động' : supplierInactiveLabel}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Chưa tải được danh sách nhà cung cấp từ API.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {showCreateOrderForm && (
                            <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
                                <div className="w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 mt-2 sm:mt-0">
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
                                        <option value="SHIPPED">SHIPPED</option>
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
                                        {pagedOrders.map((order) => (
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
                                                        {isShippedLikeStatus(order.status) && (
                                                            <>
                                                                <button
                                                                    onClick={() => confirmReceivedById(order.orderId)}
                                                                    disabled={receiveLoading || returnLoading}
                                                                    className="h-8 px-3 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                                                                    title="Xác nhận đã nhận hàng"
                                                                >
                                                                    Đã nhận hàng
                                                                </button>
                                                                <button
                                                                    onClick={() => returnOrderById(order.orderId)}
                                                                    disabled={receiveLoading || returnLoading}
                                                                    className="h-8 px-3 inline-flex items-center justify-center rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-60"
                                                                    title="Trả hàng"
                                                                >
                                                                    Trả hàng
                                                                </button>
                                                            </>
                                                        )}
                                                        {order.status !== 'Cancelled' && (
                                                            <button
                                                                onClick={() => cancelOrderById(order.orderId)}
                                                                disabled={cancelLoading || receiveLoading || returnLoading}
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
                            <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
                                <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 mt-2 sm:mt-0">
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
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {isShippedLikeStatus(detailOrder.orderStatus || detailOrder.status) && (
                                                    <>
                                                        <button
                                                            onClick={() => confirmReceivedById(detailOrder.orderId || detailOrder.id)}
                                                            disabled={receiveLoading || returnLoading}
                                                            className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
                                                        >
                                                            {receiveLoading ? 'Đang xác nhận...' : 'Đã nhận hàng'}
                                                        </button>
                                                        <button
                                                            onClick={() => returnOrderById(detailOrder.orderId || detailOrder.id)}
                                                            disabled={receiveLoading || returnLoading}
                                                            className="h-8 px-3 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-60"
                                                        >
                                                            {returnLoading ? 'Đang gửi trả hàng...' : 'Trả hàng'}
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => cancelOrderById(detailOrder.orderId || detailOrder.id)}
                                                    disabled={cancelLoading || receiveLoading || returnLoading}
                                                    className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60"
                                                >
                                                    {cancelLoading ? 'Đang hủy đơn...' : 'Hủy Đơn Hàng Này'}
                                                </button>
                                            </div>
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
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Product #{item.productId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{item.locationType} #{item.locationId || 'N/A'}</td>
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
                                            <td className="px-5 py-3 text-sm font-semibold">#{log.id || log.inventoryId}</td>
                                            <td className="px-5 py-3 text-sm">{log.productName}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{log.locationType} #{log.locationId || 'N/A'}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                <p>{log.action}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Reason: {log.reason || '-'}</p>
                                            </td>
                                            <td className={`px-5 py-3 text-sm font-semibold ${log.quantityChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                <p>{log.referenceType || 'N/A'}</p>
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
        </div>
    )
}
