import { useEffect, useMemo, useState } from 'react'

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
    return {
        id: parseSafeNumber(item?.productionBatchId ?? item?.batchId ?? item?.id, 0),
        productId,
        productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
        quantityPlanned: parseSafeNumber(item?.quantityPlanned, 0),
        quantityProduced: parseSafeNumber(item?.quantityProduced, 0),
        status: item?.status || item?.batchStatus || 'N/A',
        mfgDate: item?.mfgDate || item?.manufacturingDate || item?.createdAt || null,
    }
}

export default function BatchTraceabilityPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const [inventoryMode, setInventoryMode] = useState('store')
    const [storeId, setStoreId] = useState(resolveDefaultStoreId)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [rows, setRows] = useState([])
    const [logs, setLogs] = useState([])
    const [batchLoading, setBatchLoading] = useState(false)
    const [batchError, setBatchError] = useState('')
    const [batchNotice, setBatchNotice] = useState('')
    const [batches, setBatches] = useState([])
    const [batchProductId, setBatchProductId] = useState('1')
    const [batchQuantityPlanned, setBatchQuantityPlanned] = useState('1')
    const [batchMfgDate, setBatchMfgDate] = useState(() => new Date().toISOString().slice(0, 16))
    const [productNameMap, setProductNameMap] = useState({})

    const token = () => localStorage.getItem('auth_token') || localStorage.getItem('token') || ''

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
                    setBatchError('Backend chua ho tro GET /ProductionBatches (405). Ban van tao batch bang POST duoc.')
                    setBatches([])
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

    const createProductionBatch = async () => {
        setBatchError('')
        setBatchNotice('')

        const tk = token()
        if (!tk) {
            setBatchError('Thieu token dang nhap. Vui long dang nhap lai.')
            return
        }

        const productId = Number(batchProductId)
        const quantityPlanned = Number(batchQuantityPlanned)
        if (!productId || productId < 1 || !Number.isFinite(quantityPlanned) || quantityPlanned < 1) {
            setBatchError('productId va quantityPlanned phai lon hon 0.')
            return
        }
        if (!batchMfgDate) {
            setBatchError('Vui long nhap mfgDate.')
            return
        }

        setBatchLoading(true)
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
                    mfgDate: new Date(batchMfgDate).toISOString(),
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Tao me san xuat that bai.')
            }

            setBatchNotice(data?.message || 'Tao me san xuat thanh cong.')

            const productIdValue = Number(productId)
            const createdAt = new Date(batchMfgDate).toISOString()
            const localRow = {
                id: Date.now(),
                productId: productIdValue,
                productName: productNameMap[productIdValue] || `Product #${productIdValue}`,
                quantityPlanned,
                quantityProduced: 0,
                status: 'CREATED',
                mfgDate: createdAt,
            }
            setBatches((prev) => [localRow, ...prev].slice(0, 20))
        } catch (e) {
            setBatchError(e.message || 'Khong the tao me san xuat.')
        } finally {
            setBatchLoading(false)
        }
    }

    useEffect(() => {
        fetchProductMap()
    }, [])

    useEffect(() => {
        fetchInventoryData()
    }, [inventoryMode, storeId, Object.keys(productNameMap).length])

    const stats = useMemo(() => ({
        total: rows.length,
        low: rows.filter((row) => row.status === 'low').length,
        critical: rows.filter((row) => row.status === 'critical').length,
        quantity: rows.reduce((sum, row) => sum + Number(row.currentQuantity || 0), 0),
    }), [rows])

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
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

                {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
                {info ? <p className="text-sm text-amber-700 dark:text-amber-400">{info}</p> : null}

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
                        <p className="text-sm font-semibold">Production Batches</p>
                        <button
                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={fetchProductionBatches}
                        >
                            Tai lai batch
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Product ID</span>
                            <input
                                type="number"
                                min="1"
                                value={batchProductId}
                                onChange={(e) => setBatchProductId(e.target.value)}
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Quantity Planned</span>
                            <input
                                type="number"
                                min="1"
                                value={batchQuantityPlanned}
                                onChange={(e) => setBatchQuantityPlanned(e.target.value)}
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">MFG Date</span>
                            <input
                                type="datetime-local"
                                value={batchMfgDate}
                                onChange={(e) => setBatchMfgDate(e.target.value)}
                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                            />
                        </label>
                        <button
                            className="h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60"
                            onClick={createProductionBatch}
                            disabled={batchLoading}
                        >
                            {batchLoading ? 'Dang xu ly...' : 'Tao batch'}
                        </button>
                    </div>

                    {batchError ? <p className="px-5 py-3 text-sm text-red-600 dark:text-red-400">{batchError}</p> : null}
                    {batchNotice ? <p className="px-5 py-3 text-sm text-emerald-600 dark:text-emerald-400">{batchNotice}</p> : null}

                    <table className="w-full min-w-[860px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                {['Batch ID', 'Product', 'So luong ke hoach', 'So luong da SX', 'Trang thai', 'MFG Date'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {batchLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Dang tai production batches...</td>
                                </tr>
                            ) : null}

                            {!batchLoading && batches.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Chua co production batch nao.</td>
                                </tr>
                            ) : null}

                            {!batchLoading && batches.map((batch) => (
                                <tr key={`${batch.id}-${batch.productId}-${batch.mfgDate || 'na'}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-3 text-sm font-semibold">#{batch.id || 'N/A'}</td>
                                    <td className="px-5 py-3 text-sm">{batch.productName}</td>
                                    <td className="px-5 py-3 text-sm">{batch.quantityPlanned}</td>
                                    <td className="px-5 py-3 text-sm">{batch.quantityProduced}</td>
                                    <td className="px-5 py-3 text-sm">{batch.status}</td>
                                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{toReadableDate(batch.mfgDate)}</td>
                                </tr>
                            ))}
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
            </div>
        </div>
    )
}
