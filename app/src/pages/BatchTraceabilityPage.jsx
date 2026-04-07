import { useEffect, useMemo, useState } from 'react'

const statusColors = {
    ok: 'bg-emerald-500',
    low: 'bg-amber-500',
    critical: 'bg-red-500',
}

const stockBg = {
    ok: '',
    low: 'bg-amber-50 dark:bg-amber-900/10',
    critical: 'bg-red-50 dark:bg-red-900/10',
}

const inventoryActionLabel = {
    IN: 'Nhập kho',
    OUT: 'Xuất kho',
    ADJUST: 'Điều chỉnh',
    TRANSFER_IN: 'Chuyển vào',
    TRANSFER_OUT: 'Chuyển ra',
    INITIAL_STOCK: 'Khởi tạo tồn kho',
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

function normalizeImportPayload(raw) {
    if (!raw || typeof raw !== 'object') return null
    return {
        productId: Number(raw.productId ?? raw.ProductId),
        quantity: Number(raw.quantity ?? raw.Quantity),
        supplierId: Number(raw.supplierId ?? raw.SupplierId),
    }
}

function isSameImportPayload(requestPayload, debugPayload) {
    const requestNormalized = normalizeImportPayload(requestPayload)
    const debugNormalized = normalizeImportPayload(debugPayload)
    if (!requestNormalized || !debugNormalized) return false

    return requestNormalized.productId === debugNormalized.productId
        && requestNormalized.supplierId === debugNormalized.supplierId
        && requestNormalized.quantity === debugNormalized.quantity
}

function withTraceId(message, traceId) {
    const normalizedTrace = String(traceId || '').trim()
    if (!normalizedTrace) return message
    return `${message} (traceId: ${normalizedTrace})`
}

function resolveImportErrorMessage(payload, requestPayload) {
    const rawError = readApiErrorMessage(payload, 'Nhập kho thất bại.')
    const normalized = String(rawError || '').toLowerCase()
    const errorCode = String(payload?.errorCode || '').trim().toUpperCase()
    const traceId = payload?.traceId
    const debugPayload = payload?.debugPayload
    const hasDebugPayload = Boolean(debugPayload && typeof debugPayload === 'object')
    const payloadMatched = hasDebugPayload && isSameImportPayload(requestPayload, debugPayload)

    if (hasDebugPayload && !payloadMatched) {
        return withTraceId('Dữ liệu API nhận được không khớp dữ liệu FE gửi. Vui lòng thử lại và kiểm tra request payload.', traceId)
    }

    if (errorCode === 'INV_IMPORT_LOG_FIELD_TOO_LONG') {
        return withTraceId('Hệ thống đang lỗi độ dài dữ liệu log khi nhập kho. Vui lòng gửi traceId cho backend để kiểm tra.', traceId)
    }
    if (errorCode === 'INV_IMPORT_DUPLICATE_INVENTORY') {
        return withTraceId('Dữ liệu tồn kho bị trùng khóa. Vui lòng gửi traceId cho backend để xử lý dữ liệu hệ thống.', traceId)
    }
    if (errorCode === 'INV_IMPORT_SUPPLIER_FK_FAILED') {
        return withTraceId('Nhà cung cấp không hợp lệ trong hệ thống. Vui lòng chọn nhà cung cấp khác.', traceId)
    }
    if (errorCode === 'INV_IMPORT_PRODUCT_FK_FAILED') {
        return withTraceId('Nguyên liệu không hợp lệ trong hệ thống. Vui lòng chọn nguyên liệu khác.', traceId)
    }
    if (errorCode === 'INV_IMPORT_SAVE_FAILED') {
        return withTraceId('Không thể nhập kho lúc này do lỗi lưu dữ liệu hệ thống. Vui lòng gửi traceId cho backend kiểm tra.', traceId)
    }

    if (errorCode === 'INV_IMPORT_BUSINESS_ERROR') {
        if (normalized.includes('blacklist') || normalized.includes('ngừng hoạt động')) {
            return withTraceId('Nhà cung cấp đã ngừng hoạt động. Vui lòng chọn nhà cung cấp khác.', traceId)
        }
        if (normalized.includes('raw')) {
            return withTraceId('Chỉ có thể nhập kho cho nhóm nguyên liệu thô (RAW).', traceId)
        }
        if (normalized.includes('không tìm thấy sản phẩm')) {
            return withTraceId('Sản phẩm không còn tồn tại. Vui lòng chọn lại.', traceId)
        }
        if (normalized.includes('không tìm thấy nhà cung cấp')) {
            return withTraceId('Nhà cung cấp không còn tồn tại. Vui lòng chọn lại.', traceId)
        }
        if (normalized.includes('số lượng') || normalized.includes('so luong')) {
            return withTraceId('Số lượng nhập kho phải lớn hơn 0.', traceId)
        }
        return withTraceId(rawError, traceId)
    }

    if (normalized.includes('saving the entity changes') || normalized.includes('inner exception')) {
        const hasStructuredError = Boolean(errorCode || traceId)
        if (payloadMatched) {
            return withTraceId(
                hasStructuredError
                    ? 'Dữ liệu nhập kho đã hợp lệ nhưng hệ thống đang lỗi lưu dữ liệu. Vui lòng gửi traceId cho backend kiểm tra DB.'
                    : 'Dữ liệu nhập kho đã hợp lệ nhưng hệ thống đang lỗi lưu dữ liệu. API hiện chưa trả errorCode/traceId để truy vết nhanh.',
                traceId,
            )
        }
        return withTraceId(
            hasStructuredError
                ? 'Không thể nhập kho lúc này do lỗi lưu dữ liệu hệ thống. Vui lòng thử lại sau.'
                : 'Không thể nhập kho lúc này do lỗi lưu dữ liệu hệ thống. API hiện chưa trả errorCode/traceId để truy vết nhanh.',
            traceId,
        )
    }

    if (normalized.includes('blacklist') || normalized.includes('ngừng hoạt động')) {
        return withTraceId('Nhà cung cấp đã ngừng hoạt động. Vui lòng chọn nhà cung cấp khác.', traceId)
    }
    if (normalized.includes('raw')) {
        return withTraceId('Chỉ có thể nhập kho cho nhóm nguyên liệu thô (RAW).', traceId)
    }
    if (normalized.includes('không tìm thấy sản phẩm')) {
        return withTraceId('Sản phẩm không còn tồn tại. Vui lòng chọn lại.', traceId)
    }
    if (normalized.includes('không tìm thấy nhà cung cấp')) {
        return withTraceId('Nhà cung cấp không còn tồn tại. Vui lòng chọn lại.', traceId)
    }

    return withTraceId(rawError, traceId)
}

function normalizeSupplierActive(value) {
    if (value === undefined || value === null || value === '') return true
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value > 0

    const normalized = String(value).trim().toUpperCase()
    if (['FALSE', '0', 'INACTIVE', 'DISABLED', 'NGUNG_HOAT_DONG', 'NGỪNG_HOẠT_ĐỘNG'].includes(normalized)) return false
    if (['TRUE', '1', 'ACTIVE', 'ENABLED', 'HOAT_DONG', 'HOẠT_ĐỘNG'].includes(normalized)) return true
    return true
}

function readApiErrorMessage(payload, fallback) {
    if (!payload) return fallback
    if (typeof payload === 'string') return payload
    if (payload.message) return payload.message
    if (payload.title) return payload.title

    const errorFields = payload.errors
    if (errorFields && typeof errorFields === 'object') {
        const firstField = Object.keys(errorFields)[0]
        const fieldErrors = firstField ? errorFields[firstField] : null
        if (Array.isArray(fieldErrors) && fieldErrors.length) {
            return `${firstField}: ${fieldErrors[0]}`
        }
    }

    return fallback
}

function normalizeLocationType(locationType) {
    const raw = String(locationType || '').toUpperCase()
    if (raw === 'KITCHEN') return 'Bếp trung tâm'
    if (raw === 'STORE') return 'Cửa hàng'
    return locationType || 'N/A'
}

function toReadableDate(dateString) {
    if (!dateString) return 'N/A'
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

    // Try multiple ways to get product name
    let productName = 'Sản phẩm chưa xác định'
    if (item?.product?.productName) {
        productName = item.product.productName
    } else if (item?.product?.name) {
        productName = item.product.name
    } else if (item?.productName) {
        productName = item.productName
    } else if (item?.name) {
        productName = item.name
    } else if (productNameById && productNameById[productId]) {
        productName = productNameById[productId]
    } else if (productId > 0) {
        productName = `Sản phẩm chưa có tên`
    }

    return {
        id: parseSafeNumber(item?.inventoryId ?? item?.id, productId),
        productId,
        productName,
        locationType: normalizeLocationType(item?.locationType),
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
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Sản phẩm chưa có tên`,
        locationType: normalizeLocationType(item?.locationType),
        locationId: parseSafeNumber(item?.locationId, 0),
        action,
        quantityChange: parseSafeNumber(item?.changeQuantity ?? item?.quantityChanged ?? item?.quantity ?? item?.amount, 0),
        reason: item?.reason || '',
        referenceType: item?.referenceType || 'N/A',
        referenceId: item?.referenceId,
        createdAt: item?.createdAt || item?.transactionDate || item?.timestamp || null,
    }
}

export default function BatchTraceabilityPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [rows, setRows] = useState([])
    const [logs, setLogs] = useState([])
    const [productNameMap, setProductNameMap] = useState({})
    const [productFilter, setProductFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState('')
    const [importSuccess, setImportSuccess] = useState('')
    const [importProducts, setImportProducts] = useState([])
    const [importSuppliers, setImportSuppliers] = useState([])
    const [importForm, setImportForm] = useState({
        productId: '',
        quantity: '1',
        supplierId: '',
    })
    const [batchDetailModal, setBatchDetailModal] = useState(false)
    const [batchDetails, setBatchDetails] = useState(null)
    const [loadingBatchDetails, setLoadingBatchDetails] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [scanMessage, setScanMessage] = useState('')

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
            const response = await fetch(`${apiBase}/Products/manufactured`, {
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

            // Also fetch raw products
            const rawResponse = await fetch(`${apiBase}/Products/raw`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
                },
            })

            const rawData = await rawResponse.json().catch(() => [])
            if (rawResponse.ok) {
                const rawRecords = parseArrayData(rawData)
                rawRecords.forEach((item) => {
                    const id = Number(item?.productId || item?.id)
                    if (!id) return
                    const name = item?.productName || item?.name
                    if (!name) return
                    map[id] = name
                })
            }

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
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setLoading(true)
        try {
            const headers = {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
            }

            const inventoryRes = await fetch(`${apiBase}/Inventory/stock`, { method: 'GET', headers })
            const logsRes = await fetch(`${apiBase}/Inventory/logs`, { method: 'GET', headers })

            const inventoryJson = await inventoryRes.json().catch(() => [])
            const logsJson = await logsRes.json().catch(() => [])

            if (!inventoryRes.ok) {
                throw new Error(inventoryJson?.message || inventoryJson?.title || 'Không thể tải dữ liệu tồn kho.')
            }

            if (!logsRes.ok) {
                setInfo('Không thể tải lịch sử từ /Inventory/logs. Đang hiển thị tồn kho hiện tại.')
            }

            const normalizedRows = parseArrayData(inventoryJson)
                .map((item) => toInventoryRow(item, productNameMap))
                .filter((item) => item.productId > 0)

            const normalizedLogs = logsRes.ok
                ? parseArrayData(logsJson)
                    .map((item) => toInventoryLogRow(item, productNameMap))
                    .filter((item) => item.id > 0)
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .slice(0, 100)
                : []

            setRows(normalizedRows)
            setLogs(normalizedLogs)
        } catch (e) {
            setRows([])
            setLogs([])
            setError(e.message || 'Tải tồn kho thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const fetchImportOptions = async () => {
        const tk = token()
        if (!tk) {
            setImportError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        try {
            const headers = {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
            }

            const [productRes, supplierRes] = await Promise.all([
                fetch(`${apiBase}/Products/raw`, { method: 'GET', headers }),
                fetch(`${apiBase}/Suppliers`, { method: 'GET', headers }),
            ])

            const productJson = await productRes.json().catch(() => [])
            const supplierJson = await supplierRes.json().catch(() => [])

            const normalizedProducts = productRes.ok
                ? parseArrayData(productJson)
                    .map((item) => {
                        const id = parseSafeNumber(item?.productId ?? item?.id, 0)
                        if (!id) return null
                        return { id, name: item?.productName || item?.name || `Sản phẩm chưa có tên` }
                    })
                    .filter(Boolean)
                : []

            const normalizedSuppliers = supplierRes.ok
                ? parseArrayData(supplierJson)
                    .map((item) => {
                        const id = parseSafeNumber(item?.supplierId ?? item?.id, 0)
                        if (!id) return null
                        return {
                            id,
                            name: item?.supplierName || item?.name || `Nhà cung cấp #${id}`,
                            isActive: normalizeSupplierActive(item?.isActive ?? item?.active ?? item?.is_active ?? item?.status),
                        }
                    })
                    .filter((item) => item?.isActive)
                    .filter(Boolean)
                : []

            setImportProducts(normalizedProducts)
            setImportSuppliers(normalizedSuppliers)
            setImportForm((prev) => ({
                ...prev,
                productId: prev.productId || (normalizedProducts[0] ? String(normalizedProducts[0].id) : ''),
                supplierId: prev.supplierId || (normalizedSuppliers[0] ? String(normalizedSuppliers[0].id) : ''),
            }))

            if (!productRes.ok || !supplierRes.ok) {
                setImportError('Một số dữ liệu danh mục chưa tải được. Vui lòng kiểm tra quyền API.')
            }
        } catch {
            setImportProducts([])
            setImportSuppliers([])
            setImportError('Không thể tải dữ liệu sản phẩm/nhà cung cấp để nhập kho.')
        }
    }

    const openImportModal = async () => {
        setImportError('')
        setImportSuccess('')
        setIsImportModalOpen(true)
        await fetchImportOptions()
    }

    const closeImportModal = () => {
        if (importing) return
        setIsImportModalOpen(false)
        setImportError('')
    }

    const updateImportForm = (key, value) => {
        setImportForm((prev) => ({ ...prev, [key]: value }))
    }

    const submitImport = async (event) => {
        event.preventDefault()
        setImportError('')
        setImportSuccess('')

        const tk = token()
        if (!tk) {
            setImportError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const productId = parseSafeNumber(importForm.productId, 0)
        const supplierId = parseSafeNumber(importForm.supplierId, 0)
        const quantity = parseSafeNumber(importForm.quantity, 0)
        const selectedProduct = importProducts.find((p) => Number(p.id) === productId)
        const selectedSupplier = importSuppliers.find((s) => Number(s.id) === supplierId)

        if (productId < 1) {
            setImportError('Vui lòng chọn sản phẩm hợp lệ.')
            return
        }
        if (supplierId < 1) {
            setImportError('Vui lòng chọn nhà cung cấp hợp lệ.')
            return
        }
        if (!selectedProduct) {
            setImportError('Sản phẩm không hợp lệ hoặc không thuộc nhóm nguyên liệu thô (RAW).')
            return
        }
        if (!selectedSupplier) {
            setImportError('Nhà cung cấp không hợp lệ hoặc đã ngừng hoạt động.')
            return
        }
        if (quantity <= 0) {
            setImportError('Số lượng nhập phải lớn hơn 0.')
            return
        }

        setImporting(true)
        try {
            const requestPayload = {
                productId: Number(productId),
                quantity: Number(quantity),
                supplierId: Number(supplierId),
            }

            const response = await fetch(`${apiBase}/Inventory/import`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tk}`,
                },
                body: JSON.stringify(requestPayload),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Bạn không có quyền nhập kho. Vui lòng đăng nhập bằng tài khoản ADMIN hoặc MANAGER.')
                }

                throw new Error(resolveImportErrorMessage(data, requestPayload))
            }

            setImportSuccess(data?.message || 'Nhập kho thành công.')
            setIsImportModalOpen(false)
            await fetchInventoryData()
        } catch (e) {
            setImportError(e.message || 'Không thể nhập kho.')
        } finally {
            setImporting(false)
        }
    }

    const fetchBatchDetails = async (logItem) => {
        if (logItem.referenceType !== 'PRODUCTION_BATCH' || !logItem.referenceId) {
            return
        }

        const tk = token()
        if (!tk) return

        setLoadingBatchDetails(true)
        setBatchDetailModal(true)
        setBatchDetails(null)

        try {
            const headers = {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
            }

            // Fetch batch info
            const batchRes = await fetch(`${apiBase}/ProductionBatches/${logItem.referenceId}`, {
                method: 'GET',
                headers,
            })

            if (!batchRes.ok) {
                throw new Error('Không thể tải thông tin mẻ sản xuất')
            }

            const batchData = await batchRes.json()

            // Fetch recipe/BOM if available
            let materials = []
            if (batchData.productId) {
                try {
                    const recipeRes = await fetch(`${apiBase}/Recipes/parent/${batchData.productId}`, {
                        method: 'GET',
                        headers,
                    })

                    if (recipeRes.ok) {
                        const recipeData = await recipeRes.json()
                        materials = parseArrayData(recipeData).map((item) => ({
                            materialId: item.materialId,
                            materialName: productNameMap[item.materialId] || `Nguyên liệu #${item.materialId}`,
                            quantityRequired: item.quantityRequired || 0,
                            wasteAllowance: item.maxWastePercent ?? item.wasteAllowancePercent ?? 0,
                        }))
                    }
                } catch {
                    // Ignore recipe errors
                }
            }

            setBatchDetails({
                batchCode: batchData.batchCode,
                productName: batchData.product?.productName || productNameMap[batchData.productId] || 'N/A',
                quantityPlanned: batchData.quantityPlanned || 0,
                quantityActual: batchData.quantityActual || 0,
                mfgDate: batchData.mfgDate,
                expDate: batchData.expDate,
                status: batchData.status,
                materials,
            })
        } catch (error) {
            console.error('Error fetching batch details:', error)
            setBatchDetails({ error: error.message || 'Không thể tải chi tiết mẻ sản xuất' })
        } finally {
            setLoadingBatchDetails(false)
        }
    }

    const closeBatchDetailModal = () => {
        setBatchDetailModal(false)
        setBatchDetails(null)
    }

    useEffect(() => {
        fetchProductMap()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        fetchInventoryData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Object.keys(productNameMap).length])

    const productOptions = useMemo(() => {
        const map = new Map()
        rows.forEach((row) => {
            if (row.productId > 0) map.set(row.productId, row.productName)
        })
        logs.forEach((log) => {
            if (log.productId > 0 && !map.has(log.productId)) {
                map.set(log.productId, log.productName)
            }
        })

        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    }, [rows, logs])

    const filteredRows = useMemo(() => {
        let result = rows

        if (productFilter) {
            const selectedId = Number(productFilter)
            result = result.filter((row) => row.productId === selectedId)
        }

        if (statusFilter) {
            result = result.filter((row) => row.status === statusFilter)
        }

        return result
    }, [rows, productFilter, statusFilter])

    const filteredLogs = useMemo(() => {
        if (!productFilter) return logs
        const selectedId = Number(productFilter)
        return logs.filter((log) => log.productId === selectedId)
    }, [logs, productFilter])

    const stats = useMemo(() => ({
        total: filteredRows.length,
        low: filteredRows.filter((row) => row.status === 'low').length,
        critical: filteredRows.filter((row) => row.status === 'critical').length,
        quantity: filteredRows.reduce((sum, row) => sum + Number(row.currentQuantity || 0), 0),
    }), [filteredRows])

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
                    <h2 className="text-lg font-bold leading-tight">Tồn kho và nhật ký biến động</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="h-10 px-4 rounded-lg bg-[#4e5d43] text-white text-sm font-semibold hover:bg-[#415238]"
                        onClick={openImportModal}
                    >
                        Nhập kho
                    </button>
                    <button className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm" onClick={fetchInventoryData}>
                        {loading ? 'Đang tải...' : 'Tải lại'}
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[{ label: 'Sản phẩm', value: stats.total }, { label: 'Sắp hết', value: stats.low }, { label: 'Hết hàng', value: stats.critical }, { label: 'Tổng tồn', value: stats.quantity }].map((card) => (
                        <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-4">{card.label}</p>
                            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lọc theo sản phẩm</span>
                            <select
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                value={productFilter}
                                onChange={(e) => setProductFilter(e.target.value)}
                            >
                                <option value="">Tất cả sản phẩm</option>
                                {productOptions.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lọc theo mức cảnh báo</span>
                            <select
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Tất cả mức độ</option>
                                <option value="ok">Còn nhiều</option>
                                <option value="low">Sắp hết</option>
                                <option value="critical">Hết hàng</option>
                            </select>
                        </label>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                        {error}
                    </div>
                ) : null}

                {info ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                        {info}
                    </div>
                ) : null}

                {importSuccess ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">
                        {importSuccess}
                    </div>
                ) : null}

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-semibold text-lg">Tồn kho hiện tại</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    {['Sản phẩm', 'Vị trí', 'Tồn hiện tại', 'Mức tối thiểu', 'Cập nhật', 'Mức cảnh báo'].map((h) => (
                                        <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                                {!loading && filteredRows.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm">Không có dữ liệu tồn kho.</td></tr> : null}
                                {!loading && filteredRows.map((row) => (
                                    <tr key={`${row.id}-${row.productId}`} className={stockBg[row.status]}>
                                        <td className="px-5 py-4 text-sm font-medium">{row.productName}</td>
                                        <td className="px-5 py-4 text-sm">{row.locationType} #{row.locationId || 'N/A'}</td>
                                        <td className="px-5 py-4 text-sm font-semibold">{row.currentQuantity}</td>
                                        <td className="px-5 py-4 text-sm">{row.minQuantity}</td>
                                        <td className="px-5 py-4 text-sm">{toReadableDate(row.lastUpdated)}</td>
                                        <td className="px-5 py-4 text-sm">
                                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColors[row.status]}`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-semibold text-lg">Lịch sử biến động (100 gần nhất)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    {['Thời gian', 'Sản phẩm', 'Hành động', 'Số lượng', 'Vị trí', 'Tham chiếu', 'Thao tác'].map((h) => (
                                        <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={7} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                                {!loading && filteredLogs.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-center text-sm">Không có lịch sử biến động.</td></tr> : null}
                                {!loading && filteredLogs.map((log) => (
                                    <tr key={`${log.id}-${log.createdAt}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                        <td className="px-5 py-4 text-xs">{toReadableDate(log.createdAt)}</td>
                                        <td className="px-5 py-4 text-sm font-medium">{log.productName}</td>
                                        <td className="px-5 py-4 text-sm">{log.action}</td>
                                        <td className="px-5 py-4 text-sm">
                                            <span className={`font-semibold ${log.quantityChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-sm">{log.locationType} #{log.locationId || 'N/A'}</td>
                                        <td className="px-5 py-4 text-sm">{log.referenceType} {log.referenceId ? `#${log.referenceId}` : ''}</td>
                                        <td className="px-5 py-4 text-sm">
                                            {log.referenceType === 'PRODUCTION_BATCH' && log.referenceId ? (
                                                <button
                                                    onClick={() => fetchBatchDetails(log)}
                                                    className="text-primary hover:underline text-xs font-medium"
                                                >
                                                    Xem chi tiết
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {isImportModalOpen ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={closeImportModal}>
                    <div
                        className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold">Nhập kho nguyên liệu</h3>
                            <button
                                type="button"
                                onClick={closeImportModal}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <form className="mt-3 space-y-3" onSubmit={submitImport}>
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-slate-600 dark:text-slate-300">Sản phẩm</span>
                                <select
                                    value={importForm.productId}
                                    onChange={(e) => updateImportForm('productId', e.target.value)}
                                    className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    required
                                >
                                    <option value="">Chọn sản phẩm</option>
                                    {importProducts.map((item) => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-slate-600 dark:text-slate-300">Nhà cung cấp</span>
                                <select
                                    value={importForm.supplierId}
                                    onChange={(e) => updateImportForm('supplierId', e.target.value)}
                                    className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    required
                                >
                                    <option value="">Chọn nhà cung cấp</option>
                                    {importSuppliers.map((item) => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-slate-600 dark:text-slate-300">Số lượng nhập</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={importForm.quantity}
                                    onChange={(e) => updateImportForm('quantity', e.target.value)}
                                    className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    required
                                />
                            </label>

                            {importError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                                    {importError}
                                </div>
                            ) : null}

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={closeImportModal}
                                    className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={importing}
                                    className="h-10 px-4 rounded-lg bg-[#4e5d43] text-white text-sm font-semibold hover:bg-[#415238] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {importing ? 'Đang nhập...' : 'Xác nhận nhập kho'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {batchDetailModal ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={closeBatchDetailModal}>
                    <div
                        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-semibold">Chi tiết mẻ sản xuất</h3>
                            <button
                                type="button"
                                onClick={closeBatchDetailModal}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        {loadingBatchDetails ? (
                            <div className="py-8 text-center text-sm text-slate-500">Đang tải chi tiết...</div>
                        ) : batchDetails?.error ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                                {batchDetails.error}
                            </div>
                        ) : batchDetails ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Mã mẻ</p>
                                        <p className="mt-1 font-semibold">{batchDetails.batchCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Sản phẩm</p>
                                        <p className="mt-1 font-semibold">{batchDetails.productName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">SL kế hoạch</p>
                                        <p className="mt-1 font-semibold">{batchDetails.quantityPlanned}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">SL thực tế</p>
                                        <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">{batchDetails.quantityActual}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Ngày sản xuất</p>
                                        <p className="mt-1 text-sm">{batchDetails.mfgDate || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Ngày hết hạn</p>
                                        <p className="mt-1 text-sm">{batchDetails.expDate || 'N/A'}</p>
                                    </div>
                                </div>

                                {batchDetails.materials && batchDetails.materials.length > 0 ? (
                                    <div>
                                        <h4 className="font-semibold mb-3">Nguyên liệu sử dụng</h4>
                                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                                        <th className="px-4 py-3 font-semibold">Nguyên liệu</th>
                                                        <th className="px-4 py-3 font-semibold text-right">Định mức</th>
                                                        <th className="px-4 py-3 font-semibold text-right">Hao hụt (%)</th>
                                                        <th className="px-4 py-3 font-semibold text-right">Thực tế cần</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {batchDetails.materials.map((material, idx) => {
                                                        const actualNeeded = material.quantityRequired * batchDetails.quantityActual * (1 + material.wasteAllowance / 100)
                                                        return (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-3">{material.materialName}</td>
                                                                <td className="px-4 py-3 text-right">{material.quantityRequired}</td>
                                                                <td className="px-4 py-3 text-right">{material.wasteAllowance}%</td>
                                                                <td className="px-4 py-3 text-right font-semibold text-primary">{actualNeeded.toFixed(2)}</td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-sm text-slate-500">
                                        Không có thông tin nguyên liệu
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
