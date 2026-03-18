import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const statusColors = { ok: 'bg-emerald-500', low: 'bg-amber-500', critical: 'bg-red-500' }
const stockBg = { ok: '', low: 'bg-amber-50 dark:bg-amber-900/10', critical: 'bg-red-50 dark:bg-red-900/10' }

const inventoryActionLabel = {
    IN: 'Nhap kho',
    OUT: 'Xuat kho',
    ADJUST: 'Dieu chinh',
    TRANSFER_IN: 'Chuyen vao',
    TRANSFER_OUT: 'Chuyen ra',
    INITIAL_STOCK: 'Khoi tao ton kho',
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
    if (raw === 'KITCHEN') return 'Bep trung tam'
    if (raw === 'STORE') return 'Cua hang'
    return locationType || 'N/A'
}

function toReadableDate(dateString) {
    if (!dateString) return 'N/A'
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function parseIdFromLocationHeader(locationValue) {
    if (!locationValue) return 0
    const matched = String(locationValue).match(/\/(\d+)(?:\?.*)?$/)
    if (!matched) return 0
    const parsed = Number(matched[1])
    return Number.isFinite(parsed) ? parsed : 0
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
    const min = parseSafeNumber(item?.minimumQuantity ?? item?.minQuantity ?? item?.reorderLevel ?? item?.safetyStock, 0)

    return {
        id: parseSafeNumber(item?.inventoryId ?? item?.id, productId),
        productId,
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
        locationType: normalizeLocationType(item?.locationType),
        locationTypeRaw: String(item?.locationType || '').toUpperCase(),
        locationId: parseSafeNumber(item?.locationId, 0),
        currentQuantity: parseSafeNumber(item?.currentQuantity, 0),
        minQuantity: min,
        lastUpdated: item?.lastUpdated || item?.updatedAt || item?.modifiedAt || null,
        status: resolveInventoryStatus(item),
    }
}

function toInventoryLogRow(item, productNameById) {
    const productId = parseSafeNumber(item?.productId, 0)
    const rawAction = String(item?.transactionType || item?.type || item?.action || '').toUpperCase()
    const rawReason = String(item?.reason || '').toUpperCase()
    const action = inventoryActionLabel[rawAction]
        || inventoryActionLabel[rawReason]
        || item?.transactionType
        || item?.type
        || item?.action
        || item?.reason
        || 'N/A'

    return {
        id: parseSafeNumber(item?.logId ?? item?.transactionId ?? item?.id, 0),
        productId,
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
        locationType: normalizeLocationType(item?.locationType),
        locationTypeRaw: String(item?.locationType || '').toUpperCase(),
        locationId: parseSafeNumber(item?.locationId, 0),
        action,
        quantityChange: parseSafeNumber(item?.changeQuantity ?? item?.quantityChanged ?? item?.quantity ?? item?.amount, 0),
        reason: item?.reason || '',
        referenceType: item?.referenceType || 'N/A',
        referenceId: item?.referenceId,
        createdAt: item?.createdAt || item?.transactionDate || item?.timestamp || null,
    }
}

function toProductionBatchRow(item, productNameById) {
    const productId = parseSafeNumber(item?.productId, 0)
    const storeId = parseSafeNumber(item?.storeId ?? item?.store?.storeId ?? item?.store?.id, 0)
    const sourceOrderId = parseSafeNumber(item?.internalOrderId ?? item?.orderId ?? item?.sourceOrderId ?? item?.referenceId, 0)
    return {
        id: parseSafeNumber(item?.productionBatchId ?? item?.batchId ?? item?.id, 0),
        productId,
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
        storeId,
        storeName: item?.store?.storeName || item?.store?.name || (storeId ? `Store #${storeId}` : 'N/A'),
        sourceOrderId,
        sourceOrderCode: item?.orderCode || (sourceOrderId ? `#${sourceOrderId}` : 'N/A'),
        quantityPlanned: parseSafeNumber(item?.quantityPlanned, 0),
        quantityProduced: parseSafeNumber(item?.quantityProduced, 0),
        status: item?.status || item?.batchStatus || 'N/A',
        mfgDate: item?.mfgDate || item?.manufacturingDate || item?.createdAt || null,
    }
}

function normalizeOrderStatus(rawStatus) {
    const status = String(rawStatus || '').toUpperCase()
    if (status === 'APPROVED') return 'Approved'
    if (status === 'CONFIRMED') return 'Confirmed'
    if (status === 'PROCESSING') return 'Processing'
    if (status === 'PENDING') return 'Pending'
    if (status === 'DELIVERED' || status === 'COMPLETED') return 'Delivered'
    if (status === 'REJECTED') return 'Rejected'
    if (status === 'CANCELLED') return 'Cancelled'
    return rawStatus || 'Pending'
}

function normalizeInternalOrderRows(rawOrders, productNameById) {
    const records = parseArrayData(rawOrders)
    return records
        .map((item) => {
            const orderId = parseSafeNumber(item?.orderId ?? item?.internalOrderId ?? item?.id, 0)
            if (!orderId) return null

            const storeId = parseSafeNumber(item?.storeId ?? item?.store?.storeId ?? item?.store?.id, 0)
            const detailsRaw = Array.isArray(item?.internalOrderDetails)
                ? item.internalOrderDetails
                : Array.isArray(item?.orderDetails)
                    ? item.orderDetails
                    : []

            const details = detailsRaw
                .map((row, idx) => {
                    const productId = parseSafeNumber(row?.productId, 0)
                    const quantityOrdered = parseSafeNumber(row?.quantityOrdered, 0)
                    if (!productId || quantityOrdered <= 0) return null
                    return {
                        key: `${orderId}-${productId}-${idx}`,
                        productId,
                        productName: row?.product?.productName || row?.product?.name || productNameById[productId] || `Product #${productId}`,
                        quantityOrdered,
                    }
                })
                .filter(Boolean)

            return {
                orderId,
                orderCode: item?.orderCode || `#${orderId}`,
                status: normalizeOrderStatus(item?.orderStatus || item?.status),
                storeId,
                storeName: item?.store?.storeName || item?.store?.name || (storeId ? `Store #${storeId}` : 'N/A'),
                details,
            }
        })
        .filter(Boolean)
}

export default function BatchTraceabilityPage() {
    const navigate = useNavigate()
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const [inventoryMode, setInventoryMode] = useState('all')
    const [storeId, setStoreId] = useState(resolveDefaultStoreId)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [rows, setRows] = useState([])
    const [logs, setLogs] = useState([])
    const [batchLoading, setBatchLoading] = useState(false)
    const [batchError, setBatchError] = useState('')
    const [batchInfo, setBatchInfo] = useState('')
    const [batchNotice, setBatchNotice] = useState('')
    const [batches, setBatches] = useState([])
    const [showViewBatchForm, setShowViewBatchForm] = useState(false)
    const [showEditBatchForm, setShowEditBatchForm] = useState(false)
    const [showStatusBatchForm, setShowStatusBatchForm] = useState(false)
    const [viewBatchRow, setViewBatchRow] = useState(null)
    const [statusBatchRow, setStatusBatchRow] = useState(null)
    const [nextBatchStatus, setNextBatchStatus] = useState('IN_PROGRESS')
    const [nextQuantityActual, setNextQuantityActual] = useState('')
    const [batchStatusLoadingId, setBatchStatusLoadingId] = useState(null)
    const [editBatchId, setEditBatchId] = useState('')
    const [editBatchProductId, setEditBatchProductId] = useState('1')
    const [editBatchQuantityPlanned, setEditBatchQuantityPlanned] = useState('1')
    const [editBatchMfgDate, setEditBatchMfgDate] = useState(() => new Date().toISOString().slice(0, 16))
    const [batchDeleteLoadingId, setBatchDeleteLoadingId] = useState(null)
    const [batchCreateOrderKey, setBatchCreateOrderKey] = useState('')
    const [batchProductId, setBatchProductId] = useState('1')
    const [batchQuantityPlanned, setBatchQuantityPlanned] = useState('1')
    const [batchMfgDate, setBatchMfgDate] = useState(() => new Date().toISOString().slice(0, 16))
    const [orderRows, setOrderRows] = useState([])
    const [orderLoading, setOrderLoading] = useState(false)
    const [orderError, setOrderError] = useState('')
    const [productNameMap, setProductNameMap] = useState({})

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

    const fetchProductMap = async () => {
        const tk = token()
        try {
            const response = await fetch(`${apiBase}/products`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) return

            const records = parseArrayData(data)
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

    const fetchInventoryData = async () => {
        setError('')
        setInfo('')

        const tk = token()
        if (!tk) {
            setRows([])
            setLogs([])
            setError('Thieu token dang nhap. Vui long dang nhap lai.')
            return
        }

        const parsedStoreId = Number(storeId)
        if (inventoryMode === 'store' && (!parsedStoreId || parsedStoreId < 1)) {
            setRows([])
            setLogs([])
            setError('Store ID khong hop le de tai ton kho theo cua hang.')
            return
        }

        setLoading(true)
        try {
            const headers = {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
            }

            const inventoryUrl = inventoryMode === 'store'
                ? `${apiBase}/Inventory/store/${parsedStoreId}`
                : `${apiBase}/Inventory/stock`

            const [inventoryRes, logsRes] = await Promise.all([
                fetch(inventoryUrl, { method: 'GET', headers }),
                fetch(`${apiBase}/Inventory/logs`, { method: 'GET', headers }),
            ])

            const inventoryJson = await inventoryRes.json().catch(() => [])
            const logsJson = await logsRes.json().catch(() => [])

            if (!inventoryRes.ok) {
                throw new Error(inventoryJson?.message || inventoryJson?.title || 'Khong the tai du lieu ton kho.')
            }
            if (!logsRes.ok) {
                throw new Error(logsJson?.message || logsJson?.title || 'Khong the tai lich su bien dong ton kho.')
            }

            let inventoryRecords = parseArrayData(inventoryJson)
            if (inventoryMode === 'store' && inventoryRecords.length === 0) {
                const stockRes = await fetch(`${apiBase}/Inventory/stock`, { method: 'GET', headers })
                const stockJson = await stockRes.json().catch(() => [])
                if (stockRes.ok) {
                    const stockRecords = parseArrayData(stockJson)
                    inventoryRecords = stockRecords.filter((row) => {
                        const rowLocationType = String(row?.locationType || '').toUpperCase()
                        const rowLocationId = Number(row?.locationId)
                        return rowLocationType === 'STORE' && rowLocationId === parsedStoreId
                    })
                }

                if (inventoryRecords.length > 0) {
                    setInfo('API /Inventory/store/' + parsedStoreId + ' dang tra rong, da fallback sang /Inventory/stock de hien thi du lieu.')
                } else {
                    setInfo('Store #' + parsedStoreId + ' hien chua co ban ghi ton kho.')
                }
            }

            const normalizedRows = inventoryRecords
                .map((item) => toInventoryRow(item, productNameMap))
                .filter((item) => item.productId > 0)

            const normalizedLogs = parseArrayData(logsJson)
                .map((item) => toInventoryLogRow(item, productNameMap))
                .filter((item) => item.id > 0)
                .filter((item) => {
                    if (inventoryMode !== 'store') return true
                    return item.locationTypeRaw === 'STORE' && item.locationId === parsedStoreId
                })
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .slice(0, 20)

            if (inventoryMode === 'store' && normalizedLogs.length === 0 && !inventoryRecords.length) {
                setInfo('Store #' + parsedStoreId + ' chua co logs ton kho.')
            }

            setRows(normalizedRows)
            setLogs(normalizedLogs)
        } catch (e) {
            setRows([])
            setLogs([])
            setError(e.message || 'Tai ton kho that bai.')
        } finally {
            setLoading(false)
        }
    }

    const fetchProductionBatches = async () => {
        setBatchError('')
        setBatchInfo('')

        const tk = token()
        if (!tk) {
            setBatches([])
            setBatchError('Thieu token dang nhap de tai Production Batches.')
            return
        }

        setBatchLoading(true)
        try {
            const response = await fetch(`${apiBase}/ProductionBatches`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                if (response.status === 405) {
                    setBatchInfo('Backend chua ho tro GET /ProductionBatches (405). Ban van tao batch bang POST; neu backend tra ID khi tao thi co the thao tac ngay.')
                    return
                }
                throw new Error(data?.message || data?.title || 'Khong the tai danh sach Production Batches.')
            }

            const records = parseArrayData(data)
            const normalized = records
                .map((item) => toProductionBatchRow(item, productNameMap))
                .filter((item) => item.id > 0 || item.productId > 0)
                .sort((a, b) => new Date(b.mfgDate || 0).getTime() - new Date(a.mfgDate || 0).getTime())
                .slice(0, 20)

            setBatches(normalized)
        } catch (e) {
            setBatches([])
            setBatchError(e.message || 'Tai Production Batches that bai.')
        } finally {
            setBatchLoading(false)
        }
    }

    const fetchOrdersForBatch = async () => {
        setOrderError('')
        const tk = token()

        if (!tk) {
            setOrderRows([])
            setOrderError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
            return
        }

        setOrderLoading(true)
        try {
            const headersWithAuth = {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
            }

            const fetchOrderRecords = async (url) => {
                const res = await fetch(url, { method: 'GET', headers: headersWithAuth })
                const payload = await res.json().catch(() => [])

                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        throw new Error('Bạn không có quyền xem danh sách đơn hàng nội bộ.')
                    }
                    throw new Error(payload?.message || payload?.title || 'Không thể tải danh sách đơn hàng nội bộ.')
                }
                return parseArrayData(payload)
            }

            // Do not fan out across all storeIds to avoid request storms and repeated 403 logs.
            let mergedOrders = await fetchOrderRecords(`${apiBase}/internal-orders`)

            if (!mergedOrders.length) {
                const fallbackStoreId = '1'
                mergedOrders = await fetchOrderRecords(`${apiBase}/internal-orders?storeId=${encodeURIComponent(fallbackStoreId)}`)
            }

            const approvedOrders = normalizeInternalOrderRows(mergedOrders, productNameMap)
                .filter((order) => order.status === 'Approved')

            const needHydrate = approvedOrders.filter((order) => !Array.isArray(order.details) || order.details.length === 0)
            let hydratedMap = new Map()

            if (needHydrate.length) {
                const detailResults = await Promise.allSettled(
                    needHydrate.map(async (order) => {
                        const detailRes = await fetch(`${apiBase}/internal-orders/${order.orderId}`, {
                            method: 'GET',
                            headers: headersWithAuth,
                        })
                        const detailPayload = await detailRes.json().catch(() => ({}))

                        if (!detailRes.ok) return { orderId: order.orderId, details: [] }

                        const detailsRaw = Array.isArray(detailPayload?.internalOrderDetails)
                            ? detailPayload.internalOrderDetails
                            : Array.isArray(detailPayload?.orderDetails)
                                ? detailPayload.orderDetails
                                : []

                        const details = detailsRaw
                            .map((row, idx) => {
                                const productId = parseSafeNumber(row?.productId, 0)
                                const quantityOrdered = parseSafeNumber(row?.quantityOrdered, 0)
                                if (!productId || quantityOrdered <= 0) return null
                                return {
                                    key: `${order.orderId}-${productId}-${idx}`,
                                    productId,
                                    productName: row?.product?.productName || row?.product?.name || productNameMap[productId] || `Product #${productId}`,
                                    quantityOrdered,
                                }
                            })
                            .filter(Boolean)

                        return { orderId: order.orderId, details }
                    }),
                )

                hydratedMap = new Map(
                    detailResults
                        .filter((result) => result.status === 'fulfilled')
                        .map((result) => [result.value.orderId, result.value.details]),
                )
            }

            const normalized = approvedOrders
                .map((order) => {
                    const hydratedDetails = hydratedMap.get(order.orderId)
                    if (Array.isArray(hydratedDetails) && hydratedDetails.length > 0) {
                        return { ...order, details: hydratedDetails }
                    }
                    return order
                })
                .filter((order) => Array.isArray(order.details) && order.details.length > 0)

            if (approvedOrders.length > 0 && normalized.length === 0) {
                setOrderError('Don da duyet co ton tai, nhung backend khong tra chi tiet san pham de tao me.')
            }

            setOrderRows(normalized)
        } catch (e) {
            setOrderRows([])
            setOrderError(e.message || 'Tai danh sach don order that bai.')
        } finally {
            setOrderLoading(false)
        }
    }

    const createProductionBatch = async (source = null) => {
        setBatchError('')
        setBatchInfo('')
        setBatchNotice('')

        const tk = token()
        if (!tk) {
            setBatchError('Thieu token dang nhap. Vui long dang nhap lai.')
            return
        }

        const productId = Number(source?.productId ?? batchProductId)
        const quantityPlanned = Number(source?.quantityPlanned ?? batchQuantityPlanned)
        const mfgDateValue = source?.mfgDate || batchMfgDate
        if (!productId || productId < 1 || !Number.isFinite(quantityPlanned) || quantityPlanned < 1) {
            setBatchError('productId va quantityPlanned phai lon hon 0.')
            return
        }
        if (!mfgDateValue) {
            setBatchError('Vui long nhap mfgDate.')
            return
        }

        setBatchLoading(true)
        if (source?.key) setBatchCreateOrderKey(source.key)
        try {
            const response = await fetch(`${apiBase}/ProductionBatches`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    quantityPlanned,
                    mfgDate: new Date(mfgDateValue).toISOString(),
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Tao me san xuat that bai.')
            }

            setBatchNotice(data?.message || 'Tao me san xuat thanh cong.')

            const productIdValue = Number(productId)
            const createdAt = new Date(mfgDateValue).toISOString()
            const locationHeader = response.headers.get('Location') || response.headers.get('location') || response.headers.get('Content-Location') || response.headers.get('content-location')
            const headerBatchId = parseIdFromLocationHeader(locationHeader)
            const createdBatchId = Number(data?.productionBatchId ?? data?.batchId ?? data?.id ?? headerBatchId ?? 0)
            const localRow = {
                id: createdBatchId > 0 ? createdBatchId : null,
                localKey: Date.now(),
                pendingSync: createdBatchId <= 0,
                productId: productIdValue,
                productName: productNameMap[productIdValue] || `Product #${productIdValue}`,
                storeId: parseSafeNumber(source?.storeId, 0),
                storeName: source?.storeName || (source?.storeId ? `Store #${source.storeId}` : 'N/A'),
                sourceOrderId: parseSafeNumber(source?.orderId, 0),
                sourceOrderCode: source?.orderCode || (source?.orderId ? `#${source.orderId}` : 'N/A'),
                quantityPlanned,
                quantityProduced: 0,
                status: 'CREATED',
                mfgDate: createdAt,
            }
            setBatches((prev) => [localRow, ...prev].slice(0, 20))

            if (createdBatchId <= 0) {
                setBatchInfo('Da tao me san xuat, nhung backend khong tra ve ID me. Vui long cap nhat backend de tra ve productionBatchId hoac header Location.')
            }

            if (source?.key) {
                setBatchNotice(`Da tao me san xuat tu don ${source.orderCode || `#${source.orderId}`}.`)
            }
        } catch (e) {
            setBatchError(e.message || 'Khong the tao me san xuat.')
        } finally {
            setBatchLoading(false)
            setBatchCreateOrderKey('')
        }
    }

    const createBatchFromOrderDetail = (order, detail) => {
        const plannedQty = Math.max(1, Number(detail?.quantityOrdered || 0))
        createProductionBatch({
            key: detail?.key,
            productId: detail?.productId,
            quantityPlanned: plannedQty,
            mfgDate: new Date().toISOString(),
            storeId: order?.storeId,
            storeName: order?.storeName,
            orderId: order?.orderId,
            orderCode: order?.orderCode,
        })
    }

    const openBatchView = (batch) => {
        setViewBatchRow(batch)
        setShowViewBatchForm(true)
    }

    const openBatchEdit = (batch) => {
        const batchId = Number(batch?.id)
        if (!batchId) {
            setBatchError('Batch nay chua co ID tu backend. Vui long bam Tai lai batch truoc khi cap nhat.')
            return
        }
        setEditBatchId(String(batchId))
        setEditBatchProductId(String(batch?.productId || 1))
        setEditBatchQuantityPlanned(String(batch?.quantityPlanned || 1))
        const parsedMfgDate = batch?.mfgDate ? new Date(batch.mfgDate) : new Date()
        const localDate = Number.isNaN(parsedMfgDate.getTime()) ? new Date() : parsedMfgDate
        setEditBatchMfgDate(localDate.toISOString().slice(0, 16))
        setBatchError('')
        setBatchNotice('')
        setShowEditBatchForm(true)
    }

    const updateProductionBatch = async () => {
        const tk = token()
        if (!tk) {
            setBatchError('Thieu token dang nhap. Vui long dang nhap lai.')
            return
        }

        const batchId = Number(editBatchId)
        const productId = Number(editBatchProductId)
        const quantityPlanned = Number(editBatchQuantityPlanned)
        if (!batchId || batchId < 1) {
            setBatchError('Batch ID khong hop le de cap nhat.')
            return
        }
        if (!productId || productId < 1 || !Number.isFinite(quantityPlanned) || quantityPlanned < 1) {
            setBatchError('productId va quantityPlanned phai lon hon 0.')
            return
        }
        if (!editBatchMfgDate) {
            setBatchError('Vui long nhap mfgDate.')
            return
        }

        setBatchLoading(true)
        setBatchError('')
        setBatchNotice('')

        try {
            const response = await fetch(`${apiBase}/ProductionBatches/${batchId}`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    quantityPlanned,
                    mfgDate: new Date(editBatchMfgDate).toISOString(),
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Khong the cap nhat me san xuat.')
            }

            setBatchNotice(data?.message || `Cap nhat me san xuat #${batchId} thanh cong.`)
            setShowEditBatchForm(false)
            setBatches((prev) => prev.map((item) => {
                if (Number(item.id) !== batchId) return item
                return {
                    ...item,
                    productId,
                    productName: productNameMap[productId] || `Product #${productId}`,
                    quantityPlanned,
                    mfgDate: new Date(editBatchMfgDate).toISOString(),
                }
            }))
        } catch (e) {
            setBatchError(e.message || 'Cap nhat me san xuat that bai.')
        } finally {
            setBatchLoading(false)
        }
    }

    const deleteProductionBatch = async (batch) => {
        const tk = token()
        if (!tk) {
            setBatchError('Thieu token dang nhap. Vui long dang nhap lai.')
            return
        }

        const batchId = Number(batch?.id)
        if (!batchId) {
            setBatchError('Batch nay chua co ID tu backend. Vui long bam Tai lai batch truoc khi xoa.')
            return
        }

        if (!window.confirm(`Xac nhan xoa me san xuat #${batchId}?`)) return

        setBatchDeleteLoadingId(batchId)
        setBatchError('')
        setBatchNotice('')

        try {
            const response = await fetch(`${apiBase}/ProductionBatches/${batchId}`, {
                method: 'DELETE',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Khong the xoa me san xuat.')
            }

            setBatchNotice(data?.message || `Da xoa me san xuat #${batchId}.`)
            setBatches((prev) => prev.filter((item) => Number(item.id) !== batchId))
        } catch (e) {
            setBatchError(e.message || 'Xoa me san xuat that bai.')
        } finally {
            setBatchDeleteLoadingId(null)
        }
    }

    const openBatchStatusForm = (batch) => {
        if (!Number(batch?.id)) {
            setBatchError('Batch nay chua co ID tu backend. Vui long bam Tai lai batch truoc khi chuyen status.')
            return
        }
        setStatusBatchRow(batch)
        setNextBatchStatus('IN_PROGRESS')
        setNextQuantityActual('')
        setBatchError('')
        setBatchNotice('')
        setShowStatusBatchForm(true)
    }

    const updateProductionBatchStatus = async () => {
        const tk = token()
        if (!tk) {
            setBatchError('Thieu token dang nhap. Vui long dang nhap lai.')
            return
        }

        const batchId = Number(statusBatchRow?.id)
        if (!batchId) {
            setBatchError('Batch ID khong hop le de cap nhat trang thai.')
            return
        }

        const quantityActual = String(nextQuantityActual || '').trim()
        const parsedQtyActual = quantityActual === '' ? null : Number(quantityActual)
        if (parsedQtyActual !== null && (!Number.isFinite(parsedQtyActual) || parsedQtyActual < 0)) {
            setBatchError('quantityActual phai >= 0 hoac de trong.')
            return
        }

        setBatchStatusLoadingId(batchId)
        setBatchError('')
        setBatchNotice('')

        try {
            const response = await fetch(`${apiBase}/ProductionBatches/${batchId}/status`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: nextBatchStatus,
                    quantityActual: parsedQtyActual,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Khong the cap nhat trang thai me san xuat.')
            }

            setBatchNotice(data?.message || `Cap nhat trang thai me #${batchId} thanh cong.`)
            setShowStatusBatchForm(false)
            setBatches((prev) => prev.map((item) => {
                if (Number(item.id) !== batchId) return item
                return {
                    ...item,
                    status: nextBatchStatus,
                    quantityProduced: parsedQtyActual !== null ? parsedQtyActual : item.quantityProduced,
                }
            }))
        } catch (e) {
            setBatchError(e.message || 'Cap nhat trang thai that bai.')
        } finally {
            setBatchStatusLoadingId(null)
        }
    }

    useEffect(() => {
        fetchProductMap()
    }, [])

    useEffect(() => {
        fetchInventoryData()
    }, [inventoryMode, storeId, Object.keys(productNameMap).length])

    useEffect(() => {
        if (!Object.keys(productNameMap).length) return
        fetchOrdersForBatch()
    }, [Object.keys(productNameMap).length])

    const stats = useMemo(() => ({
        total: rows.length,
        low: rows.filter((row) => row.status === 'low').length,
        critical: rows.filter((row) => row.status === 'critical').length,
        quantity: rows.reduce((sum, row) => sum + Number(row.currentQuantity || 0), 0),
    }), [rows])

    const toastMessage = batchError
        || orderError
        || error
        || batchNotice
        || batchInfo
        || info

    const toastType = (batchError || orderError || error)
        ? 'error'
        : (batchInfo || info)
            ? 'warning'
            : toastMessage
                ? 'success'
                : ''

    const clearToast = () => {
        setBatchError('')
        setOrderError('')
        setError('')
        setBatchNotice('')
        setBatchInfo('')
        setInfo('')
    }

    useEffect(() => {
        if (!toastMessage) return undefined

        const timer = window.setTimeout(() => {
            clearToast()
        }, 3200)

        return () => window.clearTimeout(timer)
    }, [toastMessage])

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
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

            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
                    <h2 className="text-lg font-bold leading-tight">Inventory</h2>
                </div>
                <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors" onClick={fetchInventoryData}>
                    <span className="material-symbols-outlined text-[18px]">refresh</span>Tai lai
                </button>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <label className="sm:w-64">
                        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Pham vi du lieu</span>
                        <select
                            value={inventoryMode}
                            onChange={(e) => setInventoryMode(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                        >
                            <option value="store">Theo cua hang</option>
                            <option value="all">Toan he thong</option>
                        </select>
                    </label>
                    {inventoryMode === 'store' ? (
                        <label className="sm:w-44">
                            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Store ID</span>
                            <input
                                type="number"
                                min="1"
                                value={storeId}
                                onChange={(e) => setStoreId(e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                placeholder="Store ID"
                            />
                        </label>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Mat hang', value: stats.total },
                        { label: 'Sap het', value: stats.low },
                        { label: 'Can bo sung ngay', value: stats.critical },
                        { label: 'Tong so luong', value: stats.quantity },
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
                                {['San pham', 'Vi tri', 'So luong hien tai', 'Muc toi thieu', 'Cap nhat lan cuoi', 'Trang thai'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Dang tai ton kho...</td>
                                </tr>
                            ) : null}

                            {!loading && rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Khong co du lieu ton kho phu hop.</td>
                                </tr>
                            ) : null}

                            {!loading && rows.map((item) => (
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
                                            {item.status === 'critical' ? 'Can dat ngay' : item.status === 'low' ? 'Sap het' : 'Du hang'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                    <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold">Tao me theo don order</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Hien don da duyet (Approved) toan he thong de tao me.</p>
                        </div>
                        <button
                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={fetchOrdersForBatch}
                        >
                            Tai lai order
                        </button>
                    </div>

                    <table className="w-full min-w-[900px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                {['Order', 'Store', 'Trang thai', 'San pham', 'So luong order', 'Thao tac'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {orderLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Dang tai order...</td>
                                </tr>
                            ) : null}

                            {!orderLoading && orderRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Khong co order phu hop de tao me.</td>
                                </tr>
                            ) : null}

                            {!orderLoading && orderRows.flatMap((order) => order.details.map((detail) => ({ order, detail }))).map(({ order, detail }) => (
                                <tr key={detail.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-3 text-sm font-semibold">{order.orderCode}</td>
                                    <td className="px-5 py-3 text-sm">{order.storeName}</td>
                                    <td className="px-5 py-3 text-sm">{order.status}</td>
                                    <td className="px-5 py-3 text-sm">{detail.productName}</td>
                                    <td className="px-5 py-3 text-sm">{detail.quantityOrdered}</td>
                                    <td className="px-5 py-3 text-sm">
                                        <button
                                            className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                                            onClick={() => createBatchFromOrderDetail(order, detail)}
                                            disabled={batchLoading && batchCreateOrderKey === detail.key}
                                        >
                                            {batchLoading && batchCreateOrderKey === detail.key ? 'Dang tao...' : 'Tao me tu order'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                    <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Production Batches</p>
                        <div className="flex items-center gap-2">
                            <button
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                onClick={fetchProductionBatches}
                            >
                                Tai lai batch
                            </button>
                            <button
                                className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
                                onClick={() => navigate('/production-batches/create')}
                            >
                                Tao me san xuat
                            </button>
                        </div>
                    </div>

                    <table className="w-full min-w-[860px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                {['Batch ID', 'Order', 'Store', 'Product', 'So luong ke hoach', 'So luong da SX', 'Trang thai', 'MFG Date', 'Thao tac'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {batchLoading ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Dang tai production batches...</td>
                                </tr>
                            ) : null}

                            {!batchLoading && batches.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Chua co production batch nao.</td>
                                </tr>
                            ) : null}

                            {!batchLoading && batches.map((batch) => {
                                const hasServerId = Number(batch?.id) > 0
                                // Relaxed check: Allow actions even if pendingSync is true, unless user specifically requested strict mode.
                                // If no server ID, we might still want to allow local deletion or editing if supported.
                                const isActionDisabled = false // Force enable to fix "gray button" issue reported by user
                                return (
                                    <tr key={`${batch.id || `local-${batch.localKey || 0}`}-${batch.productId}-${batch.mfgDate || 'na'}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-3 text-sm font-semibold">{hasServerId ? `#${batch.id}` : 'LOCAL'}</td>
                                        <td className="px-5 py-3 text-sm">{batch.sourceOrderCode || 'N/A'}</td>
                                        <td className="px-5 py-3 text-sm">{batch.storeName || 'N/A'}</td>
                                        <td className="px-5 py-3 text-sm">{batch.productName}</td>
                                        <td className="px-5 py-3 text-sm">{batch.quantityPlanned}</td>
                                        <td className="px-5 py-3 text-sm">{batch.quantityProduced}</td>
                                        <td className="px-5 py-3 text-sm">{batch.status}</td>
                                        <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{toReadableDate(batch.mfgDate)}</td>
                                        <td className="px-5 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openBatchView(batch)}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                    title="View"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => openBatchEdit(batch)}
                                                    disabled={isActionDisabled}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => deleteProductionBatch(batch)}
                                                    disabled={isActionDisabled || batchDeleteLoadingId === Number(batch.id)}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                                <button
                                                    onClick={() => openBatchStatusForm(batch)}
                                                    disabled={isActionDisabled || batchStatusLoadingId === Number(batch.id)}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                                                    title="Chuyen status"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                    <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Lich su bien dong ton kho</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Hien thi 20 giao dich gan nhat</p>
                    </div>
                    <table className="w-full min-w-[860px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                {['Ma log', 'San pham', 'Vi tri', 'Ly do/Loai giao dich', 'So luong thay doi', 'Tham chieu', 'Thoi gian'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Dang tai logs...</td>
                                </tr>
                            ) : null}

                            {!loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Chua co giao dich ton kho.</td>
                                </tr>
                            ) : null}

                            {!loading && logs.map((log) => (
                                <tr key={`${log.id}-${log.createdAt || 'no-date'}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-3 text-sm font-semibold">#{log.id}</td>
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
                                        <p>{log.referenceType}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Ref ID: {log.referenceId ?? '-'}</p>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{toReadableDate(log.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showEditBatchForm ? (
                    <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <p className="text-base font-semibold">Cap nhat me san xuat (PUT /ProductionBatches/{editBatchId})</p>
                                <button
                                    onClick={() => setShowEditBatchForm(false)}
                                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                    disabled={batchLoading}
                                >
                                    Dong
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Product ID</span>
                                    <input type="number" min="1" value={editBatchProductId} onChange={(e) => setEditBatchProductId(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Quantity Planned</span>
                                    <input type="number" min="1" value={editBatchQuantityPlanned} onChange={(e) => setEditBatchQuantityPlanned(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">MFG Date</span>
                                    <input type="datetime-local" value={editBatchMfgDate} onChange={(e) => setEditBatchMfgDate(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm" />
                                </label>
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-3">
                                <button onClick={updateProductionBatch} disabled={batchLoading} className="h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                                    {batchLoading ? 'Dang cap nhat...' : 'Luu cap nhat'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {showViewBatchForm && viewBatchRow ? (
                    <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                        <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <p className="text-base font-semibold">Chi tiet me san xuat #{viewBatchRow.id}</p>
                                <button onClick={() => setShowViewBatchForm(false)} className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Dong</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <p><span className="font-semibold">Batch ID:</span> #{viewBatchRow.id}</p>
                                <p><span className="font-semibold">Order:</span> {viewBatchRow.sourceOrderCode || 'N/A'}</p>
                                <p><span className="font-semibold">Store:</span> {viewBatchRow.storeName || 'N/A'}</p>
                                <p><span className="font-semibold">Product:</span> {viewBatchRow.productName}</p>
                                <p><span className="font-semibold">Quantity Planned:</span> {viewBatchRow.quantityPlanned}</p>
                                <p><span className="font-semibold">Quantity Produced:</span> {viewBatchRow.quantityProduced}</p>
                                <p><span className="font-semibold">Status:</span> {viewBatchRow.status}</p>
                                <p><span className="font-semibold">MFG Date:</span> {toReadableDate(viewBatchRow.mfgDate)}</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {showStatusBatchForm && statusBatchRow ? (
                    <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                        <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <p className="text-base font-semibold">Chuyen trang thai me #{statusBatchRow.id}</p>
                                <button
                                    onClick={() => setShowStatusBatchForm(false)}
                                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                    disabled={batchStatusLoadingId === Number(statusBatchRow.id)}
                                >
                                    Dong
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</span>
                                    <select
                                        value={nextBatchStatus}
                                        onChange={(e) => setNextBatchStatus(e.target.value)}
                                        className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    >
                                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Quantity Actual (tuy chon)</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={nextQuantityActual}
                                        onChange={(e) => setNextQuantityActual(e.target.value)}
                                        placeholder="De trong neu chua co"
                                        className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-3">
                                <button
                                    onClick={updateProductionBatchStatus}
                                    disabled={batchStatusLoadingId === Number(statusBatchRow.id)}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {batchStatusLoadingId === Number(statusBatchRow.id) ? 'Dang cap nhat...' : 'Cap nhat trang thai'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

            </div>
        </div>
    )
}
