import { useEffect, useMemo, useState } from 'react'
import { MetricsStrip } from '../components/ui'

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
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const inventoryActionLabel = {
    IN: 'Nhập kho',
    OUT: 'Xuất kho',
    ADJUST: 'Điều chỉnh',
    TRANSFER_IN: 'Chuyển vào',
    TRANSFER_OUT: 'Chuyển ra',
    INITIAL_STOCK: 'Khởi tạo tồn kho',
}

function normalizeLocationType(locationType) {
    const raw = String(locationType || '').toUpperCase()
    if (raw === 'KITCHEN') return 'Bếp trung tâm'
    if (raw === 'STORE') return 'Cửa hàng'
    return locationType || 'N/A'
}

function normalizeLocationTypeKey(locationType) {
    const raw = String(locationType || '').toUpperCase()
    if (raw === 'KITCHEN') return 'KITCHEN'
    if (raw === 'STORE') return 'STORE'
    return 'UNKNOWN'
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
        locationTypeKey: normalizeLocationTypeKey(item?.locationType),
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

export default function InventoryLogsPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [logs, setLogs] = useState([])
    const [productNameMap, setProductNameMap] = useState({})
    const [locationFilter, setLocationFilter] = useState('KITCHEN')
    const [productFilter, setProductFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 50

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
            setProductNameMap(map)
        } catch {
            setProductNameMap({})
        }
    }

    const fetchLogs = async () => {
        setError('')

        const tk = token()
        if (!tk) {
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

            // Fetch products trước để có tên đầy đủ
            const productsRes = await fetch(`${apiBase}/Products`, { method: 'GET', headers })
            const productsJson = await productsRes.json().catch(() => [])
            const allProducts = parseArrayData(productsJson)
            const freshProductMap = {}
            allProducts.forEach((item) => {
                const id = Number(item?.productId || item?.id)
                if (!id) return
                const name = item?.productName || item?.name
                if (name) freshProductMap[id] = name
            })

            const logsRes = await fetch(`${apiBase}/Inventory/logs`, { method: 'GET', headers })
            const logsJson = await logsRes.json().catch(() => [])

            if (!logsRes.ok) {
                throw new Error(logsJson?.message || logsJson?.title || 'Không thể tải lịch sử biến động.')
            }

            const normalizedLogs = parseArrayData(logsJson)
                .map((item) => toInventoryLogRow(item, freshProductMap))
                .filter((item) => item.id > 0)
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

            setLogs(normalizedLogs)
            setProductNameMap(freshProductMap)
        } catch (e) {
            setLogs([])
            setError(e.message || 'Tải lịch sử thất bại.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const logsByLocation = useMemo(() => {
        if (!locationFilter) return logs
        return logs.filter((log) => log.locationTypeKey === locationFilter)
    }, [logs, locationFilter])

    const productOptions = useMemo(() => {
        const map = new Map()
        logsByLocation.forEach((log) => {
            if (log.productId > 0 && !map.has(log.productId)) {
                map.set(log.productId, log.productName)
            }
        })

        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    }, [logsByLocation])

    const filteredLogs = useMemo(() => {
        if (!productFilter) return logsByLocation
        const selectedId = Number(productFilter)
        return logsByLocation.filter((log) => log.productId === selectedId)
    }, [logsByLocation, productFilter])

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page)
        }
    }

    const stats = useMemo(() => ({
        total: filteredLogs.length,
        in: filteredLogs.filter((log) => log.quantityChange > 0).length,
        out: filteredLogs.filter((log) => log.quantityChange < 0).length,
    }), [filteredLogs])

    const statsItems = useMemo(() => ([
        {
            key: 'logs-total',
            label: 'Tổng giao dịch',
            value: Number(stats.total || 0).toLocaleString('vi-VN'),
            note: locationFilter === 'STORE' ? 'Nhật ký kho cửa hàng' : 'Nhật ký kho bếp trung tâm',
            icon: 'receipt_long',
            tone: 'blue',
        },
        {
            key: 'logs-in',
            label: 'Nhập kho',
            value: Number(stats.in || 0).toLocaleString('vi-VN'),
            note: locationFilter === 'STORE' ? 'Biến động tăng tồn tại kho cửa hàng' : 'Biến động tăng tồn tại kho bếp',
            icon: 'arrow_downward',
            tone: 'green',
        },
        {
            key: 'logs-out',
            label: 'Xuất kho',
            value: Number(stats.out || 0).toLocaleString('vi-VN'),
            note: locationFilter === 'STORE' ? 'Biến động giảm tồn tại kho cửa hàng' : 'Biến động giảm tồn tại kho bếp',
            icon: 'arrow_upward',
            tone: 'red',
        },
    ]), [stats, locationFilter])

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">history</span>
                    <h2 className="text-lg font-bold leading-tight">Lịch sử biến động tồn kho</h2>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    {loading ? 'Đang tải...' : 'Tải lại'}
                </button>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold">Nhật ký biến động</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi lịch sử nhập xuất và điều chỉnh tồn kho.</p>
                </div>

                <MetricsStrip items={statsItems} columns="sm:grid-cols-3" />

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Lọc theo khu vực kho</span>
                            <select
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                value={locationFilter}
                                onChange={(e) => {
                                    setLocationFilter(e.target.value)
                                    setProductFilter('')
                                    setCurrentPage(1)
                                }}
                            >
                                <option value="KITCHEN">Kho bếp trung tâm</option>
                                <option value="STORE">Kho cửa hàng</option>
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Lọc theo sản phẩm</span>
                            <select
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                value={productFilter}
                                onChange={(e) => {
                                    setProductFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                            >
                                <option value="">Tất cả sản phẩm</option>
                                {productOptions.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {loading ? (
                        <div className="px-4 py-3 text-sm text-slate-500">Đang tải...</div>
                    ) : paginatedLogs.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                            {productFilter ? 'Không tìm thấy lịch sử' : 'Chưa có lịch sử biến động'}
                        </div>
                    ) : (
                        <>
                            <table className="w-full table-fixed text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thời gian</th>
                                        <th className="w-[22%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                                        <th className="w-[15%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Hành động</th>
                                        <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                                        <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vị trí</th>
                                        <th className="w-[15%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tham chiếu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedLogs.map((log) => (
                                        <tr key={`${log.id}-${log.createdAt || 't'}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-xs">{toReadableDate(log.createdAt)}</td>
                                            <td className="px-4 py-3 text-sm font-medium">{log.productName}</td>
                                            <td className="px-4 py-3 text-sm">{log.action}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`font-semibold ${log.quantityChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{log.locationType} {log.locationId || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm">{log.referenceType} {log.referenceId ? `${log.referenceId}` : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                                    <div className="text-sm text-slate-500">
                                        Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} trong tổng số {filteredLogs.length} mục
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Trước
                                        </button>
                                        <span className="text-sm text-slate-700 dark:text-slate-300">
                                            Trang {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
