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

function normalizeText(value) {
    return String(value || '').trim().toUpperCase()
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

function parseErrorMessage(payload, fallback) {
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

function toStatusLabel(status) {
    const normalized = normalizeText(status)
    if (normalized === 'IN_PROGRESS') return 'IN_PROGRESS'
    if (normalized === 'PROCESSING') return 'PROCESSING'
    if (normalized === 'PLANNED') return 'PLANNED'
    if (normalized === 'COMPLETED') return 'COMPLETED'
    return status || 'N/A'
}

export default function OngoingProductionBatchesPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [keyword, setKeyword] = useState('')

    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
    const [selectedBatch, setSelectedBatch] = useState(null)
    const [completing, setCompleting] = useState(false)
    const [completeError, setCompleteError] = useState('')
    const [completeSuccess, setCompleteSuccess] = useState('')
    const [quantityActual, setQuantityActual] = useState('')
    const [rawProductOptions, setRawProductOptions] = useState([])
    const [extraRows, setExtraRows] = useState([{ productId: '', quantity: '' }])

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

                    return {
                        id: String(id),
                        numericId: id,
                        productId: parseSafeNumber(item?.productId ?? item?.product?.productId ?? item?.product?.id, 0),
                        productName: item?.product?.productName || item?.product?.name || `Product #${item?.productId || 'N/A'}`,
                        storeName: item?.store?.storeName || item?.store?.name || (item?.kitchenId ? `Kitchen #${item.kitchenId}` : 'N/A'),
                        quantityPlanned: parseSafeNumber(item?.quantityPlanned, 0),
                        quantityActual: parseSafeNumber(item?.quantityActual, 0),
                        status: toStatusLabel(item?.status),
                        mfgDate: item?.mfgDate || item?.createdAt || null,
                    }
                })
                .filter(Boolean)
                .filter((item) => {
                    const status = normalizeText(item.status)
                    // Chỉ hiển thị batch đang IN_PROGRESS (đã bắt đầu sản xuất)
                    return status === 'IN_PROGRESS'
                })
                .sort((a, b) => new Date(b.mfgDate || 0).getTime() - new Date(a.mfgDate || 0).getTime())

            setRows(normalized)
            if (!normalized.length) {
                setInfo('Chưa có mẻ nào ở trạng thái IN_PROGRESS (đang sản xuất).')
            }
        } catch (requestError) {
            setRows([])
            setError(requestError.message || 'Tải danh sách batch đang thực hiện thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const fetchRawProductOptions = async () => {
        const tk = getToken()
        if (!tk) return

        try {
            const response = await fetch(`${apiBase}/Products/raw`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) return

            const normalized = parseArrayData(data)
                .map((item) => {
                    const id = parseSafeNumber(item?.productId ?? item?.id, 0)
                    if (!id) return null
                    return {
                        id,
                        name: item?.productName || item?.name || `Nguyên liệu #${id}`,
                    }
                })
                .filter(Boolean)

            setRawProductOptions(normalized)
        } catch {
            setRawProductOptions([])
        }
    }

    const openCompleteModal = async (row) => {
        setCompleteError('')
        setCompleteSuccess('')
        setSelectedBatch(row)
        setQuantityActual(String(parseSafeNumber(row.quantityPlanned, 0) || 1))
        setExtraRows([{ productId: '', quantity: '' }])
        setIsCompleteModalOpen(true)
        await fetchRawProductOptions()
    }

    const closeCompleteModal = () => {
        if (completing) return
        setIsCompleteModalOpen(false)
        setCompleteError('')
    }

    const updateExtraRow = (index, key, value) => {
        setExtraRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
    }

    const addExtraRow = () => {
        setExtraRows((prev) => [...prev, { productId: '', quantity: '' }])
    }

    const removeExtraRow = (index) => {
        setExtraRows((prev) => prev.filter((_, i) => i !== index))
    }

    const submitCompleteBatch = async (event) => {
        event.preventDefault()
        setCompleteError('')
        setCompleteSuccess('')

        const tk = getToken()
        if (!tk) {
            setCompleteError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        if (!selectedBatch?.numericId) {
            setCompleteError('Không xác định được mẻ cần hoàn thành.')
            return
        }

        const actual = parseSafeNumber(quantityActual, 0)
        if (actual <= 0) {
            setCompleteError('Số lượng thực tế phải lớn hơn 0.')
            return
        }

        console.log('[DEBUG] Selected batch status:', selectedBatch.status)
        console.log('[DEBUG] Completing batch:', selectedBatch.numericId, 'with quantity:', actual)

        const additionalMaterials = extraRows
            .map((row) => ({
                productId: parseSafeNumber(row.productId, 0),
                quantityUsed: parseSafeNumber(row.quantity, 0),
            }))
            .filter((row) => row.productId > 0 && row.quantityUsed > 0)

        const payloadVariants = [
            { status: 'COMPLETED', quantityActual: actual, additionalMaterials },
            { Status: 'COMPLETED', QuantityActual: actual, AdditionalMaterials: additionalMaterials },
        ]

        setCompleting(true)
        try {
            let updated = false
            let lastError = 'Không thể hoàn thành sản xuất cho mẻ này.'

            console.log('[DEBUG] Sending payloads to complete batch...')

            for (let index = 0; index < payloadVariants.length; index += 1) {
                console.log('[DEBUG] Trying payload variant', index, ':', JSON.stringify(payloadVariants[index]))

                const response = await fetch(`${apiBase}/ProductionBatches/${encodeURIComponent(selectedBatch.numericId)}/status`, {
                    method: 'PUT',
                    headers: {
                        accept: '*/*',
                        Authorization: `Bearer ${tk}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payloadVariants[index]),
                })

                const payload = await response.json().catch(() => null)
                if (response.ok) {
                    console.log('[DEBUG] Batch completed successfully with variant', index)
                    updated = true
                    break
                }

                console.log('[DEBUG] Variant', index, 'failed:', response.status, payload)
                lastError = parseErrorMessage(payload, lastError)
                const isLast = index === payloadVariants.length - 1
                if (!isLast && response.status === 400) continue
            }

            if (!updated) {
                throw new Error(lastError)
            }

            setCompleteSuccess(`Mẻ #${selectedBatch.numericId} đã hoàn thành sản xuất.`)
            setIsCompleteModalOpen(false)
            await fetchRows()
        } catch (requestError) {
            setCompleteError(requestError.message || 'Hoàn thành sản xuất thất bại.')
        } finally {
            setCompleting(false)
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
                <h2 className="text-lg font-bold">Mẻ đang sản xuất (Kitchen)</h2>
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
                        <p className="text-sm text-slate-500">Đang sản xuất (IN_PROGRESS)</p>
                        <p className="text-2xl font-bold text-emerald-600">{inProgressCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Tổng số lượng kế hoạch</p>
                        <p className="text-2xl font-bold">{rows.reduce((sum, r) => sum + r.quantityPlanned, 0)}</p>
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

                {completeSuccess ? (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">
                        {completeSuccess}
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
                                    {['Batch', 'Sản phẩm', 'Cửa hàng', 'SL kế hoạch', 'SL thực tế', 'Trạng thái', 'Ngày SX', 'Thao tác'].map((h) => (
                                        <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={8} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                                {!loading && filteredRows.length === 0 ? <tr><td colSpan={8} className="px-5 py-8 text-center text-sm">Không có mẻ đang sản xuất (IN_PROGRESS).</td></tr> : null}
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
                                        <td className="px-5 py-4 text-sm">
                                            <button
                                                type="button"
                                                onClick={() => openCompleteModal(row)}
                                                className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
                                            >
                                                Hoàn thành sản xuất
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {isCompleteModalOpen && selectedBatch ? (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" onClick={closeCompleteModal}>
                    <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold">Hoàn thành mẻ #{selectedBatch.id}</h3>
                            <button
                                type="button"
                                onClick={closeCompleteModal}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>

                        <form className="mt-4 space-y-4" onSubmit={submitCompleteBatch}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Số lượng thực tế tạo ra</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={quantityActual}
                                        onChange={(e) => setQuantityActual(e.target.value)}
                                        className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                                        required
                                    />
                                </label>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                    <p className="font-semibold">Sản phẩm mẻ</p>
                                    <p className="mt-1">{selectedBatch.productName}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold">Có dùng thêm nguyên liệu ngoài công thức?</p>
                                    <button
                                        type="button"
                                        onClick={addExtraRow}
                                        className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        + Thêm dòng
                                    </button>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {extraRows.map((row, index) => (
                                        <div key={`extra-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px] gap-2">
                                            <select
                                                value={row.productId}
                                                onChange={(e) => updateExtraRow(index, 'productId', e.target.value)}
                                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                                            >
                                                <option value="">Chọn nguyên liệu</option>
                                                {rawProductOptions.map((option) => (
                                                    <option key={option.id} value={option.id}>{option.name}</option>
                                                ))}
                                            </select>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={row.quantity}
                                                onChange={(e) => updateExtraRow(index, 'quantity', e.target.value)}
                                                placeholder="Số lượng"
                                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => removeExtraRow(index)}
                                                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {completeError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                                    {completeError}
                                </div>
                            ) : null}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeCompleteModal}
                                    className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={completing}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {completing ? 'Đang cập nhật...' : 'Xác nhận hoàn thành'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
