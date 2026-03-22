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

function toReadableDate(dateString) {
    if (!dateString) return 'N/A'
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return String(dateString)
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function normalizeText(value) {
    return String(value || '').trim().toUpperCase()
}

export default function OngoingProductionBatchesPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [keyword, setKeyword] = useState('')

    const fetchRows = async () => {
        setError('')
        setInfo('')

        const tk = getToken()
        if (!tk) {
            setRows([])
            setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setLoading(true)
        try {
            const [productsRes, logsRes] = await Promise.all([
                fetch(`${apiBase}/Products`, {
                    method: 'GET',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                    },
                }),
                fetch(`${apiBase}/Inventory/logs`, {
                    method: 'GET',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                    },
                }),
            ])

            const productsJson = await productsRes.json().catch(() => [])
            const logsJson = await logsRes.json().catch(() => [])

            if (!logsRes.ok) {
                const backendMessage = logsJson?.message || logsJson?.title || ''
                throw new Error(backendMessage || 'Endpoint /Inventory/logs đang trả lỗi nội bộ (500), nên chưa thể suy luận danh sách batch đang thực hiện.')
            }

            const productNameMap = {}
            if (productsRes.ok) {
                parseArrayData(productsJson).forEach((item) => {
                    const id = parseSafeNumber(item?.productId ?? item?.id, 0)
                    if (!id) return
                    productNameMap[id] = item?.productName || item?.name || `Product #${id}`
                })
            }

            const grouped = new Map()

            parseArrayData(logsJson).forEach((item) => {
                const referenceType = normalizeText(item?.referenceType)
                if (!referenceType.includes('PRODUCTION_BATCH')) return

                const batchId = String(item?.referenceId ?? '').trim()
                if (!batchId) return

                const quantityChange = Number(item?.changeQuantity ?? item?.quantityChanged ?? item?.quantity ?? item?.amount ?? 0)
                const reason = normalizeText(item?.reason)
                const transactionType = normalizeText(item?.transactionType || item?.type || item?.action)
                const productId = parseSafeNumber(item?.productId, 0)
                const locationId = parseSafeNumber(item?.locationId, 0)
                const createdAt = item?.createdAt || item?.transactionDate || item?.timestamp || null

                const current = grouped.get(batchId) || {
                    id: batchId,
                    productNames: new Set(),
                    storeIds: new Set(),
                    rawDeductTotal: 0,
                    finishedInTotal: 0,
                    lastAt: null,
                }

                if (productId > 0) {
                    current.productNames.add(productNameMap[productId] || `Product #${productId}`)
                }
                if (locationId > 0) {
                    current.storeIds.add(locationId)
                }

                if (quantityChange < 0 || reason.includes('SAN XUAT ME') || transactionType.includes('OUT')) {
                    current.rawDeductTotal += Math.abs(quantityChange)
                }

                if (quantityChange > 0 && (reason.includes('NHAP THANH PHAM') || transactionType.includes('IN'))) {
                    current.finishedInTotal += quantityChange
                }

                if (!current.lastAt || new Date(createdAt || 0).getTime() > new Date(current.lastAt || 0).getTime()) {
                    current.lastAt = createdAt
                }

                grouped.set(batchId, current)
            })

            const normalized = Array.from(grouped.values())
                .map((item) => {
                    const productName = Array.from(item.productNames).slice(0, 3).join(', ') || 'N/A'
                    const storeName = item.storeIds.size > 0 ? `Kitchen/Store #${Array.from(item.storeIds)[0]}` : 'N/A'
                    const stillOngoing = item.rawDeductTotal > 0 && item.finishedInTotal <= 0

                    return {
                        id: item.id,
                        productName,
                        storeName,
                        quantityPlanned: item.rawDeductTotal || 0,
                        quantityActual: item.finishedInTotal || 0,
                        status: stillOngoing ? 'IN_PROGRESS' : 'COMPLETED/UNKNOWN',
                        mfgDate: item.lastAt,
                    }
                })
                .filter((item) => item.status === 'IN_PROGRESS')
                .sort((a, b) => new Date(b.mfgDate || 0).getTime() - new Date(a.mfgDate || 0).getTime())

            setRows(normalized)
            setInfo('Danh sách này được suy luận từ /Inventory/logs (PRODUCTION_BATCH) do backend chưa có API GET list batch.')
        } catch (requestError) {
            setRows([])
            setError(requestError.message || 'Tải danh sách batch đang thực hiện thất bại.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRows()
    }, [])

    const filteredRows = useMemo(() => {
        const key = keyword.trim().toLowerCase()
        if (!key) return rows

        return rows.filter((row) => {
            const text = `${row.id} ${row.productName} ${row.storeName} ${row.status}`.toLowerCase()
            return text.includes(key)
        })
    }, [rows, keyword])

    const inProgressCount = rows.filter((row) => row.status === 'IN_PROGRESS').length

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-background-dark sticky top-0 z-10">
                <h2 className="text-lg font-bold">Batch đang thực hiện</h2>
                <button className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm" onClick={fetchRows} disabled={loading}>
                    {loading ? 'Đang tải...' : 'Tải lại'}
                </button>
            </header>

            <main className="p-6 lg:p-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Tổng batch đang chạy</p>
                        <p className="text-2xl font-bold">{rows.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">IN_PROGRESS</p>
                        <p className="text-2xl font-bold text-emerald-600">{inProgressCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">PROCESSING</p>
                        <p className="text-2xl font-bold text-amber-600">{rows.length - inProgressCount}</p>
                    </div>
                </div>

                {error ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                        {error}
                    </div>
                ) : null}

                {info ? (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                        {info}
                    </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-semibold text-lg">Danh sách batch</h3>
                        <input
                            className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm w-full sm:w-72"
                            placeholder="Tìm batch..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    {['Batch', 'Sản phẩm', 'Cửa hàng', 'SL kế hoạch', 'SL thực tế', 'Trạng thái', 'Ngày SX'].map((h) => (
                                        <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={7} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                                {!loading && filteredRows.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-center text-sm">Không có batch đang thực hiện.</td></tr> : null}
                                {!loading && filteredRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-5 py-4 text-sm font-semibold">#{row.id}</td>
                                        <td className="px-5 py-4 text-sm">{row.productName}</td>
                                        <td className="px-5 py-4 text-sm">{row.storeName}</td>
                                        <td className="px-5 py-4 text-sm">{row.quantityPlanned}</td>
                                        <td className="px-5 py-4 text-sm">{row.quantityActual}</td>
                                        <td className="px-5 py-4 text-sm">
                                            <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${row.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-sm">{toReadableDate(row.mfgDate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
