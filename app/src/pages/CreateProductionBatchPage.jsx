import { useEffect, useMemo, useState } from 'react'
import { MetricsStrip } from '../components/ui'

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
    if (!locationValue) return ''
    const raw = String(locationValue).trim()
    if (!raw) return ''

    const noQuery = raw.split('?')[0]
    const segments = noQuery.split('/').filter(Boolean)
    const last = segments[segments.length - 1] || ''
    return String(last).trim()
}

function resolveCreatedBatchId(data, locationHeader) {
    const locationId = parseIdFromLocationHeader(locationHeader)
    const candidates = [
        data?.productionBatchId,
        data?.batchId,
        data?.id,
        data?.data?.productionBatchId,
        data?.data?.batchId,
        data?.data?.id,
        locationId,
    ]

    const picked = candidates.find((value) => String(value || '').trim())
    return picked ? String(picked).trim() : ''
}

async function fetchBatchById(apiBase, token, id) {
    const response = await fetch(`${apiBase}/ProductionBatches/${id}`, {
        method: 'GET',
        headers: {
            accept: '*/*',
            Authorization: `Bearer ${token}`,
        },
    })

    const payload = await response.text().catch(() => '')
    if (!response.ok) {
        return { ok: false, status: response.status, data: null }
    }

    try {
        return { ok: true, status: response.status, data: JSON.parse(payload) }
    } catch {
        return { ok: true, status: response.status, data: null }
    }
}

async function discoverBatchIdByProbe(apiBase, token, plannedQty, mfgDate) {
    const normalizedDate = String(mfgDate || '').slice(0, 10)
    const seed = Number(localStorage.getItem('last_known_batch_id') || 1)
    const start = Number.isFinite(seed) && seed > 0 ? seed : 1

    let highestExisting = 0
    let missStreak = 0

    // Probe forward from the last known id to find the newest reachable ID quickly.
    for (let id = start; id <= start + 50; id += 1) {
        const result = await fetchBatchById(apiBase, token, id)
        if (!result.ok) {
            if (result.status === 404) {
                missStreak += 1
                if (missStreak >= 3 && highestExisting > 0) break
                continue
            }
            continue
        }

        highestExisting = id
        missStreak = 0
    }

    if (highestExisting <= 0) return ''

    // Search backward around newest IDs for a row that matches just-created batch shape.
    const lowerBound = Math.max(1, highestExisting - 40)
    for (let id = highestExisting; id >= lowerBound; id -= 1) {
        const result = await fetchBatchById(apiBase, token, id)
        if (!result.ok || !result.data) continue

        const row = result.data
        const qty = Number(row?.quantityPlanned ?? 0)
        const rowDate = String(row?.mfgDate || '').slice(0, 10)
        const status = String(row?.status || '').toUpperCase()

        if (
            qty === Number(plannedQty)
            && rowDate === normalizedDate
            && (status === 'PLANNED' || status === 'SCHEDULED' || status === 'IN_PROGRESS')
        ) {
            localStorage.setItem('last_known_batch_id', String(id))
            return String(id)
        }
    }

    localStorage.setItem('last_known_batch_id', String(highestExisting))
    return ''
}

function extractBatchIdFromText(rawText) {
    const text = String(rawText || '').trim()
    if (!text) return ''

    const patterns = [
        /production\s*batch\s*id\D{0,10}(\d+)/i,
        /batch\s*id\D{0,10}(\d+)/i,
        /\bid\b\D{0,10}(\d+)/i,
        /#(\d+)/,
    ]

    for (const pattern of patterns) {
        const matched = text.match(pattern)
        if (matched?.[1]) return String(matched[1]).trim()
    }

    return ''
}

function resolveApiErrorMessage(data, text, fallbackMessage) {
    const validationMessage = data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .filter(Boolean)
            .join(' ')
        : ''

    return data?.message || data?.title || data?.error || validationMessage || text || fallbackMessage
}

function shouldRetryOnValidation400(message) {
    const normalized = String(message || '').toLowerCase()
    if (!normalized) return false
    return normalized.includes('validation') || normalized.includes('required') || normalized.includes('field')
}

async function readResponsePayload(response) {
    const rawText = await response.text().catch(() => '')
    if (!rawText) return { json: {}, text: '' }

    try {
        return { json: JSON.parse(rawText), text: rawText }
    } catch {
        return { json: {}, text: rawText }
    }
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

function normalizeProductType(rawType) {
    const value = String(rawType || '').toUpperCase().trim()
    if (value === 'RAW') return 'RAW'
    if (value === 'FINISHED') return 'FINISHED'
    if (value === 'SEMI_FINISHED' || value === 'SEMI-FINISHED' || value === 'SEMI_FINISH' || value === 'SEMIFINISHED') {
        return 'SEMI_FINISHED'
    }
    return value || 'N/A'
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

const createBatchFieldSchema = [
    {
        key: 'mfgDate',
        label: 'Ngày sản xuất',
        required: true,
        inputType: 'date',
        timeSuffix: 'T00:00',
    },
    {
        key: 'expDate',
        label: 'Hạn sử dụng',
        required: true,
        inputType: 'date',
        timeSuffix: 'T23:59',
    },
]

function buildEmptyCreateBatchForm() {
    return createBatchFieldSchema.reduce((acc, field) => {
        acc[field.key] = ''
        return acc
    }, {})
}

function buildDefaultCreateBatchForm() {
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    return {
        mfgDate: `${today.toISOString().slice(0, 10)}T00:00`,
        expDate: `${nextWeek.toISOString().slice(0, 10)}T23:59`,
    }
}

function formatDateInputValue(value) {
    return String(value || '').slice(0, 10)
}

function updateDateFieldValue(formValue, fieldKey, dateText) {
    const field = createBatchFieldSchema.find((item) => item.key === fieldKey)
    const suffix = field?.timeSuffix || ''
    return {
        ...formValue,
        [fieldKey]: dateText ? `${dateText}${suffix}` : '',
    }
}

function buildCreateBatchPayloadVariants({ productId, quantityPlanned, mfgDateIso, expDateIso, orderId }) {
    const camelPayload = {
        productId,
        quantityPlanned,
        mfgDate: mfgDateIso,
    }

    const pascalPayload = {
        ProductId: productId,
        QuantityPlanned: quantityPlanned,
        MfgDate: mfgDateIso,
    }

    const snakePayload = {
        product_id: productId,
        quantity_planned: quantityPlanned,
        mfg_date: mfgDateIso,
    }

    if (expDateIso) {
        camelPayload.expDate = expDateIso
        pascalPayload.ExpDate = expDateIso
        snakePayload.exp_date = expDateIso
    }

    if (orderId) {
        camelPayload.orderId = orderId
        pascalPayload.OrderId = orderId
        snakePayload.order_id = orderId
    }

    const wrappedCamel = { request: camelPayload }
    const wrappedPascal = { request: pascalPayload }

    return [camelPayload, pascalPayload, wrappedCamel, wrappedPascal, snakePayload]
}

async function createBatchWithRetry(apiBase, token, payloadVariants) {
    let lastErrorMessage = ''

    for (let index = 0; index < payloadVariants.length; index += 1) {
        const payload = payloadVariants[index]
        const response = await fetch(`${apiBase}/ProductionBatches`, {
            method: 'POST',
            headers: {
                accept: '*/*',
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const { json: data, text: rawText } = await readResponsePayload(response)
        if (response.ok) {
            return { ok: true, response, data, rawText }
        }

        lastErrorMessage = resolveApiErrorMessage(
            data,
            rawText,
            'Không thể tạo mẻ sản xuất.',
        )

        const isLastVariant = index === payloadVariants.length - 1
        const shouldRetry = response.status === 400 && shouldRetryOnValidation400(lastErrorMessage)

        if (!shouldRetry || isLastVariant) {
            return { ok: false, response, data, rawText, errorMessage: lastErrorMessage }
        }
    }

    return {
        ok: false,
        response: null,
        data: {},
        rawText: '',
        errorMessage: lastErrorMessage || 'Không thể tạo mẻ sản xuất.',
    }
}

function normalizeRecipeMaterialLine(item) {
    const materialId = parseSafeNumber(item?.materialId ?? item?.material?.productId ?? item?.material?.id, 0)
    if (!materialId) return null

    return {
        materialId,
        materialName: item?.materialName || item?.material?.productName || item?.material?.name || 'Nguyên liệu chưa có tên',
        materialUnit: item?.materialUnit || item?.material?.baseUnit || '',
        quantityRequired: parseSafeNumber(item?.quantityRequired, 0),
        maxWastePercent: parseSafeNumber(item?.maxWastePercent ?? item?.max_waste_percent ?? item?.wasteAllowancePercent ?? item?.waste_allowance_percent, 0),
    }
}

function buildDefaultMaterialUsageRows(materialLines, suggestedQuantity) {
    const qty = parseSafeNumber(suggestedQuantity, 0)
    return materialLines.map((line) => {
        const netNeeded = qty > 0 ? parseSafeNumber((line.quantityRequired || 0) * qty, 0) : 0
        return {
            ...line,
            expectedNet: Number(netNeeded.toFixed(4)),
            actualWasted: '0',
        }
    })
}

function buildAdditionalMaterialsFromUsages(materialUsages, actualQty) {
    const qty = parseSafeNumber(actualQty, 0)
    if (!Array.isArray(materialUsages) || qty <= 0) return []

    const grouped = new Map()
    materialUsages.forEach((usage) => {
        const productId = parseSafeNumber(usage?.materialId, 0)
        if (!productId) return

        const quantityRequired = parseSafeNumber(usage?.quantityRequired, 0)
        const expectedNet = quantityRequired * qty
        // UI semantics: actualUsed is total consumed from inventory (already includes waste).
        const reportedTotal = parseSafeNumber(usage?.totalUsed ?? usage?.actualUsed, 0)
        const extraUsed = reportedTotal - expectedNet

        if (extraUsed > 0) {
            grouped.set(productId, (grouped.get(productId) || 0) + extraUsed)
        }
    })

    return Array.from(grouped.entries())
        .map(([productId, quantityUsed]) => ({
            productId,
            quantityUsed: Number(quantityUsed.toFixed(4)),
        }))
        .filter((item) => item.quantityUsed > 0)
}

export default function CreateProductionBatchPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [products, setProducts] = useState([])
    const [productsLoading, setProductsLoading] = useState(false)
    const [batches, setBatches] = useState([])
    const [batchesLoading, setBatchesLoading] = useState(false)
    const [allBatches, setAllBatches] = useState([]) // Tất cả batches (để check sản phẩm nào đã có batch)
    const [orderBatchProgress, setOrderBatchProgress] = useState({}) // { orderId: { created: 2, total: 3 } }
    const [creatingRowKey, setCreatingRowKey] = useState('')
    const [checkingBomRowKey, setCheckingBomRowKey] = useState('')
    const [showCreateBatchModal, setShowCreateBatchModal] = useState(false)
    const [selectedRowToCreate, setSelectedRowToCreate] = useState(null)
    const [createBatchForm, setCreateBatchForm] = useState(() => buildEmptyCreateBatchForm())
    const [completingBatchId, setCompletingBatchId] = useState(null)
    const [batchActualQuantities, setBatchActualQuantities] = useState({})
    const [showCompleteBatchModal, setShowCompleteBatchModal] = useState(false)
    const [selectedBatchToComplete, setSelectedBatchToComplete] = useState(null)
    const [completeBatchForm, setCompleteBatchForm] = useState({
        actualQuantity: ''
    })
    const [completeMaterialUsages, setCompleteMaterialUsages] = useState([])
    const [completeUsagesLoading, setCompleteUsagesLoading] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importForm, setImportForm] = useState({
        productId: '',
        quantity: '1',
        supplierId: '',
    })
    const [rawProducts, setRawProducts] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState('')
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

    const productMap = useMemo(() => {
        const map = {}
        products.forEach((item) => {
            map[Number(item.id)] = {
                name: item.name,
                productType: item.productType,
            }
        })
        return map
    }, [products])

    const approvedDemandRows = useMemo(() => {
        const rows = []
        orders.forEach((order) => {
            // Lấy danh sách productId đã có batch cho order này
            const productsWithBatch = new Set()
            allBatches.forEach((batch) => {
                const batchOrderId = parseSafeNumber(batch?.orderId ?? batch?.internalOrderId, 0)
                if (batchOrderId === order.orderId) {
                    const productId = parseSafeNumber(batch?.productId, 0)
                    if (productId > 0) {
                        productsWithBatch.add(productId)
                    }
                }
            })

                ; (order.details || []).forEach((detail) => {
                    const productInfo = productMap[Number(detail.productId)] || null

                    // Chỉ hiển thị sản phẩm CHƯA CÓ BATCH
                    if (!productsWithBatch.has(Number(detail.productId))) {
                        rows.push({
                            key: detail.key,
                            orderId: order.orderId,
                            orderCode: order.orderCode,
                            storeName: order.storeName,
                            productId: Number(detail.productId),
                            productName: detail.productName,
                            quantityOrdered: Number(detail.quantityOrdered || 0),
                            productType: productInfo?.productType || 'N/A',
                        })
                    }
                })
        })
        return rows
    }, [orders, productMap, allBatches])

    const fetchProducts = async () => {
        const tk = getToken()
        setProductsLoading(true)
        try {
            const response = await fetch(`${apiBase}/Products/manufactured`, {
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
                        name: item?.productName || item?.name || 'Sản phẩm chưa có tên',
                        productType: normalizeProductType(item?.productType),
                    }
                })
                .filter(Boolean)

            setProducts(normalized)
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
                    orderId, // Add orderId to each detail
                    productId: detailProductId,
                    productName: row?.product?.productName || row?.product?.name || productMap[detailProductId] || `Sản phẩm chưa có tên`,
                    quantityOrdered: detailQty,
                }
            })
            .filter(Boolean)

        return {
            orderId,
            orderCode: item?.orderCode || `${orderId}`,
            status: normalizeOrderStatus(item?.orderStatus || item?.status),
            storeId: parseSafeNumber(item?.storeId ?? item?.store?.storeId ?? item?.store?.id, 0),
            storeName: item?.store?.storeName || item?.store?.name || `Cửa hàng chưa có tên`,
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
        name: item?.supplierName || item?.name || 'Nhà cung cấp chưa có tên',
            setOrdersLoading(true)
        try {
            const productMap = products.reduce((acc, product) => {
                acc[Number(product.id)] = product.name
                return acc
            }, {})

            const fetchOrderRecords = async (url) => {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                    },
                })

                const data = await response.json().catch(() => [])
                if (!response.ok) {
                    throw new Error(data?.message || data?.title || `Không thể tải danh sách đơn (${response.status}).`)
                }

                return parseArrayData(data)
            }

            let records = []
            const defaultStoreId = resolveDefaultStoreId()
            try {
                // Chỉ fetch APPROVED vì PROCESSING đã tạo đủ batch rồi
                records = await fetchOrderRecords(`${apiBase}/internal-orders?storeId=${encodeURIComponent(defaultStoreId)}&status=APPROVED`)
            } catch {
                records = await fetchOrderRecords(`${apiBase}/internal-orders?storeId=${encodeURIComponent(defaultStoreId)}`)
            }

            const baseOrders = records
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
        fetchApprovedOrders()
        fetchInProgressBatches()
        calculateBatchProgress()
    }, [products.length])

    const fetchInProgressBatches = async () => {
        const tk = getToken()
        if (!tk) return

        setBatchesLoading(true)
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
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách mẻ sản xuất.')
            }

            const normalized = parseArrayData(data)
                .map((item) => {
                    const id = parseSafeNumber(item?.batchId ?? item?.productionBatchId ?? item?.id, 0)
                    if (!id) return null

                    const status = String(item?.status || '').toUpperCase()
                    if (status !== 'IN_PROGRESS') return null

                    return {
                        id,
                        status: status,
                        productId: parseSafeNumber(item?.productId ?? item?.product?.productId ?? item?.product?.id, 0),
                        productName: item?.product?.productName || item?.product?.name || `Sản phẩm chưa có tên`,
                        quantityPlanned: parseSafeNumber(item?.quantityPlanned, 0),
                        quantityActual: parseSafeNumber(item?.quantityActual, 0),
                        orderId: parseSafeNumber(item?.orderId ?? item?.internalOrderId, 0) || null,
                        storeId: parseSafeNumber(item?.storeId ?? item?.store?.storeId ?? item?.store?.id, 0) || null,
                        mfgDate: item?.mfgDate || item?.createdAt || null,
                    }
                })
                .filter(Boolean)
                .sort((a, b) => new Date(b.mfgDate || 0).getTime() - new Date(a.mfgDate || 0).getTime())

            setBatches(normalized)
            await calculateBatchProgress() // Tính lại progress sau khi fetch batches
        } catch (requestError) {
            setBatches([])
        } finally {
            setBatchesLoading(false)
        }
    }

    const calculateBatchProgress = async () => {
        const tk = getToken()
        if (!tk) return

        try {
            // Fetch tất cả batches
            const response = await fetch(`${apiBase}/ProductionBatches`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) return

            const allBatchesData = parseArrayData(data)

            // Enrich batches với orderId từ orderIds array
            const enrichedBatches = []
            allBatchesData.forEach((batch) => {
                const orderIds = Array.isArray(batch?.orderIds) ? batch.orderIds : []
                if (orderIds.length > 0) {
                    // Batch có orderIds → tạo bản sao cho mỗi orderId
                    orderIds.forEach(orderId => {
                        enrichedBatches.push({
                            ...batch,
                            orderId: orderId,
                            internalOrderId: orderId
                        })
                    })
                } else {
                    // Batch không có orderIds → giữ nguyên
                    enrichedBatches.push(batch)
                }
            })

            setAllBatches(enrichedBatches)

            // Tính progress cho từng order
            const progressMap = {}
            orders.forEach((order) => {
                const totalProducts = (order.details || []).length
                const productsWithBatch = new Set()

                enrichedBatches.forEach((batch) => {
                    const batchOrderId = parseSafeNumber(batch?.orderId ?? batch?.internalOrderId, 0)
                    if (batchOrderId === order.orderId) {
                        const productId = parseSafeNumber(batch?.productId, 0)
                        if (productId > 0) {
                            productsWithBatch.add(productId)
                        }
                    }
                })

                progressMap[order.orderId] = {
                    created: productsWithBatch.size,
                    total: totalProducts
                }

            })

            setOrderBatchProgress(progressMap)
        } catch (error) {
            console.error('Error calculating batch progress:', error)
        }
    }

    const updateCompleteMaterialUsage = (index, key, value) => {
        setCompleteMaterialUsages((current) =>
            current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
        )
    }

    const fetchRecipeMaterialsForProduct = async (productId, tk) => {
        const response = await fetch(`${apiBase}/Recipes/parent/${productId}`, {
            method: 'GET',
            headers: {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
            },
        })

        const data = await response.json().catch(() => [])
        if (!response.ok) {
            if (response.status === 404) return []
            throw new Error(resolveApiErrorMessage(data, '', 'Không thể tải định mức nguyên liệu (BOM).'))
        }

        return parseArrayData(data)
            .map((item) => normalizeRecipeMaterialLine(item))
            .filter(Boolean)
    }

    const openCompleteBatchModal = async (batch) => {
        setSelectedBatchToComplete(batch)
        setCompleteBatchForm({
            actualQuantity: batchActualQuantities[batch.id] || String(parseSafeNumber(batch?.quantityPlanned, 0) || ''),
        })
        setCompleteMaterialUsages([])
        setCompleteUsagesLoading(true)
        setShowCompleteBatchModal(true)
        setError('')

        const tk = getToken()
        if (!tk) {
            setCompleteUsagesLoading(false)
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const productId = parseSafeNumber(batch?.productId, 0)
        if (!productId) {
            setCompleteUsagesLoading(false)
            setError('Mẻ không có productId hợp lệ để tải công thức BOM.')
            return
        }

        try {
            const materialLines = await fetchRecipeMaterialsForProduct(productId, tk)

            if (materialLines.length === 0) {
                setCompleteMaterialUsages([])
                setError('Không tìm thấy BOM cho sản phẩm này. Không thể hoàn thành mẻ theo luồng mới.')
                return
            }

            const suggestedQty = batchActualQuantities[batch.id] || parseSafeNumber(batch?.quantityPlanned, 0)
            setCompleteMaterialUsages(buildDefaultMaterialUsageRows(materialLines, suggestedQty))
        } catch (requestError) {
            setCompleteMaterialUsages([])
            setError(requestError.message || 'Không thể tải BOM để hoàn thành mẻ.')
        } finally {
            setCompleteUsagesLoading(false)
        }
    }

    const closeCompleteBatchModal = () => {
        if (completingBatchId) return // Đang xử lý thì không cho đóng
        setShowCompleteBatchModal(false)
        setSelectedBatchToComplete(null)
        setCompleteBatchForm({
            actualQuantity: ''
        })
        setCompleteMaterialUsages([])
        setCompleteUsagesLoading(false)
    }

    const handleCompleteBatchSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        const batch = selectedBatchToComplete
        if (!batch) return

        const tk = getToken()
        if (!tk) {
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const actualQty = Number(completeBatchForm.actualQuantity)
        if (!actualQty || actualQty <= 0) {
            setError(`Phải nhập số lượng thực tế (lớn hơn 0) khi hoàn thành mẻ ${batch.id}!`)
            return
        }

        if (completeMaterialUsages.length === 0) {
            setError('Thiếu materialUsages. Vui lòng tải đủ BOM trước khi hoàn thành mẻ.')
            return
        }

        const parsedMaterialUsages = []
        for (let index = 0; index < completeMaterialUsages.length; index += 1) {
            const usage = completeMaterialUsages[index]
            const materialId = parseSafeNumber(usage.materialId, 0)
            const quantityRequired = parseSafeNumber(usage.quantityRequired, 0)
            const maxWastePercent = parseSafeNumber(usage.maxWastePercent, 0)
            const rawWasted = String(usage.actualWasted ?? '').trim()
            const expectedNet = Number((quantityRequired * actualQty).toFixed(4))
            const maxWasteQty = Number(((expectedNet * maxWastePercent) / 100).toFixed(4))

            if (!rawWasted) {
                setError(`Dòng ${index + 1}: Vui lòng nhập hao hụt thực tế (số lượng).`)
                return
            }

            const actualWasted = Number(usage.actualWasted)

            if (!materialId) {
                setError(`Dòng nguyên liệu ${index + 1} không hợp lệ.`)
                return
            }

            if (quantityRequired <= 0) {
                setError(`Dòng ${index + 1}: Định mức nguyên liệu không hợp lệ (phải > 0).`)
                return
            }

            if (!Number.isFinite(actualWasted) || actualWasted < 0) {
                setError(`Dòng ${index + 1}: Hao hụt thực tế phải >= 0.`)
                return
            }

            if (actualWasted > maxWasteQty + 0.000001) {
                setError(`Dòng ${index + 1}: Hao hụt thực tế vượt mức cho phép (${maxWasteQty} theo max ${maxWastePercent}%).`)
                return
            }

            const totalUsed = Number((expectedNet + actualWasted).toFixed(4))

            parsedMaterialUsages.push({
                materialId,
                quantityRequired,
                // Base BOM deduction: always consume expected net from production quantity.
                actualUsed: expectedNet,
                actualWasted: Number(actualWasted.toFixed(4)),
                // Preserve total consumed for FE-side additional material calculation.
                totalUsed,
                maxWastePercent,
            })
        }

        setCompletingBatchId(batch.id)
        try {
            const additionalMaterials = buildAdditionalMaterialsFromUsages(parsedMaterialUsages, actualQty)
            const materialUsagesForPayload = parsedMaterialUsages.map((usage) => ({
                materialId: usage.materialId,
                actualUsed: usage.actualUsed,
                actualWasted: usage.actualWasted,
            }))
            const statusPayloadVariants = [
                { status: 'COMPLETED', quantityActual: actualQty, additionalMaterials },
                { status: 'COMPLETED', quantityActual: actualQty },
                { Status: 'COMPLETED', QuantityActual: actualQty, AdditionalMaterials: additionalMaterials },
                { Status: 'COMPLETED', QuantityActual: actualQty },
                { request: { status: 'COMPLETED', quantityActual: actualQty, additionalMaterials } },
                { request: { Status: 'COMPLETED', QuantityActual: actualQty, AdditionalMaterials: additionalMaterials } },
            ]

            let completedData = {}
            let completedSuccessfully = false
            let lastErrorMsg = ''
            let shouldTryLegacyCompleteEndpoint = false

            for (let index = 0; index < statusPayloadVariants.length; index += 1) {
                const response = await fetch(`${apiBase}/ProductionBatches/${batch.id}/status`, {
                    method: 'PUT',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(statusPayloadVariants[index]),
                })

                const { json: data, text: rawText } = await readResponsePayload(response)
                if (response.ok) {
                    completedData = data
                    completedSuccessfully = true
                    break
                }

                lastErrorMsg = resolveApiErrorMessage(data, rawText, `Lỗi ${response.status}`)
                const isLastVariant = index === statusPayloadVariants.length - 1
                const isValidation400 = response.status === 400 && shouldRetryOnValidation400(lastErrorMsg)

                if (response.status === 404 || response.status === 405) {
                    shouldTryLegacyCompleteEndpoint = true
                    break
                }

                if (isValidation400 && !isLastVariant) {
                    continue
                }

                if (isValidation400 && isLastVariant) {
                    shouldTryLegacyCompleteEndpoint = true
                }

                break
            }

            if (!completedSuccessfully && shouldTryLegacyCompleteEndpoint) {
                const completePayloadVariants = [
                    {
                        quantityActual: actualQty,
                        materialUsages: materialUsagesForPayload,
                    },
                    {
                        QuantityActual: actualQty,
                        MaterialUsages: materialUsagesForPayload,
                    },
                    {
                        request: {
                            quantityActual: actualQty,
                            materialUsages: materialUsagesForPayload,
                        },
                    },
                ]

                for (let index = 0; index < completePayloadVariants.length; index += 1) {
                    const response = await fetch(`${apiBase}/ProductionBatches/${batch.id}/complete`, {
                        method: 'POST',
                        headers: {
                            accept: '*/*',
                            Authorization: `Bearer ${tk}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(completePayloadVariants[index]),
                    })

                    const { json: data, text: rawText } = await readResponsePayload(response)
                    if (response.ok) {
                        completedData = data
                        completedSuccessfully = true
                        break
                    }

                    lastErrorMsg = resolveApiErrorMessage(data, rawText, `Lỗi ${response.status}`)
                    const isLastVariant = index === completePayloadVariants.length - 1
                    const shouldRetry = response.status === 400 && shouldRetryOnValidation400(lastErrorMsg)

                    if (!shouldRetry || isLastVariant) {
                        break
                    }
                }
            }

            if (!completedSuccessfully) {
                const finalMessage = lastErrorMsg
                    ? `${lastErrorMsg} (Gợi ý: kiểm tra trạng thái mẻ phải là IN_PROGRESS và tồn kho nguyên liệu có đủ trước khi complete.)`
                    : 'Hoàn thành mẻ thất bại.'
                console.error('❌ Failed to complete batch:', finalMessage, {
                    batchId: batch.id,
                    quantityActual: actualQty,
                    materialUsages: materialUsagesForPayload,
                    materialUsagesForCalc: parsedMaterialUsages,
                })
                throw new Error(finalMessage)
            }

            setSuccess(completedData?.message || `Mẻ ${batch.id} đã hoàn thành với SL thực tế: ${actualQty}.`)

            // Đóng modal và reset form
            setShowCompleteBatchModal(false)
            setSelectedBatchToComplete(null)
            setCompleteBatchForm({
                actualQuantity: ''
            })
            setCompleteMaterialUsages([])

            // Xóa số lượng đã nhập khỏi state
            setBatchActualQuantities(prev => {
                const newState = { ...prev }
                delete newState[batch.id]
                return newState
            })

            await fetchInProgressBatches()
            await fetchApprovedOrders()
            await calculateBatchProgress() // Cập nhật tiến độ và allBatches
        } catch (requestError) {
            setError(requestError.message || 'Hoàn thành mẻ sản xuất thất bại.')
        } finally {
            setCompletingBatchId(null)
        }
    }

    const updateBatchActualQuantity = (batchId, value) => {
        const numValue = Number(value)
        if (numValue >= 0) {
            setBatchActualQuantities(prev => ({
                ...prev,
                [batchId]: numValue
            }))
        }
    }

    const fetchRawProductsAndSuppliers = async () => {
        const tk = getToken()
        if (!tk) return

        try {
            const headers = {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
            }

            const [rawRes, supplierRes] = await Promise.all([
                fetch(`${apiBase}/Products/raw`, { method: 'GET', headers }),
                fetch(`${apiBase}/Suppliers`, { method: 'GET', headers }),
            ])

            const rawData = await rawRes.json().catch(() => [])
            const supplierData = await supplierRes.json().catch(() => [])

            if (rawRes.ok) {
                const normalized = parseArrayData(rawData)
                    .map((item) => {
                        const id = parseSafeNumber(item?.productId ?? item?.id, 0)
                        if (!id) return null
                        return {
                            id,
                            name: item?.productName || item?.name || `Sản phẩm chưa có tên`,
                        }
                    })
                    .filter(Boolean)
                setRawProducts(normalized)

                if (normalized.length > 0 && !importForm.productId) {
                    setImportForm(prev => ({ ...prev, productId: String(normalized[0].id) }))
                }
            }

            if (supplierRes.ok) {
                const normalized = parseArrayData(supplierData)
                    .map((item) => {
                        const id = parseSafeNumber(item?.supplierId ?? item?.id, 0)
                        if (!id) return null
                        return {
                            id,
                            name: item?.supplierName || item?.name || `NCC ${id}`,
                            isActive: item?.isActive !== false,
                        }
                    })
                    .filter((item) => item?.isActive)
                    .filter(Boolean)
                setSuppliers(normalized)

                if (normalized.length > 0 && !importForm.supplierId) {
                    setImportForm(prev => ({ ...prev, supplierId: String(normalized[0].id) }))
                }
            }
        } catch (error) {
            console.error('Error fetching raw products/suppliers:', error)
        }
    }

    const openImportModal = () => {
        setShowImportModal(true)
        setImportError('')
        if (rawProducts.length === 0 || suppliers.length === 0) {
            fetchRawProductsAndSuppliers()
        }
    }

    const closeImportModal = () => {
        if (importing) return
        setShowImportModal(false)
        setImportError('')
    }

    const handleImportSubmit = async (e) => {
        e.preventDefault()
        setImportError('')

        const tk = getToken()
        if (!tk) {
            setImportError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const productId = parseSafeNumber(importForm.productId, 0)
        const supplierId = parseSafeNumber(importForm.supplierId, 0)
        const quantity = parseSafeNumber(importForm.quantity, 0)

        if (productId < 1) {
            setImportError('Vui lòng chọn sản phẩm hợp lệ.')
            return
        }
        if (supplierId < 1) {
            setImportError('Vui lòng chọn nhà cung cấp hợp lệ.')
            return
        }
        if (quantity <= 0) {
            setImportError('Số lượng nhập phải lớn hơn 0.')
            return
        }

        setImporting(true)
        try {
            const response = await fetch(`${apiBase}/Inventory/import`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tk}`,
                },
                body: JSON.stringify({
                    productId,
                    quantity,
                    supplierId,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                const errorMsg = data?.message || data?.title || 'Nhập kho thất bại.'
                throw new Error(errorMsg)
            }

            setSuccess(data?.message || 'Nhập nguyên liệu thành công.')
            setShowImportModal(false)
            setImportForm({ productId: '', quantity: '1', supplierId: '' })
        } catch (requestError) {
            setImportError(requestError.message || 'Không thể nhập kho.')
        } finally {
            setImporting(false)
        }
    }

    const refreshData = async () => {
        await fetchProducts()
        await fetchInProgressBatches()
    }

    const openCreateBatchModal = async (row) => {
        setError('')
        setSuccess('')

        const tk = getToken()
        if (!tk) {
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setCheckingBomRowKey(row.key)
        try {
            const materialLines = await fetchRecipeMaterialsForProduct(Number(row?.productId), tk)
            if (!Array.isArray(materialLines) || materialLines.length === 0) {
                setError(`Sản phẩm "${row.productName}" chưa có công thức BOM. Vui lòng tạo công thức trước khi tạo mẻ.`)
                return
            }

            setSelectedRowToCreate(row)
            setCreateBatchForm(buildDefaultCreateBatchForm())
            setShowCreateBatchModal(true)
        } catch (requestError) {
            setError(requestError.message || 'Không thể kiểm tra BOM trước khi tạo mẻ.')
        } finally {
            setCheckingBomRowKey('')
        }
    }

    const closeCreateBatchModal = () => {
        if (creatingRowKey) return // Đang tạo thì không cho đóng
        setShowCreateBatchModal(false)
        setSelectedRowToCreate(null)
        setCreateBatchForm(buildEmptyCreateBatchForm())
    }

    const handleCreateBatchSubmit = async (e) => {
        e.preventDefault()
        const row = selectedRowToCreate
        if (!row) return

        await handleCreateFromRow(row, createBatchForm)

        if (!creatingRowKey) {
            // Nếu tạo thành công (không còn loading), đóng modal
            setShowCreateBatchModal(false)
            setSelectedRowToCreate(null)
        }
    }

    const handleCreateFromRow = async (row, formValue) => {
        setError('')
        setSuccess('')

        const tk = getToken()
        if (!tk) {
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const pid = Number(row?.productId)
        const qty = Number(row?.quantityOrdered)
        if (!pid || pid < 1 || !Number.isFinite(qty) || qty < 1) {
            setError('Dòng đơn hàng không hợp lệ để tạo mẻ.')
            return
        }

        if (String(row?.productType || '').toUpperCase() === 'RAW') {
            setError('Sản phẩm RAW không thể tạo mẻ theo BOM. Chỉ tạo mẻ cho thành phẩm hoặc bán thành phẩm.')
            return
        }

        try {
            const materialLines = await fetchRecipeMaterialsForProduct(pid, tk)
            if (!Array.isArray(materialLines) || materialLines.length === 0) {
                setError(`Sản phẩm "${row.productName}" chưa có công thức BOM. Vui lòng tạo công thức trước khi tạo mẻ.`)
                return
            }
        } catch (requestError) {
            setError(requestError.message || 'Không thể kiểm tra BOM trước khi tạo mẻ.')
            return
        }

        const mfgDate = String(formValue?.mfgDate || '').trim()
        const expDate = String(formValue?.expDate || '').trim()

        if (!mfgDate) {
            setError('Vui lòng nhập ngày sản xuất.')
            return
        }

        if (!expDate) {
            setError('Vui lòng nhập hạn sử dụng.')
            return
        }

        setCreatingRowKey(row.key)
        try {
            const mfgDateObj = new Date(mfgDate)
            const expDateObj = new Date(expDate)
            if (Number.isNaN(mfgDateObj.getTime()) || Number.isNaN(expDateObj.getTime())) {
                throw new Error('Ngày sản xuất hoặc hạn sử dụng không hợp lệ.')
            }

            const mfgIso = mfgDateObj.toISOString()
            const expIso = expDateObj.toISOString()
            const payloadVariants = buildCreateBatchPayloadVariants({
                productId: pid,
                quantityPlanned: qty,
                mfgDateIso: mfgIso,
                expDateIso: expIso,
                orderId: row.orderId,
            })

            console.log('📦 Creating batch with payload variants:', payloadVariants)
            console.log('📅 ExpDate input:', expDate, '→ ISO:', expIso)

            const createResult = await createBatchWithRetry(apiBase, tk, payloadVariants)
            const response = createResult.response
            const data = createResult.data
            const rawCreateText = createResult.rawText
            const responseStatus = response?.status || 0

            console.log('✅ Create batch response:', responseStatus, data)

            if (!createResult.ok) {
                const errorMsg = createResult.errorMessage || data?.message || data?.title || rawCreateText || 'Không thể tạo mẻ sản xuất.'

                // Kiểm tra xem có phải lỗi thiếu nguyên liệu không
                const lowerMsg = String(errorMsg).toLowerCase()
                const isInsufficientMaterial =
                    lowerMsg.includes('insufficient') ||
                    lowerMsg.includes('not enough') ||
                    lowerMsg.includes('thiếu') ||
                    lowerMsg.includes('không đủ') ||
                    lowerMsg.includes('nguyên liệu') ||
                    lowerMsg.includes('material') ||
                    lowerMsg.includes('inventory')

                if (isInsufficientMaterial) {
                    throw new Error(`THIẾU NGUYÊN LIỆU: ${errorMsg}`)
                }

                throw new Error(errorMsg)
            }

            const locationHeader = response.headers.get('Location') || response.headers.get('location') || response.headers.get('Content-Location') || response.headers.get('content-location')
            const headerId = response.headers.get('X-Resource-Id') || response.headers.get('x-resource-id') || response.headers.get('X-Batch-Id') || response.headers.get('x-batch-id') || ''
            let createdBatchId = resolveCreatedBatchId(data, locationHeader)
                || extractBatchIdFromText(rawCreateText)
                || extractBatchIdFromText(data?.message)
                || extractBatchIdFromText(data?.title)
                || String(headerId || '').trim()

            if (!createdBatchId) {
                createdBatchId = await discoverBatchIdByProbe(apiBase, tk, qty, mfgIso)
            }

            console.log('🆔 Created batch ID:', createdBatchId)

            if (!createdBatchId) {
                setError(
                    'Tạo mẻ thành công nhưng backend chưa trả mã mẻ, nên chưa thể chuyển IN_PROGRESS để trừ kho nguyên liệu. '
                    + 'Vui lòng kiểm tra response create batch có productionBatchId/id hoặc Location header.',
                )
                await fetchApprovedOrders()
                return
            }

            localStorage.setItem('last_known_batch_id', String(createdBatchId))

            if (row.orderId) {
                const batchOrderMap = JSON.parse(localStorage.getItem('batch_order_map') || '{}')
                batchOrderMap[createdBatchId] = row.orderId
                localStorage.setItem('batch_order_map', JSON.stringify(batchOrderMap))
            }

            let statusWarning = ''
            {
                const payloadVariants = [
                    { status: 'in_progress' },
                    { Status: 'in_progress' },
                    { status: 'IN_PROGRESS' },
                    { Status: 'IN_PROGRESS' },
                    { request: { status: 'in_progress' } },
                    { request: { Status: 'IN_PROGRESS' } },
                ]

                let updateSuccess = false
                let lastErrorMessage = ''

                for (let index = 0; index < payloadVariants.length; index += 1) {
                    const progressRes = await fetch(`${apiBase}/ProductionBatches/${encodeURIComponent(createdBatchId)}/status`, {
                        method: 'PUT',
                        headers: {
                            accept: '*/*',
                            Authorization: `Bearer ${tk}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payloadVariants[index]),
                    })

                    const { json: progressData, text: rawProgressText } = await readResponsePayload(progressRes)
                    if (progressRes.ok) {
                        updateSuccess = true
                        break
                    }

                    lastErrorMessage = resolveApiErrorMessage(
                        progressData,
                        rawProgressText,
                        'Tạo mẻ thành công nhưng không thể chuyển IN_PROGRESS.',
                    )

                    const isLastVariant = index === payloadVariants.length - 1
                    const shouldRetry = progressRes.status === 400 && shouldRetryOnValidation400(lastErrorMessage)
                    if (!shouldRetry || isLastVariant) {
                        break
                    }
                }

                if (!updateSuccess) {
                    statusWarning = lastErrorMessage || 'Không thể tự chuyển mẻ sang IN_PROGRESS.'
                }
            }

            const inventoryHint = statusWarning
                ? ` ${statusWarning}`
                : ' Mẻ đã vào IN_PROGRESS. Backend sẽ tự động chuyển đơn sang PROCESSING khi đủ mẻ cho tất cả sản phẩm.'

            setSuccess(
                (data?.message || 'Tạo mẻ sản xuất thành công.')
                + ` (Mẻ ${createdBatchId}, Đơn: ${row.orderCode}, Sản phẩm: ${row.productName}, SL: ${qty}).`
                + inventoryHint,
            )

            await fetchApprovedOrders()
            await fetchInProgressBatches()
            await calculateBatchProgress() // Cập nhật tiến độ và allBatches
        } catch (requestError) {
            setError(requestError.message || 'Tạo mẻ sản xuất thất bại.')
        } finally {
            setCreatingRowKey('')
        }
    }

    const completeActualQty = Number(completeBatchForm.actualQuantity)
    const hasInvalidCompleteUsage = completeMaterialUsages.some((usage) => {
        const rawWasted = String(usage.actualWasted ?? '').trim()
        if (!rawWasted) return true

        const actualWasted = Number(usage.actualWasted)
        const quantityRequired = parseSafeNumber(usage.quantityRequired, 0)
        const maxWastePercent = parseSafeNumber(usage.maxWastePercent, 0)
        const expectedNet = Number((quantityRequired * Math.max(completeActualQty, 0)).toFixed(4))
        const maxWasteQty = Number(((expectedNet * maxWastePercent) / 100).toFixed(4))

        return !Number.isFinite(actualWasted)
            || actualWasted < 0
            || actualWasted > maxWasteQty + 0.000001
    })
    const canSubmitCompleteBatch = completeActualQty > 0
        && completeMaterialUsages.length > 0
        && !completeUsagesLoading
        && !completingBatchId

    const statsItems = useMemo(() => {
        const ordersInProgress = Object.values(orderBatchProgress || {}).filter((item) => {
            const created = parseSafeNumber(item?.created, 0)
            const total = parseSafeNumber(item?.total, 0)
            return total > 0 && created < total
        }).length

        return [
            {
                key: 'batch-active',
                label: 'Mẻ đang sản xuất',
                value: Number(batches.length || 0).toLocaleString('vi-VN'),
                note: 'Mẻ có thể hoàn thành',
                icon: 'precision_manufacturing',
                tone: 'green',
            },
            {
                key: 'batch-demand',
                label: 'Nhu cầu chờ tạo mẻ',
                value: Number(approvedDemandRows.length || 0).toLocaleString('vi-VN'),
                note: 'Sản phẩm từ đơn đã duyệt',
                icon: 'assignment',
                tone: 'blue',
            },
            {
                key: 'batch-orders',
                label: 'Đơn đang theo dõi',
                value: Number(orders.length || 0).toLocaleString('vi-VN'),
                note: `${ordersInProgress.toLocaleString('vi-VN')} đơn chưa đủ mẻ`,
                icon: 'inventory',
                tone: 'amber',
            },
            {
                key: 'batch-products',
                label: 'Sản phẩm SX',
                value: Number(products.length || 0).toLocaleString('vi-VN'),
                note: 'Danh mục thành phẩm khả dụng',
                icon: 'category',
                tone: 'purple',
            },
        ]
    }, [batches.length, approvedDemandRows.length, orders.length, products.length, orderBatchProgress])

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
                <div className="flex items-center gap-2">
                    <button
                        className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
                        onClick={refreshData}
                        disabled={productsLoading || ordersLoading || !!creatingRowKey}
                    >
                        {productsLoading || ordersLoading ? 'Đang tải...' : 'Tải lại'}
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-4">
                <MetricsStrip items={statsItems} columns="sm:grid-cols-2 xl:grid-cols-4" />

                {batches.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-900/20">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Mẻ đang sản xuất</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">{batches.length} mẻ</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Mẻ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">SL kế hoạch</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {batches.map((batch) => {
                                        const isCompleting = completingBatchId === batch.id

                                        // Kiểm tra status - chỉ IN_PROGRESS mới có thể hoàn thành
                                        const batchStatus = String(batch.status || '').toUpperCase()
                                        const isInProgress = batchStatus === 'IN_PROGRESS'

                                        return (
                                            <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3 text-sm font-semibold">
                                                    <div className="flex items-center gap-2">
                                                        {batch.id}
                                                        {!isInProgress && (
                                                            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                                {batch.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{batch.productName}</td>
                                                <td className="px-4 py-3 text-sm">{batch.quantityPlanned}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => openCompleteBatchModal(batch)}
                                                        disabled={isCompleting || !!completingBatchId || !isInProgress}
                                                        className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={
                                                            !isInProgress
                                                                ? `Mẻ phải ở trạng thái IN_PROGRESS (hiện tại: ${batch.status})`
                                                                : ''
                                                        }
                                                    >
                                                        {isCompleting ? 'Đang hoàn thành...' : 'Hoàn thành'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Đơn hàng đã phê duyệt</p>
                        <p className="text-xs text-slate-500">{approvedDemandRows.length} sản phẩm</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn hàng</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cửa hàng</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Loại</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tiến độ</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(ordersLoading || productsLoading) ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-sm text-center text-slate-500">Đang tải...</td>
                                    </tr>
                                ) : null}
                                {!ordersLoading && !productsLoading && approvedDemandRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-sm text-center text-slate-500">Chưa có đơn hàng</td>
                                    </tr>
                                ) : null}
                                {!ordersLoading && !productsLoading && approvedDemandRows.map((row) => {
                                    const isCreating = creatingRowKey === row.key
                                    const isCheckingBom = checkingBomRowKey === row.key
                                    const isRaw = String(row.productType).toUpperCase() === 'RAW'
                                    const progress = orderBatchProgress[row.orderId] || { created: 0, total: 0 }
                                    const isComplete = progress.created >= progress.total && progress.total > 0

                                    return (
                                        <tr key={row.key}>
                                            <td className="px-4 py-3 text-sm font-medium">{row.orderCode}</td>
                                            <td className="px-4 py-3 text-sm">{row.storeName}</td>
                                            <td className="px-4 py-3 text-sm">{row.productName}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${isRaw ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                                                    {row.productType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold">{row.quantityOrdered}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-semibold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {progress.created}/{progress.total}
                                                    </span>
                                                    {isComplete && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                            Đủ
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openCreateBatchModal(row)}
                                                    disabled={isCreating || isCheckingBom || !!creatingRowKey || !!checkingBomRowKey || isRaw}
                                                    className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                                                    title={isRaw ? 'RAW không tạo mẻ theo BOM' : ''}
                                                >
                                                    {isCheckingBom ? 'Đang kiểm tra BOM...' : isCreating ? 'Đang tạo mẻ...' : 'Tạo mẻ'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showCompleteBatchModal && selectedBatchToComplete ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={closeCompleteBatchModal}>
                    <div
                        className="w-[min(96vw,72rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-semibold">Hoàn thành mẻ {selectedBatchToComplete.id}</h3>
                            <button
                                type="button"
                                onClick={closeCompleteBatchModal}
                                disabled={!!completingBatchId}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm"><span className="font-semibold">Sản phẩm:</span> {selectedBatchToComplete.productName}</p>
                            <p className="text-sm mt-1"><span className="font-semibold">Kế hoạch:</span> {selectedBatchToComplete.quantityPlanned}</p>
                        </div>

                        <form onSubmit={handleCompleteBatchSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Số lượng thực tế <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={completeBatchForm.actualQuantity}
                                    onChange={(e) => setCompleteBatchForm({ ...completeBatchForm, actualQuantity: e.target.value })}
                                    className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    placeholder="Nhập số lượng"
                                    required
                                />
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Quy ước: hệ thống luôn trừ BOM gốc theo số lượng thực tế sản xuất. Bạn chỉ nhập phần hao hụt thực tế phát sinh thêm.
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Mức hao hụt nhập thêm phải nằm trong khoảng từ 0 đến mức tối đa theo Max waste (%).
                                </p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Báo cáo sử dụng nguyên liệu (materialUsages)
                                </p>

                                {completeUsagesLoading ? (
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                                        Đang tải định mức BOM...
                                    </div>
                                ) : null}

                                {!completeUsagesLoading && completeMaterialUsages.length === 0 ? (
                                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-3 text-sm text-amber-700 dark:text-amber-300">
                                        Chưa có BOM cho sản phẩm này hoặc không tải được công thức. Không thể gửi materialUsages.
                                    </div>
                                ) : null}

                                {!completeUsagesLoading && completeMaterialUsages.length > 0 ? (
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                                        <table className="w-full table-fixed text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="w-[30%] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Nguyên liệu</th>
                                                    <th className="w-[10%] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Định mức</th>
                                                    <th className="w-[12%] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Max waste (%)</th>
                                                    <th className="w-[24%] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tiêu hao BOM (tự tính)</th>
                                                    <th className="w-[24%] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Hao hụt thực tế (SL)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {completeMaterialUsages.map((usage, index) => {
                                                    const expectedNet = Number((parseSafeNumber(usage.quantityRequired, 0) * Math.max(completeActualQty, 0)).toFixed(4))
                                                    const maxWasteQty = Number(((expectedNet * parseSafeNumber(usage.maxWastePercent, 0)) / 100).toFixed(4))
                                                    const enteredWasted = Number(usage.actualWasted)
                                                    const rowInvalid = Number.isFinite(enteredWasted) && enteredWasted > maxWasteQty + 0.000001

                                                    return (
                                                        <tr key={`${usage.materialId}-${index}`}>
                                                            <td className="px-3 py-2 text-sm">
                                                                <p className="font-medium">{usage.materialName}</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">ID {usage.materialId} {usage.materialUnit ? `• ${usage.materialUnit}` : ''}</p>
                                                            </td>
                                                            <td className="px-3 py-2 text-sm">{usage.quantityRequired}</td>
                                                            <td className="px-3 py-2 text-sm">{usage.maxWastePercent}%</td>
                                                            <td className="px-3 py-2 text-sm">
                                                                <p className="font-semibold">{expectedNet}</p>
                                                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">= Định mức × SL thực tế</p>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={maxWasteQty}
                                                                    step="0.0001"
                                                                    value={usage.actualWasted}
                                                                    onChange={(e) => updateCompleteMaterialUsage(index, 'actualWasted', e.target.value)}
                                                                    className={`w-full h-9 rounded-lg border bg-white dark:bg-slate-800 px-2 text-sm outline-none focus:border-primary ${rowInvalid ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                                                                    required
                                                                />
                                                                <p className={`mt-1 text-[11px] ${rowInvalid ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                    Tối đa {maxWasteQty} (theo {usage.maxWastePercent}%)
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </div>

                            {hasInvalidCompleteUsage ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
                                    Dữ liệu chưa hợp lệ: hao hụt thực tế phải nằm trong khoảng 0 đến mức tối đa theo Max waste (%).
                                </div>
                            ) : null}

                            {error && showCompleteBatchModal ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                                    {error}
                                </div>
                            ) : null}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeCompleteBatchModal}
                                    disabled={!!completingBatchId}
                                    className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={!canSubmitCompleteBatch}
                                    className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {completingBatchId ? 'Đang hoàn thành...' : 'Xác nhận hoàn thành'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {showImportModal ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={closeImportModal}>
                    <div
                        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-semibold">Nhập nguyên liệu vào kho</h3>
                            <button
                                type="button"
                                onClick={closeImportModal}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleImportSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Nguyên liệu
                                </label>
                                <select
                                    value={importForm.productId}
                                    onChange={(e) => setImportForm({ ...importForm, productId: e.target.value })}
                                    className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    required
                                >
                                    <option value="">Chọn nguyên liệu</option>
                                    {rawProducts.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Nhà cung cấp
                                </label>
                                <select
                                    value={importForm.supplierId}
                                    onChange={(e) => setImportForm({ ...importForm, supplierId: e.target.value })}
                                    className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    required
                                >
                                    <option value="">Chọn nhà cung cấp</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Số lượng nhập
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={importForm.quantity}
                                    onChange={(e) => setImportForm({ ...importForm, quantity: e.target.value })}
                                    className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                    required
                                />
                            </div>

                            {importError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                                    {importError}
                                </div>
                            ) : null}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeImportModal}
                                    className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
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

            {showCreateBatchModal && selectedRowToCreate ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={closeCreateBatchModal}>
                    <div
                        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-semibold">Tạo mẻ sản xuất</h3>
                            <button
                                type="button"
                                onClick={closeCreateBatchModal}
                                disabled={!!creatingRowKey}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm"><span className="font-semibold">Đơn hàng:</span> {selectedRowToCreate.orderCode}</p>
                            <p className="text-sm mt-1"><span className="font-semibold">Sản phẩm:</span> {selectedRowToCreate.productName}</p>
                            <p className="text-sm mt-1"><span className="font-semibold">Số lượng:</span> {selectedRowToCreate.quantityOrdered}</p>
                        </div>

                        <form onSubmit={handleCreateBatchSubmit} className="space-y-4">
                            {createBatchFieldSchema.map((field) => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        {field.label} {field.required ? <span className="text-red-500">*</span> : null}
                                    </label>
                                    <input
                                        type={field.inputType}
                                        value={formatDateInputValue(createBatchForm[field.key])}
                                        onChange={(e) => setCreateBatchForm((prev) => updateDateFieldValue(prev, field.key, e.target.value))}
                                        className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                                        required={field.required}
                                    />
                                </div>
                            ))}

                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Lưu ý: Hạn sử dụng chỉ có thể nhập khi tạo mẻ. Sau khi tạo, không thể thay đổi.
                                </p>
                            </div>

                            {error && showCreateBatchModal ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                                    {error}
                                </div>
                            ) : null}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeCreateBatchModal}
                                    disabled={!!creatingRowKey}
                                    className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={!!creatingRowKey}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {creatingRowKey ? 'Đang tạo mẻ...' : 'Xác nhận tạo mẻ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
