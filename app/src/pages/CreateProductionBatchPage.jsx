import { useEffect, useMemo, useState } from 'react'

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

export default function CreateProductionBatchPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [products, setProducts] = useState([])
    const [productsLoading, setProductsLoading] = useState(false)
    const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().slice(0, 16))
    const [creatingRowKey, setCreatingRowKey] = useState('')
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
            ; (order.details || []).forEach((detail) => {
                const productInfo = productMap[Number(detail.productId)] || null
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
            })
        })
        return rows
    }, [orders, productMap])

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
                        name: item?.productName || item?.name || `Product #${id}`,
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
    }, [products.length])

    const refreshData = async () => {
        await fetchProducts()
    }

    const handleCreateFromRow = async (row) => {
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

        if (!mfgDate) {
            setError('Vui lòng nhập ngày sản xuất.')
            return
        }

        setCreatingRowKey(row.key)
        try {
            const mfgIso = new Date(mfgDate).toISOString()
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
                    mfgDate: mfgIso,
                }),
            })

            const { json: data, text: rawCreateText } = await readResponsePayload(response)
            if (!response.ok) {
                throw new Error(data?.message || data?.title || rawCreateText || 'Không thể tạo mẻ sản xuất.')
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

            if (!createdBatchId) {
                setError(
                    'Tạo mẻ thành công nhưng backend chưa trả mã mẻ, nên chưa thể chuyển IN_PROGRESS để trừ kho nguyên liệu. '
                    + 'Vui lòng kiểm tra response create batch có productionBatchId/id hoặc Location header.',
                )
                await fetchApprovedOrders()
                return
            }

            localStorage.setItem('last_known_batch_id', String(createdBatchId))

            {
                const allocationVariants = [
                    [{ orderId: Number(row.orderId), allocatedQuantity: qty }],
                    [{ OrderId: Number(row.orderId), AllocatedQuantity: qty }],
                    { requests: [{ orderId: Number(row.orderId), allocatedQuantity: qty }] },
                    { requests: [{ OrderId: Number(row.orderId), AllocatedQuantity: qty }] },
                ]

                let allocationSuccess = false
                let allocationErrorMessage = ''

                for (let index = 0; index < allocationVariants.length; index += 1) {
                    const allocationRes = await fetch(`${apiBase}/ProductionBatches/${encodeURIComponent(createdBatchId)}/allocate`, {
                        method: 'POST',
                        headers: {
                            accept: '*/*',
                            Authorization: `Bearer ${tk}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(allocationVariants[index]),
                    })

                    const { json: allocationData, text: allocationRawText } = await readResponsePayload(allocationRes)
                    if (allocationRes.ok) {
                        allocationSuccess = true
                        break
                    }

                    allocationErrorMessage = resolveApiErrorMessage(
                        allocationData,
                        allocationRawText,
                        'Tạo mẻ thành công nhưng không thể gán đơn vào mẻ.',
                    )

                    const isLastVariant = index === allocationVariants.length - 1
                    const shouldRetry = allocationRes.status === 400 && shouldRetryOnValidation400(allocationErrorMessage)
                    if (!shouldRetry || isLastVariant) {
                        throw new Error(allocationErrorMessage)
                    }
                }

                if (!allocationSuccess) {
                    throw new Error(allocationErrorMessage || 'Tạo mẻ thành công nhưng không thể gán đơn vào mẻ.')
                }
            }

            let statusWarning = ''
            {
                const payloadVariants = [
                    { status: 'completed', quantityActual: qty },
                    { Status: 'completed', QuantityActual: qty },
                    { status: 'COMPLETED', quantityActual: qty },
                    { Status: 'COMPLETED', QuantityActual: qty },
                    { request: { status: 'completed', quantityActual: qty } },
                    { request: { Status: 'completed', QuantityActual: qty } },
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
                        'Tạo mẻ thành công nhưng không thể chuyển COMPLETED.',
                    )

                    const isLastVariant = index === payloadVariants.length - 1
                    const shouldRetry = progressRes.status === 400 && shouldRetryOnValidation400(lastErrorMessage)
                    if (!shouldRetry || isLastVariant) {
                        break
                    }
                }

                if (!updateSuccess) {
                    statusWarning = lastErrorMessage || 'Không thể tự chuyển mẻ sang COMPLETED.'
                }
            }

            let deductionHint = ''
            if (!statusWarning) {
                const logsRes = await fetch(`${apiBase}/Inventory/logs`, {
                    method: 'GET',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                    },
                })
                const logsJson = await logsRes.json().catch(() => [])
                if (logsRes.ok) {
                    const hasDeductionLog = parseArrayData(logsJson).some((item) => {
                        const referenceType = String(item?.referenceType || '').toUpperCase()
                        const referenceId = String(item?.referenceId ?? '').trim()
                        const quantityChange = Number(item?.changeQuantity ?? item?.quantityChanged ?? item?.quantity ?? item?.amount ?? 0)

                        return referenceType.includes('PRODUCTION_BATCH')
                            && referenceId === String(createdBatchId)
                            && quantityChange < 0
                    })

                    if (!hasDeductionLog) {
                        deductionHint = ' Chưa thấy log trừ kho cho batch này trong /Inventory/logs. Vui lòng kiểm tra BOM của sản phẩm và logic trừ kho backend.'
                    }
                }
            }

            const inventoryHint = statusWarning
                ? ` Đã tạo mẻ và gán đơn thành công, nhưng chuyển COMPLETED thất bại: ${statusWarning}`
                : ' Đã tự chuyển trạng thái mẻ sang COMPLETED theo contract backend.'

            setSuccess(
                (data?.message || 'Tạo mẻ sản xuất thành công.')
                + ` (Mẻ #${createdBatchId}, Đơn: ${row.orderCode}, Sản phẩm: ${row.productName}, SL: ${qty}).`
                + inventoryHint
                + deductionHint,
            )

            await fetchApprovedOrders()
        } catch (requestError) {
            setError(requestError.message || 'Tạo mẻ sản xuất thất bại.')
        } finally {
            setCreatingRowKey('')
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
                    <h2 className="text-lg font-bold leading-tight">Tạo mẻ sản xuất từ đơn đã phê duyệt</h2>
                </div>
                <button
                    className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
                    onClick={refreshData}
                    disabled={productsLoading || ordersLoading || !!creatingRowKey}
                >
                    {productsLoading || ordersLoading ? 'Đang tải...' : 'Tải lại'}
                </button>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Trang này chỉ dùng để tạo mẻ từ đơn hàng đã phê duyệt. Mỗi dòng sản phẩm có nút tạo mẻ riêng.
                        Sau khi tạo, hệ thống tự chuyển COMPLETED theo contract backend hiện tại.
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ngày sản xuất áp dụng</span>
                            <input
                                type="datetime-local"
                                value={mfgDate}
                                onChange={(e) => setMfgDate(e.target.value)}
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                            />
                        </label>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 pt-1 sm:pt-6">
                            Mặc định: sau khi tạo mẻ hệ thống sẽ tự chuyển COMPLETED.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Danh sách dòng sản phẩm từ đơn Approved</p>
                        <p className="text-xs text-slate-500">{approvedDemandRows.length} dòng</p>
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
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(ordersLoading || productsLoading) ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-sm text-center text-slate-500">Đang tải dữ liệu đơn hàng...</td>
                                    </tr>
                                ) : null}
                                {!ordersLoading && !productsLoading && approvedDemandRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-sm text-center text-slate-500">Chưa có đơn Approved có chi tiết sản phẩm.</td>
                                    </tr>
                                ) : null}
                                {!ordersLoading && !productsLoading && approvedDemandRows.map((row) => {
                                    const isCreating = creatingRowKey === row.key
                                    const isRaw = String(row.productType).toUpperCase() === 'RAW'

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
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCreateFromRow(row)}
                                                    disabled={isCreating || !!creatingRowKey || isRaw}
                                                    className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                                                    title={isRaw ? 'RAW không tạo mẻ theo BOM' : ''}
                                                >
                                                    {isCreating ? 'Đang tạo mẻ...' : 'Tạo mẻ'}
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
        </div>
    )
}
