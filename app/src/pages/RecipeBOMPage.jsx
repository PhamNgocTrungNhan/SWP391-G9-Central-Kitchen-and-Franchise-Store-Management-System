import { useEffect, useState } from 'react'

const bom = [
    { icon: 'grocery', type: 'raw', name: 'Premium Beef Patty (180g)', qty: '1.00', unit: 'pc', cost: '$1.80' },
    { icon: 'link', type: 'link', name: 'Brioche Bun', qty: '1.00', unit: 'pc', cost: '$0.45' },
    { icon: 'link', type: 'link', name: 'House Burger Sauce', qty: '30.00', unit: 'ml', cost: '$0.25' },
    { icon: 'grocery', type: 'raw', name: 'Cheddar Cheese Slice', qty: '2.00', unit: 'pc', cost: '$0.40' },
    { icon: 'eco', type: 'raw', name: 'Iceberg Lettuce (Shredded)', qty: '20.00', unit: 'g', cost: '$0.10' },
]

const steps = [
    { n: 1, title: 'Prep Bun & Grill', desc: 'Toast the brioche bun lightly on the grill for 30 seconds. Grill beef patty for 3 mins each side (Medium).' },
    { n: 2, title: 'Add Cheese', desc: 'Place 2 slices of cheddar on the patty during the last 30 seconds of grilling to melt.' },
    { n: 3, title: 'Assembly', desc: 'Apply House Sauce to top and bottom buns. Bottom bun > Lettuce > Patty with Cheese > Top Bun.' },
]

export default function RecipeBOMPage() {
    const [active, setActive] = useState(0)
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const [parentId, setParentId] = useState('1')
    const [recipeRows, setRecipeRows] = useState([])
    const [recipesLoading, setRecipesLoading] = useState(false)
    const [recipesError, setRecipesError] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [showEditForm, setShowEditForm] = useState(false)
    const [showViewForm, setShowViewForm] = useState(false)
    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState('')
    const [createSuccess, setCreateSuccess] = useState('')
    const [editLoading, setEditLoading] = useState(false)
    const [editError, setEditError] = useState('')
    const [editSuccess, setEditSuccess] = useState('')
    const [deleteLoadingId, setDeleteLoadingId] = useState(null)
    const [viewingRecipe, setViewingRecipe] = useState(null)
    const [editingRecipeId, setEditingRecipeId] = useState('')
    const [editParentId, setEditParentId] = useState('1')
    const [editMaterialId, setEditMaterialId] = useState('1')
    const [editQuantityRequired, setEditQuantityRequired] = useState('1')
    const [editWasteAllowancePercent, setEditWasteAllowancePercent] = useState('0')
    const [productOptions, setProductOptions] = useState([])
    const [materialId, setMaterialId] = useState('2')
    const [quantityRequired, setQuantityRequired] = useState('1.5')
    const [wasteAllowancePercent, setWasteAllowancePercent] = useState('5')

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

    const normalizeRecipeItem = (item) => {
        const id = Number(item?.recipeId || item?.id)
        const parentProductId = Number(item?.parentProductId || item?.parentId || item?.parentProduct?.productId || item?.parentProduct?.id || 0)
        const materialProductId = Number(item?.materialId || item?.material?.productId || item?.material?.id || 0)
        return {
            id: id || Date.now(),
            name: item?.recipeName || item?.product?.productName || item?.product?.name || 'Công thức chưa có tên',
            type: item?.recipeType || item?.type || 'Recipe',
            yield: item?.yieldAmount ? String(item.yieldAmount) : 'N/A',
            cost: item?.estimatedCost ? `$${Number(item.estimatedCost).toFixed(2)}` : '$0.00',
            icon: 'menu_book',
            active: true,
            parentProductId,
            materialId: materialProductId,
            quantityRequired: Number(item?.quantityRequired || 0),
            wasteAllowancePercent: Number(item?.wasteAllowancePercent || 0),
            parentProductName: item?.parentProduct?.productName || item?.parentProduct?.name || `Sản phẩm chưa có tên`,
            materialName: item?.material?.productName || item?.material?.name || 'Nguyên liệu chưa có tên',
        }
    }

    const getProductNameById = (id) => {
        const numberId = Number(id)
        if (!numberId) return 'N/A'

        const fromOptions = productOptions.find((p) => Number(p.id) === numberId)?.name
        if (fromOptions) return fromOptions

        const fromParentRows = recipeRows.find((row) => Number(row?.parentProductId) === numberId)?.parentProductName
        if (fromParentRows) return fromParentRows

        const fromMaterialRows = recipeRows.find((row) => Number(row?.materialId) === numberId)?.materialName
        if (fromMaterialRows) return fromMaterialRows

        return 'Sản phẩm chưa có tên'
    }

    const fetchParentRecipes = async () => {
        const tk = token()
        if (!tk) {
            setRecipesError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            setRecipeRows([])
            return
        }

        const parsedParentId = Number(parentId)
        if (!parsedParentId || parsedParentId < 1) {
            setRecipesError('Parent ID không hợp lệ.')
            setRecipeRows([])
            return
        }

        setRecipesLoading(true)
        setRecipesError('')
        try {
            const response = await fetch(`${apiBase}/Recipes/parent/${parsedParentId}`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải công thức theo parent.')
            }

            const records = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
            setRecipeRows(records.map(normalizeRecipeItem))
            setActive(0)
        } catch (error) {
            setRecipeRows([])
            setRecipesError(error.message || 'Tải công thức thất bại.')
        } finally {
            setRecipesLoading(false)
        }
    }

    const fetchProducts = async () => {
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

            const records = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
            const normalized = records
                .map((item) => {
                    const id = Number(item?.productId || item?.id)
                    if (!id) return null
                    return {
                        id,
                        name: item?.productName || item?.name || 'Sản phẩm chưa có tên',
                    }
                })
                .filter(Boolean)

            setProductOptions(normalized)

            if (normalized.length > 0) {
                const firstId = String(normalized[0].id)
                const secondId = String((normalized[1] || normalized[0]).id)
                if (!parentId) setParentId(firstId)
                if (!materialId || Number(materialId) < 1) setMaterialId(secondId)
            }
        } catch {
            setProductOptions([])
        }
    }

    const createRecipeLine = async () => {
        const tk = token()
        if (!tk) {
            setCreateError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const parsedParentId = Number(parentId)
        const parsedMaterialId = Number(materialId)
        const parsedQty = Number(quantityRequired)
        const parsedWaste = Number(wasteAllowancePercent)

        if (!parsedParentId || parsedParentId < 1 || !parsedMaterialId || parsedMaterialId < 1) {
            setCreateError('parentProductId va materialId phai lon hon 0.')
            return
        }
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
            setCreateError('quantityRequired phai lon hon 0.')
            return
        }
        if (!Number.isFinite(parsedWaste) || parsedWaste < 0) {
            setCreateError('wasteAllowancePercent phai >= 0.')
            return
        }

        setCreateLoading(true)
        setCreateError('')
        setCreateSuccess('')

        try {
            const response = await fetch(`${apiBase}/Recipes`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parentProductId: parsedParentId,
                    materialId: parsedMaterialId,
                    quantityRequired: parsedQty,
                    wasteAllowancePercent: parsedWaste,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể thêm công thức.')
            }

            setCreateSuccess(data?.message || 'Thêm công thức thành công.')
            setShowCreateForm(false)
            fetchParentRecipes()
        } catch (error) {
            setCreateError(error.message || 'Thêm công thức thất bại.')
        } finally {
            setCreateLoading(false)
        }
    }

    const openEditForm = (row) => {
        const id = Number(row?.id)
        if (!id) return
        setEditingRecipeId(String(id))
        setEditParentId(String(row?.parentProductId || parentId || '1'))
        setEditMaterialId(String(row?.materialId || materialId || '1'))
        setEditQuantityRequired(String(row?.quantityRequired || 1))
        setEditWasteAllowancePercent(String(row?.wasteAllowancePercent || 0))
        setEditError('')
        setEditSuccess('')
        setShowEditForm(true)
    }

    const openViewForm = (row) => {
        setViewingRecipe(row)
        setShowViewForm(true)
    }

    const updateRecipeLine = async () => {
        const tk = token()
        if (!tk) {
            setEditError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const recipeId = Number(editingRecipeId)
        const parsedParentId = Number(editParentId)
        const parsedMaterialId = Number(editMaterialId)
        const parsedQty = Number(editQuantityRequired)
        const parsedWaste = Number(editWasteAllowancePercent)

        if (!recipeId || recipeId < 1) {
            setEditError('Recipe ID không hợp lệ để cập nhật.')
            return
        }
        if (!parsedParentId || parsedParentId < 1 || !parsedMaterialId || parsedMaterialId < 1) {
            setEditError('parentProductId va materialId phai lon hon 0.')
            return
        }
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
            setEditError('quantityRequired phai lon hon 0.')
            return
        }
        if (!Number.isFinite(parsedWaste) || parsedWaste < 0) {
            setEditError('wasteAllowancePercent phai >= 0.')
            return
        }

        setEditLoading(true)
        setEditError('')
        setEditSuccess('')

        try {
            const response = await fetch(`${apiBase}/Recipes/${recipeId}`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parentProductId: parsedParentId,
                    materialId: parsedMaterialId,
                    quantityRequired: parsedQty,
                    wasteAllowancePercent: parsedWaste,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể cập nhật công thức.')
            }

            setEditSuccess(data?.message || 'Cập nhật thành công.')
            setShowEditForm(false)
            setCreateSuccess(data?.message || 'Cập nhật thành công.')
            fetchParentRecipes()
        } catch (error) {
            setEditError(error.message || 'Cập nhật thất bại.')
        } finally {
            setEditLoading(false)
        }
    }

    const deleteRecipeLine = async (row) => {
        const tk = token()
        if (!tk) {
            setCreateError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const recipeId = Number(row?.id)
        if (!recipeId) {
            setCreateError('Recipe ID không hợp lệ để xóa.')
            return
        }

        if (!window.confirm(`Xác nhận xóa công thức ${recipeId}?`)) {
            return
        }

        setDeleteLoadingId(recipeId)
        setCreateError('')
        setCreateSuccess('')

        try {
            const response = await fetch(`${apiBase}/Recipes/${recipeId}`, {
                method: 'DELETE',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể xóa công thức.')
            }

            setCreateSuccess(data?.message || `Đã xóa công thức ${recipeId}.`)
            fetchParentRecipes()
        } catch (error) {
            setCreateError(error.message || 'Xóa công thức thất bại.')
        } finally {
            setDeleteLoadingId(null)
        }
    }

    useEffect(() => {
        fetchProducts()
        fetchParentRecipes()
    }, [])

    const recipes = recipeRows
    const selectedRecipe = recipes[active] || null

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>restaurant_menu</span>
                    <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">KitchenOps</h2>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                    <nav className="hidden md:flex items-center gap-8">
                        {['Dashboard', 'Recipes & BOM', 'Inventory', 'Suppliers'].map((item, i) => (
                            <a key={item} href="#" className={`text-sm transition-colors ${i === 1 ? 'text-primary font-semibold border-b-2 border-primary py-1' : 'text-slate-600 dark:text-slate-400 hover:text-primary font-medium'}`}>{item}</a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-4">
                        <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-6 flex flex-col">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold leading-tight">Recipe &amp; BOM Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage product configurations, ingredients, and costs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <select
                                value={parentId}
                                onChange={(e) => setParentId(e.target.value)}
                                className="h-10 w-56 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                            >
                                {productOptions.length === 0 ? <option value="1">Sản phẩm chưa có tên</option> : null}
                                {productOptions.map((p) => (
                                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                                ))}
                            </select>
                            <button
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm disabled:opacity-60"
                                onClick={fetchParentRecipes}
                                disabled={recipesLoading}
                            >
                                {recipesLoading ? 'Đang tải...' : 'Tải parent'}
                            </button>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm">
                            <span className="material-symbols-outlined text-sm">history</span>Version History
                        </button>
                        <button onClick={() => { setCreateError(''); setCreateSuccess(''); setShowCreateForm(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm">
                            <span className="material-symbols-outlined text-sm">add</span>Thêm công thức
                        </button>
                    </div>
                </div>

                {recipesError ? <p className="text-sm text-red-600 dark:text-red-400">{recipesError}</p> : null}
                {!recipesLoading && !recipesError && recipes.length === 0 ? <p className="text-sm text-amber-600 dark:text-amber-400">API /Recipes/parent/{parentId} đang trả rỗng ([]). Chưa có công thức con cho parent này.</p> : null}
                {createSuccess ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{createSuccess}</p> : null}

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                    <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Danh sách công thức theo parent</p>
                        <button
                            onClick={fetchParentRecipes}
                            disabled={recipesLoading}
                            className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                        >
                            {recipesLoading ? 'Đang tải...' : 'Tải lại'}
                        </button>
                    </div>
                    <table className="w-full min-w-[920px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                {['Recipe ID', 'Parent Product', 'Material', 'Quantity Required', 'Waste %', 'Thao tác'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {!recipesLoading && recipes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Chưa có công thức nào cho parent hiện tại.</td>
                                </tr>
                            ) : null}

                            {recipes.map((row) => (
                                <tr key={`recipe-row-${row.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-3 text-sm font-semibold">{row.id}</td>
                                    <td className="px-5 py-3 text-sm">{getProductNameById(row.parentProductId)}</td>
                                    <td className="px-5 py-3 text-sm">{getProductNameById(row.materialId)}</td>
                                    <td className="px-5 py-3 text-sm">{Number(row.quantityRequired || 0)}</td>
                                    <td className="px-5 py-3 text-sm">{Number(row.wasteAllowancePercent || 0)}</td>
                                    <td className="px-5 py-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openViewForm(row)}
                                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                title="View"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                            </button>
                                            <button
                                                onClick={() => openEditForm(row)}
                                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                title="Edit"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => deleteRecipeLine(row)}
                                                disabled={deleteLoadingId === Number(row.id)}
                                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Split Panel */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch" style={{ minHeight: 600 }}>
                    {/* Left: Recipe List */}
                    <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors" placeholder="Search recipes or products..." type="search" />
                            </div>
                            <div className="flex gap-2 mt-3">
                                {['All', 'Finished', 'Semi-Finished'].map((f, i) => (
                                    <span key={f} className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${i === 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-colors`}>{f}</span>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                            {recipes.map((r, i) => (
                                <div
                                    key={`${r.id}-${r.name}`}
                                    onClick={() => setActive(i)}
                                    className={`flex items-center p-4 cursor-pointer border-l-4 transition-colors ${i === active ? 'bg-primary/5 dark:bg-primary/10 border-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'}`}
                                >
                                    <div className="flex-shrink-0 mr-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === active ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                            <span className="material-symbols-outlined">{r.icon}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${i === active ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium'}`}>{r.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.type} • Yield: {r.yield}</p>
                                    </div>
                                    <div className="flex flex-col items-end ml-2">
                                        <span className="text-sm font-medium">{r.cost}</span>
                                        <span className={`text-xs mt-0.5 ${i === active ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>Cost</span>
                                    </div>
                                </div>
                            ))}
                            {!recipesLoading && recipes.length === 0 ? (
                                <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Không có công thức nào cho parent ID này.</div>
                            ) : null}
                        </div>
                    </div>

                    {/* Right: Detail */}
                    <div className="w-full lg:w-2/3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                        {!selectedRecipe ? (
                            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Chọn parent ID khác hoặc tạo công thức mới để xem chi tiết BOM.</div>
                        ) : (
                            <>
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary shadow-inner">
                                            <span className="material-symbols-outlined text-3xl">{selectedRecipe.icon}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-2xl font-bold">{selectedRecipe.name}</h2>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">v1.4</span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedRecipe.type} • Category: Mains</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><span className="material-symbols-outlined">edit</span></button>
                                        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                    {/* Cost Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Est. Cost', value: '$3.45', sub: 'per portion', highlight: false },
                                            { label: 'Selling Price', value: '$12.99', sub: 'target', highlight: false },
                                            { label: 'Gross Margin', value: '73.4%', sub: 'Healthy', highlight: true },
                                            { label: 'Wastage Factor', value: '5%', sub: 'Global setting', highlight: false },
                                        ].map(({ label, value, sub, highlight }) => (
                                            <div key={label} className={`p-4 rounded-xl border flex flex-col relative overflow-hidden ${highlight ? 'border-primary/20 bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30'}`}>
                                                {highlight && <div className="absolute right-0 top-0 opacity-10 text-primary p-2"><span className="material-symbols-outlined text-4xl">trending_up</span></div>}
                                                <span className={`text-xs font-medium uppercase tracking-wider ${highlight ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
                                                <span className={`text-2xl font-bold mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* BOM Table */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-slate-400">format_list_bulleted</span>Bill of Materials
                                            </h3>
                                            <button onClick={() => { setCreateError(''); setCreateSuccess(''); setShowCreateForm(true) }} className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[18px]">add</span>Thêm công thức
                                            </button>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                    <tr>
                                                        {['Ingredient / Semi-Finished', 'Quantity', 'Unit', 'Est. Cost'].map((h, i) => (
                                                            <th key={h} className={`px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                                    {bom.map(({ icon, type, name, qty, unit, cost }) => (
                                                        <tr key={name}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-2">
                                                                <span className={`material-symbols-outlined text-[18px] ${type === 'link' ? 'text-primary' : 'text-slate-400'}`}>{icon}</span>
                                                                {name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-right">{qty}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-right">{unit}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{cost}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-slate-50 dark:bg-slate-800/30">
                                                    <tr>
                                                        <th className="px-6 py-3 text-right text-sm font-semibold" colSpan="3">Subtotal Cost:</th>
                                                        <td className="px-6 py-3 text-right text-sm font-semibold">$3.00</td>
                                                    </tr>
                                                    <tr>
                                                        <th className="px-6 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400" colSpan="3">Wastage (5%) + Labor Alloc.:</th>
                                                        <td className="px-6 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">+$0.45</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Steps */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400">blender</span>Production Steps
                                        </h3>
                                        <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-6">
                                            {steps.map(({ n, title, desc }) => (
                                                <li key={n} className="pl-6">
                                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full -left-3 ring-4 ring-white dark:ring-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300">{n}</span>
                                                    <h4 className="font-medium mb-1">{title}</h4>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                                    <button className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-medium">Cancel</button>
                                    <button className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm">Save Recipe Changes</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showCreateForm ? (
                <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <p className="text-base font-semibold">Thêm công thức (POST /Recipes)</p>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                disabled={createLoading}
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Parent Product (name)</span>
                                <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm">
                                    {productOptions.map((p) => (
                                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Material (name)</span>
                                <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm">
                                    {productOptions.map((p) => (
                                        <option key={`material-${p.id}`} value={String(p.id)}>{p.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Quantity Required</span>
                                <input type="number" min="0.01" step="0.01" value={quantityRequired} onChange={(e) => setQuantityRequired(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm" />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Waste %</span>
                                <input type="number" min="0" step="0.1" value={wasteAllowancePercent} onChange={(e) => setWasteAllowancePercent(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm" />
                            </label>
                        </div>

                        {createError ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{createError}</p> : null}

                        <div className="mt-4 flex items-center justify-end gap-3">
                            <button onClick={fetchParentRecipes} disabled={recipesLoading} className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold">
                                Tải lại parent
                            </button>
                            <button onClick={createRecipeLine} disabled={createLoading} className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
                                {createLoading ? 'Đang tạo...' : 'Thêm công thức'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {showEditForm ? (
                <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <p className="text-base font-semibold">Chỉnh sửa công thức (PUT /Recipes/{editingRecipeId})</p>
                            <button
                                onClick={() => setShowEditForm(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                disabled={editLoading}
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Parent Product (name)</span>
                                <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm">
                                    {productOptions.map((p) => (
                                        <option key={`edit-parent-${p.id}`} value={String(p.id)}>{p.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Material (name)</span>
                                <select value={editMaterialId} onChange={(e) => setEditMaterialId(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm">
                                    {productOptions.map((p) => (
                                        <option key={`edit-material-${p.id}`} value={String(p.id)}>{p.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Quantity Required</span>
                                <input type="number" min="0.01" step="0.01" value={editQuantityRequired} onChange={(e) => setEditQuantityRequired(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm" />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Waste %</span>
                                <input type="number" min="0" step="0.1" value={editWasteAllowancePercent} onChange={(e) => setEditWasteAllowancePercent(e.target.value)} className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm" />
                            </label>
                        </div>

                        {editError ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{editError}</p> : null}
                        {editSuccess ? <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{editSuccess}</p> : null}

                        <div className="mt-4 flex items-center justify-end gap-3">
                            <button onClick={updateRecipeLine} disabled={editLoading} className="h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                                {editLoading ? 'Đang cập nhật...' : 'Lưu cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {showViewForm && viewingRecipe ? (
                <div className="fixed inset-0 z-[70] bg-slate-950/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <p className="text-base font-semibold">Chi tiết công thức {viewingRecipe.id}</p>
                            <button
                                onClick={() => setShowViewForm(false)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <p><span className="font-semibold">Recipe ID:</span> {viewingRecipe.id}</p>
                            <p><span className="font-semibold">Parent:</span> {getProductNameById(viewingRecipe.parentProductId)}</p>
                            <p><span className="font-semibold">Material:</span> {getProductNameById(viewingRecipe.materialId)}</p>
                            <p><span className="font-semibold">Quantity Required:</span> {Number(viewingRecipe.quantityRequired || 0)}</p>
                            <p><span className="font-semibold">Waste %:</span> {Number(viewingRecipe.wasteAllowancePercent || 0)}</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
