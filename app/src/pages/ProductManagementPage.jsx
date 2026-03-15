import { useEffect, useMemo, useState } from 'react'

const productColumns = [
    { key: 'id', label: 'Mã sản phẩm' },
    { key: 'name', label: 'Tên sản phẩm' },
    { key: 'unit', label: 'Đơn vị' },
    { key: 'price', label: 'Giá' },
    { key: 'status', label: 'Trạng thái' },
]

const batchColumns = [
    { key: 'id', label: 'Mã mẻ' },
    { key: 'productId', label: 'Mã sản phẩm' },
    { key: 'quantityPlanned', label: 'SL kế hoạch' },
    { key: 'quantityActual', label: 'SL thực tế' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'mfgDate', label: 'Ngày sản xuất' },
]

const statusOptions = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const toDateTimeLocal = (date) => {
    const offset = date.getTimezoneOffset() * 60 * 1000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const toDisplayDate = (rawDate) => {
    if (!rawDate) return 'N/A'
    const date = new Date(rawDate)
    if (Number.isNaN(date.getTime())) return String(rawDate)
    return date.toLocaleString('vi-VN')
}

export default function ProductManagementPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [products, setProducts] = useState([])
    const [productsLoading, setProductsLoading] = useState(false)
    const [productsError, setProductsError] = useState('')

    const [batches, setBatches] = useState([])
    const [batchesLoading, setBatchesLoading] = useState(false)
    const [batchesError, setBatchesError] = useState('')

    const [keyword, setKeyword] = useState('')

    const [showBatchModal, setShowBatchModal] = useState(false)
    const [batchSubmitting, setBatchSubmitting] = useState(false)
    const [batchError, setBatchError] = useState('')
    const [batchSuccess, setBatchSuccess] = useState('')

    const [batchProductId, setBatchProductId] = useState('')
    const [batchQuantityPlanned, setBatchQuantityPlanned] = useState('1')
    const [batchMfgDate, setBatchMfgDate] = useState(() => toDateTimeLocal(new Date()))

    const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false)
    const [statusSubmitting, setStatusSubmitting] = useState(false)
    const [statusError, setStatusError] = useState('')
    const [statusSuccess, setStatusSuccess] = useState('')
    const [targetBatchId, setTargetBatchId] = useState('')
    const [targetStatus, setTargetStatus] = useState(statusOptions[0])
    const [targetQuantityActual, setTargetQuantityActual] = useState('1')

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        return {
            headers: {
                accept: '*/*',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            token,
        }
    }

    const normalizeProducts = (data) => {
        const records = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
                ? data.items
                : Array.isArray(data?.data)
                    ? data.data
                    : []

        return records
            .map((item) => {
                const id = Number(item?.productId ?? item?.id)
                if (!id || id < 1) return null

                return {
                    id,
                    name: item?.productName || item?.name || `Sản phẩm #${id}`,
                    unit: item?.unit || item?.unitName || 'N/A',
                    price: item?.price != null ? String(item.price) : item?.unitPrice != null ? String(item.unitPrice) : 'N/A',
                    status: item?.status || item?.productStatus || 'ACTIVE',
                }
            })
            .filter(Boolean)
    }

    const normalizeBatches = (data) => {
        const records = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
                ? data.items
                : Array.isArray(data?.data)
                    ? data.data
                    : []

        return records
            .map((item) => {
                const id = Number(item?.batchId ?? item?.id)
                if (!id || id < 1) return null

                return {
                    id,
                    productId: Number(item?.productId ?? 0),
                    quantityPlanned: Number(item?.quantityPlanned ?? 0),
                    quantityActual: Number(item?.quantityActual ?? 0),
                    status: item?.status || 'N/A',
                    mfgDate: item?.mfgDate || item?.manufacturedDate || null,
                }
            })
            .filter(Boolean)
    }

    const fetchProducts = async () => {
        setProductsLoading(true)
        setProductsError('')
        try {
            const { headers } = getAuthHeaders()
            const response = await fetch(`${apiBase}/products`, { method: 'GET', headers })
            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách sản phẩm.')
            }

            const mapped = normalizeProducts(data)
            setProducts(mapped)
            if (!batchProductId && mapped.length > 0) {
                setBatchProductId(String(mapped[0].id))
            }
        } catch (error) {
            setProducts([])
            setProductsError(error.message || 'Tải danh sách sản phẩm thất bại.')
        } finally {
            setProductsLoading(false)
        }
    }

    const fetchBatches = async () => {
        setBatchesLoading(true)
        setBatchesError('')
        try {
            const { headers } = getAuthHeaders()
            const response = await fetch(`${apiBase}/ProductionBatches`, { method: 'GET', headers })
            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách mẻ sản xuất.')
            }
            setBatches(normalizeBatches(data))
        } catch (error) {
            setBatches([])
            setBatchesError(error.message || 'Tải mẻ sản xuất thất bại.')
        } finally {
            setBatchesLoading(false)
        }
    }

    const handleOpenBatchModal = (productId) => {
        setBatchError('')
        setBatchSuccess('')
        if (productId) {
            setBatchProductId(String(productId))
        } else if (!batchProductId && products.length > 0) {
            setBatchProductId(String(products[0].id))
        }
        setShowBatchModal(true)
    }

    const handleCreateBatch = async () => {
        setBatchError('')
        setBatchSuccess('')

        const { token } = getAuthHeaders()
        if (!token) {
            setBatchError('Bạn chưa đăng nhập. Vui lòng đăng nhập để tạo mẻ sản xuất.')
            return
        }

        const productId = Number(batchProductId)
        const quantityPlanned = Number(batchQuantityPlanned)
        if (!productId || productId < 1) {
            setBatchError('Vui lòng chọn sản phẩm hợp lệ.')
            return
        }
        if (!Number.isFinite(quantityPlanned) || quantityPlanned <= 0) {
            setBatchError('Số lượng kế hoạch phải lớn hơn 0.')
            return
        }
        if (!batchMfgDate) {
            setBatchError('Vui lòng chọn ngày sản xuất.')
            return
        }

        const payload = {
            productId,
            quantityPlanned,
            mfgDate: new Date(batchMfgDate).toISOString(),
        }

        setBatchSubmitting(true)
        try {
            const response = await fetch(`${apiBase}/ProductionBatches`, {
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
                throw new Error(data?.message || data?.title || 'Tạo mẻ sản xuất thất bại.')
            }

            setBatchSuccess(data?.message || 'Tạo mẻ sản xuất thành công.')
            setShowBatchModal(false)
            fetchBatches()
        } catch (error) {
            setBatchError(error.message || 'Không thể kết nối API ProductionBatches.')
        } finally {
            setBatchSubmitting(false)
        }
    }

    const handleOpenUpdateStatusModal = (batch) => {
        setStatusError('')
        setStatusSuccess('')
        setTargetBatchId(String(batch.id))
        setTargetStatus(batch.status && statusOptions.includes(batch.status) ? batch.status : statusOptions[0])
        setTargetQuantityActual(String(batch.quantityActual > 0 ? batch.quantityActual : 1))
        setShowUpdateStatusModal(true)
    }

    const handleUpdateBatchStatus = async () => {
        setStatusError('')
        setStatusSuccess('')

        const batchId = Number(targetBatchId)
        const quantityActual = Number(targetQuantityActual)
        if (!batchId || batchId < 1) {
            setStatusError('Mã mẻ không hợp lệ.')
            return
        }
        if (!targetStatus || typeof targetStatus !== 'string') {
            setStatusError('Vui lòng chọn trạng thái hợp lệ.')
            return
        }
        if (!Number.isFinite(quantityActual) || quantityActual < 0) {
            setStatusError('Số lượng thực tế phải lớn hơn hoặc bằng 0.')
            return
        }

        const { token } = getAuthHeaders()
        if (!token) {
            setStatusError('Bạn chưa đăng nhập. Vui lòng đăng nhập để cập nhật trạng thái mẻ.')
            return
        }

        setStatusSubmitting(true)
        try {
            const response = await fetch(`${apiBase}/ProductionBatches/${batchId}/status`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: targetStatus,
                    quantityActual,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Cập nhật trạng thái mẻ thất bại.')
            }

            setStatusSuccess(data?.message || 'Cập nhật trạng thái mẻ thành công.')
            setShowUpdateStatusModal(false)
            fetchBatches()
        } catch (error) {
            setStatusError(`${error.message || 'Lỗi cập nhật trạng thái.'} Gợi ý: kiểm tra giá trị status có đúng enum backend hay không.`)
        } finally {
            setStatusSubmitting(false)
        }
    }

    useEffect(() => {
        fetchProducts()
        fetchBatches()
    }, [])

    const filteredProducts = useMemo(() => {
        const key = keyword.trim().toLowerCase()
        if (!key) return products
        return products.filter((item) => `${item.id} ${item.name} ${item.unit} ${item.status}`.toLowerCase().includes(key))
    }, [products, keyword])

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Quản Lý Sản Phẩm</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            fetchProducts()
                            fetchBatches()
                        }}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Làm mới
                    </button>
                    <button
                        onClick={() => handleOpenBatchModal('')}
                        className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90"
                    >
                        + Tạo mẻ sản xuất
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Danh sách sản phẩm</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi Product và thao tác tạo/cập nhật trạng thái mẻ sản xuất qua API.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <label className="md:col-span-2 flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tìm kiếm</span>
                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Tìm theo mã sản phẩm, tên, đơn vị, trạng thái..."
                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            />
                        </label>
                    </div>
                </div>

                {productsLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách sản phẩm...</p>}
                {productsError && <p className="text-sm text-red-600 dark:text-red-400">{productsError}</p>}
                {batchSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{batchSuccess}</p>}
                {batchError && <p className="text-sm text-red-600 dark:text-red-400">{batchError}</p>}
                {statusSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{statusSuccess}</p>}
                {statusError && <p className="text-sm text-red-600 dark:text-red-400">{statusError}</p>}

                {!productsLoading && !productsError && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    {productColumns.map((col) => (
                                        <th key={col.key} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>
                                    ))}
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-semibold">#{item.id}</td>
                                            <td className="px-5 py-3 text-sm">{item.name}</td>
                                            <td className="px-5 py-3 text-sm">{item.unit}</td>
                                            <td className="px-5 py-3 text-sm">{item.price}</td>
                                            <td className="px-5 py-3 text-sm">{item.status}</td>
                                            <td className="px-5 py-3">
                                                <button
                                                    onClick={() => handleOpenBatchModal(item.id)}
                                                    className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
                                                >
                                                    Tạo batch
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">Không có sản phẩm phù hợp.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-2">
                    <h2 className="text-xl font-bold">Mẻ sản xuất</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Dữ liệu fetch từ API ProductionBatches và cập nhật trạng thái từng mẻ.</p>
                </div>

                {batchesLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách mẻ sản xuất...</p>}
                {batchesError && <p className="text-sm text-red-600 dark:text-red-400">{batchesError}</p>}

                {!batchesLoading && !batchesError && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                        <table className="w-full min-w-[920px] text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    {batchColumns.map((col) => (
                                        <th key={col.key} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>
                                    ))}
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {batches.length > 0 ? (
                                    batches.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-semibold">#{item.id}</td>
                                            <td className="px-5 py-3 text-sm">#{item.productId}</td>
                                            <td className="px-5 py-3 text-sm">{item.quantityPlanned}</td>
                                            <td className="px-5 py-3 text-sm">{item.quantityActual}</td>
                                            <td className="px-5 py-3 text-sm">{item.status}</td>
                                            <td className="px-5 py-3 text-sm">{toDisplayDate(item.mfgDate)}</td>
                                            <td className="px-5 py-3">
                                                <button
                                                    onClick={() => handleOpenUpdateStatusModal(item)}
                                                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    Cập nhật trạng thái
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">Chưa có mẻ sản xuất nào.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showBatchModal && (
                <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-base font-semibold">Tạo mẻ sản xuất</p>
                            <button
                                onClick={() => setShowBatchModal(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sản phẩm</span>
                                <select
                                    value={batchProductId}
                                    onChange={(e) => setBatchProductId(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                >
                                    {products.map((item) => (
                                        <option key={item.id} value={String(item.id)}>{item.name} (#{item.id})</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Số lượng kế hoạch</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={batchQuantityPlanned}
                                    onChange={(e) => setBatchQuantityPlanned(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ngày sản xuất</span>
                                <input
                                    type="datetime-local"
                                    value={batchMfgDate}
                                    onChange={(e) => setBatchMfgDate(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowBatchModal(false)}
                                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateBatch}
                                disabled={batchSubmitting}
                                className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                            >
                                {batchSubmitting ? 'Đang tạo...' : 'Xác nhận tạo batch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUpdateStatusModal && (
                <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-base font-semibold">Cập nhật trạng thái mẻ #{targetBatchId}</p>
                            <button
                                onClick={() => setShowUpdateStatusModal(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trạng thái</span>
                                <select
                                    value={targetStatus}
                                    onChange={(e) => setTargetStatus(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                >
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Số lượng thực tế</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={targetQuantityActual}
                                    onChange={(e) => setTargetQuantityActual(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowUpdateStatusModal(false)}
                                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdateBatchStatus}
                                disabled={statusSubmitting}
                                className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                            >
                                {statusSubmitting ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
