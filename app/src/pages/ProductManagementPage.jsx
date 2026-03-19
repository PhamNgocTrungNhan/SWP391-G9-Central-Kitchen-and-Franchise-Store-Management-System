import { useEffect, useMemo, useState } from 'react'

const productColumns = [
    { key: 'id', label: 'Mã sản phẩm' },
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Tên sản phẩm' },
    { key: 'categoryName', label: 'Danh mục' },
    { key: 'productType', label: 'Loại sản phẩm' },
    { key: 'baseUnit', label: 'Đơn vị gốc' },
]

const scopeConfig = {
    finished: {
        title: 'Quản Lý Thành Phẩm',
        listTitle: 'Danh sách thành phẩm',
        createLabel: 'Tạo thành phẩm',
        icon: 'inventory_2',
        allowedTypes: ['FINISHED'],
        defaultType: 'FINISHED',
    },
    ingredient: {
        title: 'Quản Lý Nguyên Liệu',
        listTitle: 'Danh sách nguyên liệu và bán thành phẩm',
        createLabel: 'Tạo nguyên liệu',
        icon: 'nutrition',
        allowedTypes: ['RAW', 'SEMI_FINISHED'],
        defaultType: 'RAW',
    },
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

export default function ProductManagementPage({ scope = 'finished' }) {
    const normalizedScope = scope === 'ingredient' ? 'ingredient' : 'finished'
    const scopeMeta = scopeConfig[normalizedScope]
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const getToken = () => {
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

    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [productsLoading, setProductsLoading] = useState(false)
    const [productsError, setProductsError] = useState('')
    const [keyword, setKeyword] = useState('')

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState('')
    const [createSuccess, setCreateSuccess] = useState('')
    const [formSku, setFormSku] = useState('')
    const [formProductName, setFormProductName] = useState('')
    const [formCategoryId, setFormCategoryId] = useState('')
    const [formBaseUnit, setFormBaseUnit] = useState('')
    const [formProductType, setFormProductType] = useState(scopeMeta.defaultType)

    const [showEditModal, setShowEditModal] = useState(false)
    const [editLoading, setEditLoading] = useState(false)
    const [editError, setEditError] = useState('')
    const [editSuccess, setEditSuccess] = useState('')
    const [editProductId, setEditProductId] = useState('')
    const [editSku, setEditSku] = useState('')
    const [editProductName, setEditProductName] = useState('')
    const [editCategoryId, setEditCategoryId] = useState('')
    const [editBaseUnit, setEditBaseUnit] = useState('')
    const [editProductType, setEditProductType] = useState(scopeMeta.defaultType)

    const [showViewModal, setShowViewModal] = useState(false)
    const [viewProduct, setViewProduct] = useState(null)

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [deleteSuccess, setDeleteSuccess] = useState('')
    const [deleteTargetId, setDeleteTargetId] = useState('')
    const [deleteTargetName, setDeleteTargetName] = useState('')

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
                    sku: item?.sku || 'N/A',
                    name: item?.productName || item?.name || `Sản phẩm #${id}`,
                    categoryId: Number(item?.categoryId ?? 0),
                    categoryName: item?.category?.name || 'N/A',
                    productType: normalizeProductType(item?.productType),
                    baseUnit: item?.baseUnit || 'N/A',
                }
            })
            .filter(Boolean)
    }

    const extractCategories = (data) => {
        const records = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
                ? data.items
                : Array.isArray(data?.data)
                    ? data.data
                    : []

        const seen = new Map()
        records.forEach((item) => {
            const id = Number(item?.categoryId ?? item?.category?.categoryId)
            const name = item?.category?.name || item?.categoryName
            if (id > 0 && name && !seen.has(id)) {
                seen.set(id, { categoryId: id, name })
            }
        })
        return Array.from(seen.values())
    }

    const fetchProducts = async () => {
        setProductsLoading(true)
        setProductsError('')
        try {
            const token = getToken()
            const headers = {
                accept: '*/*',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }

            const listEndpoint = normalizedScope === 'ingredient' ? `${apiBase}/Products/raw` : `${apiBase}/Products`

            const response = await fetch(listEndpoint, {
                method: 'GET',
                headers,
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Không có quyền tải danh sách sản phẩm. Vui lòng đăng nhập lại.')
                }
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách sản phẩm.')
            }

            const normalized = normalizeProducts(data)
            const scopedProducts = normalized.filter((item) => scopeMeta.allowedTypes.includes(item.productType))
            setProducts(scopedProducts)
            const normalizedCategories = extractCategories(scopedProducts)
            setCategories(normalizedCategories)
            if (!formCategoryId && normalizedCategories.length > 0) {
                setFormCategoryId(String(normalizedCategories[0].categoryId))
            }
        } catch (error) {
            setProducts([])
            setCategories([])
            setProductsError(error.message || 'Tải danh sách sản phẩm thất bại.')
        } finally {
            setProductsLoading(false)
        }
    }

    const resetCreateForm = () => {
        setFormSku('')
        setFormProductName('')
        setFormCategoryId(categories.length > 0 ? String(categories[0].categoryId) : '')
        setFormBaseUnit('')
        setFormProductType(scopeMeta.defaultType)
    }

    const openCreateModal = () => {
        setCreateError('')
        setCreateSuccess('')
        resetCreateForm()
        setShowCreateModal(true)
    }

    const handleCreateProduct = async () => {
        setCreateError('')
        setCreateSuccess('')

        const token = getToken()
        if (!token) {
            setCreateError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const payload = {
            sku: formSku.trim(),
            productName: formProductName.trim(),
            categoryId: Number(formCategoryId),
            baseUnit: formBaseUnit.trim(),
            productType: normalizedScope === 'finished' ? 'FINISHED' : normalizeProductType(formProductType.trim()),
        }

        if (!payload.sku || !payload.productName || !payload.baseUnit || !payload.productType || !payload.categoryId) {
            setCreateError('Vui lòng nhập đầy đủ SKU, Tên sản phẩm, Danh mục, Đơn vị gốc và Loại sản phẩm.')
            return
        }

        setCreateLoading(true)
        try {
            const response = await fetch(`${apiBase}/Products`, {
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
                const backendMessage = data?.message || data?.title || 'Tạo sản phẩm thất bại.'
                const hint = response.status === 400 ? ' Dữ liệu không hợp lệ hoặc bị trùng.' : ''
                throw new Error(`${backendMessage}${hint}`)
            }

            setCreateSuccess(data?.message || 'Đã tạo sản phẩm.')
            setShowCreateModal(false)
            fetchProducts()
        } catch (error) {
            setCreateError(error.message || 'Không thể tạo sản phẩm.')
        } finally {
            setCreateLoading(false)
        }
    }

    const openViewModal = (item) => {
        setViewProduct(item)
        setShowViewModal(true)
    }

    const openEditModal = (item) => {
        setEditError('')
        setEditSuccess('')
        setEditProductId(String(item.id))
        setEditSku(item.sku === 'N/A' ? '' : item.sku)
        setEditProductName(item.name || '')
        setEditCategoryId(item.categoryId > 0 ? String(item.categoryId) : (categories[0] ? String(categories[0].categoryId) : ''))
        setEditBaseUnit(item.baseUnit === 'N/A' ? '' : item.baseUnit)
        setEditProductType(
            normalizedScope === 'finished'
                ? 'FINISHED'
                : (item.productType && item.productType !== 'N/A' ? normalizeProductType(item.productType) : scopeMeta.defaultType),
        )
        setShowEditModal(true)
    }

    const handleUpdateProduct = async () => {
        setEditError('')
        setEditSuccess('')

        const token = getToken()
        if (!token) {
            setEditError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const productId = Number(editProductId)
        const payload = {
            sku: editSku.trim(),
            productName: editProductName.trim(),
            categoryId: Number(editCategoryId),
            baseUnit: editBaseUnit.trim(),
            productType: normalizedScope === 'finished' ? 'FINISHED' : normalizeProductType(editProductType.trim()),
        }

        if (!productId || !payload.sku || !payload.productName || !payload.baseUnit || !payload.productType || !payload.categoryId) {
            setEditError('Vui lòng nhập đầy đủ SKU, Tên sản phẩm, Danh mục, Đơn vị gốc và Loại sản phẩm.')
            return
        }

        setEditLoading(true)
        try {
            const response = await fetch(`${apiBase}/Products/${productId}`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                const backendMessage = data?.message || data?.title || 'Cập nhật sản phẩm thất bại.'
                const hint = response.status === 400 ? ' Dữ liệu không hợp lệ hoặc bị trùng.' : ''
                throw new Error(`${backendMessage}${hint}`)
            }

            setEditSuccess(data?.message || 'Đã cập nhật sản phẩm.')
            setShowEditModal(false)
            fetchProducts()
        } catch (error) {
            setEditError(error.message || 'Không thể cập nhật sản phẩm.')
        } finally {
            setEditLoading(false)
        }
    }

    const openDeleteModal = (item) => {
        setDeleteError('')
        setDeleteSuccess('')
        setDeleteTargetId(String(item.id))
        setDeleteTargetName(item.name || '')
        setShowDeleteModal(true)
    }

    const handleDeleteProduct = async () => {
        setDeleteError('')
        setDeleteSuccess('')

        const token = getToken()
        if (!token) {
            setDeleteError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const productId = Number(deleteTargetId)
        if (!productId || productId < 1) {
            setDeleteError('Mã sản phẩm không hợp lệ.')
            return
        }

        setDeleteLoading(true)
        try {
            const response = await fetch(`${apiBase}/Products/${productId}`, {
                method: 'DELETE',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                const backendMessage = data?.message || data?.title || 'Xóa sản phẩm thất bại.'
                const hint = response.status === 400
                    ? ' Sản phẩm đang được sử dụng ở dữ liệu khác.'
                    : ''
                throw new Error(`${backendMessage}${hint}`)
            }

            setDeleteSuccess(data?.message || 'Đã xóa sản phẩm.')
            setShowDeleteModal(false)
            fetchProducts()
        } catch (error) {
            setDeleteError(error.message || 'Không thể xóa sản phẩm.')
        } finally {
            setDeleteLoading(false)
        }
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    const filteredProducts = useMemo(() => {
        const key = keyword.trim().toLowerCase()
        if (!key) return products
        return products.filter((item) => `${item.id} ${item.sku} ${item.name} ${item.categoryName} ${item.productType} ${item.baseUnit}`.toLowerCase().includes(key))
    }, [products, keyword])

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">{scopeMeta.icon}</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">{scopeMeta.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchProducts}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Làm mới
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90"
                    >
                        + {scopeMeta.createLabel}
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{scopeMeta.listTitle}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý dữ liệu với các thao tác xem, sửa, xóa.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tìm kiếm</span>
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tìm theo mã, SKU, tên, danh mục, loại sản phẩm, đơn vị..."
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                        />
                    </label>
                </div>

                {productsLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách sản phẩm...</p>}
                {productsError && <p className="text-sm text-red-600 dark:text-red-400">{productsError}</p>}
                {createSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{createSuccess}</p>}
                {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
                {editSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{editSuccess}</p>}
                {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
                {deleteSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{deleteSuccess}</p>}
                {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}

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
                                            <td className="px-5 py-3 text-sm font-mono">{item.sku}</td>
                                            <td className="px-5 py-3 text-sm">{item.name}</td>
                                            <td className="px-5 py-3 text-sm">{item.categoryName}</td>
                                            <td className="px-5 py-3 text-sm">{item.productType}</td>
                                            <td className="px-5 py-3 text-sm">{item.baseUnit}</td>
                                            <td className="px-5 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openViewModal(item)}
                                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                        title="Xem chi tiết"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(item)}
                                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                        title="Xóa"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
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
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-base font-semibold">{normalizedScope === 'finished' ? 'Tạo thành phẩm mới' : 'Tạo nguyên liệu mới'}</p>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">SKU</span>
                                <input
                                    value={formSku}
                                    onChange={(e) => setFormSku(e.target.value)}
                                    placeholder="Ví dụ: RAW007"
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tên sản phẩm</span>
                                <input
                                    value={formProductName}
                                    onChange={(e) => setFormProductName(e.target.value)}
                                    placeholder="Ví dụ: Rice"
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Danh mục (Category)</span>
                                {categories.length > 0 ? (
                                    <select
                                        value={formCategoryId}
                                        onChange={(e) => setFormCategoryId(e.target.value)}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    >
                                        {categories.map((c) => (
                                            <option key={c.categoryId} value={String(c.categoryId)}>{c.name} (#{c.categoryId})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        min="1"
                                        value={formCategoryId}
                                        onChange={(e) => setFormCategoryId(e.target.value)}
                                        placeholder="Nhập Category ID"
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    />
                                )}
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đơn vị gốc</span>
                                <input
                                    value={formBaseUnit}
                                    onChange={(e) => setFormBaseUnit(e.target.value)}
                                    placeholder="Ví dụ: kg"
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                            {normalizedScope === 'ingredient' ? (
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loại sản phẩm</span>
                                    <select
                                        value={formProductType}
                                        onChange={(e) => setFormProductType(e.target.value)}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    >
                                        <option value="RAW">RAW</option>
                                        <option value="SEMI_FINISHED">SEMI_FINISHED</option>
                                    </select>
                                </label>
                            ) : (
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loại sản phẩm</span>
                                    <input
                                        value="FINISHED"
                                        readOnly
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
                                    />
                                </label>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateProduct}
                                disabled={createLoading}
                                className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                            >
                                {createLoading ? 'Đang tạo...' : 'Xác nhận tạo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-base font-semibold">Cập nhật #{editProductId}</p>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">SKU</span>
                                <input
                                    value={editSku}
                                    onChange={(e) => setEditSku(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tên sản phẩm</span>
                                <input
                                    value={editProductName}
                                    onChange={(e) => setEditProductName(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Danh mục (Category)</span>
                                {categories.length > 0 ? (
                                    <select
                                        value={editCategoryId}
                                        onChange={(e) => setEditCategoryId(e.target.value)}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    >
                                        {categories.map((c) => (
                                            <option key={c.categoryId} value={String(c.categoryId)}>{c.name} (#{c.categoryId})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        min="1"
                                        value={editCategoryId}
                                        onChange={(e) => setEditCategoryId(e.target.value)}
                                        placeholder="Nhập Category ID"
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    />
                                )}
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đơn vị gốc</span>
                                <input
                                    value={editBaseUnit}
                                    onChange={(e) => setEditBaseUnit(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                />
                            </label>
                            {normalizedScope === 'ingredient' ? (
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loại sản phẩm</span>
                                    <select
                                        value={editProductType}
                                        onChange={(e) => setEditProductType(e.target.value)}
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    >
                                        <option value="RAW">RAW</option>
                                        <option value="SEMI_FINISHED">SEMI_FINISHED</option>
                                    </select>
                                </label>
                            ) : (
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loại sản phẩm</span>
                                    <input
                                        value="FINISHED"
                                        readOnly
                                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
                                    />
                                </label>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdateProduct}
                                disabled={editLoading}
                                className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                            >
                                {editLoading ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showViewModal && viewProduct && (
                <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-base font-semibold">Chi tiết sản phẩm #{viewProduct.id}</p>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                            <p><span className="font-semibold">SKU:</span> {viewProduct.sku}</p>
                            <p><span className="font-semibold">Tên sản phẩm:</span> {viewProduct.name}</p>
                            <p><span className="font-semibold">Danh mục:</span> {viewProduct.categoryName}</p>
                            <p><span className="font-semibold">Loại sản phẩm:</span> {viewProduct.productType}</p>
                            <p><span className="font-semibold">Đơn vị gốc:</span> {viewProduct.baseUnit}</p>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-base font-semibold text-red-600 dark:text-red-400">Xác nhận xóa sản phẩm</p>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Bạn có chắc muốn xóa sản phẩm <span className="font-semibold">{deleteTargetName || `#${deleteTargetId}`}</span> (ID: #{deleteTargetId}) không?
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Nếu sản phẩm đang được dùng ở đơn hàng, tồn kho, batch hoặc BOM thì backend sẽ trả lỗi 400.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeleteProduct}
                                disabled={deleteLoading}
                                className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
