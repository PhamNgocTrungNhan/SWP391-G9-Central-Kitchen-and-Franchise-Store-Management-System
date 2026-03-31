import { useEffect, useState } from 'react'
import { PageHeader, SectionCard } from '../components/ui'

function getToken() {
  const candidates = [
    localStorage.getItem('auth_token'),
    localStorage.getItem('token'),
    localStorage.getItem('access_token'),
  ]
  const first = candidates.find((item) => String(item || '').trim())
  return first ? String(first).replace(/^Bearer\s+/i, '').trim() : ''
}

export default function RecipesPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [allRecipes, setAllRecipes] = useState([])
  const [filteredRecipes, setFilteredRecipes] = useState([])
  const [products, setProducts] = useState([])
  const [materials, setMaterials] = useState([])
  const [filterProductId, setFilterProductId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    parentProductId: '',
    materialId: '',
    quantityRequired: '',
    wasteAllowancePercent: '0',
  })

  const fetchProducts = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const response = await fetch(`${apiBase}/Products/manufactured`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (response.ok) {
        const data = await response.json()
        const finished = Array.isArray(data)
          ? data.filter(p => p.productType === 'FINISHED' || p.productType === 'Finished')
          : []
        setProducts(finished)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchMaterials = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const response = await fetch(`${apiBase}/Products/raw`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (response.ok) {
        const data = await response.json()
        const materialsArray = Array.isArray(data) ? data : []
        setMaterials(materialsArray)
      }
    } catch (err) {
      console.error('Error fetching materials:', err)
    }
  }

  const fetchAllRecipes = async () => {
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      // Fetch by parent product
      const response = await fetch(`${apiBase}/Products/manufactured`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        setLoading(false)
        return
      }

      const productsData = await response.json()
      const finishedProducts = Array.isArray(productsData)
        ? productsData.filter(p => p.productType === 'FINISHED' || p.productType === 'Finished')
        : []

      const promises = finishedProducts.map(async (product) => {
        try {
          const res = await fetch(`${apiBase}/recipes/parent/${product.productId}`, {
            headers: { Authorization: `Bearer ${tk}` },
          })
          if (res.ok) {
            const data = await res.json()
            return Array.isArray(data) ? data : []
          }
          return []
        } catch {
          return []
        }
      })

      const results = await Promise.all(promises)
      const all = results.flat()
      setAllRecipes(all)
      setFilteredRecipes(all)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchProducts(), fetchMaterials()])
      await fetchAllRecipes()
    }
    loadData()
  }, [])

  useEffect(() => {
    let filtered = allRecipes

    if (filterProductId) {
      filtered = filtered.filter(r => r.parentProductId === Number(filterProductId))
    }

    if (searchText.trim()) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(r => {
        const productName = getProductName(r.parentProductId).toLowerCase()
        const materialName = getMaterialName(r.materialId).toLowerCase()
        return productName.includes(search) || materialName.includes(search)
      })
    }

    setFilteredRecipes(filtered)
  }, [filterProductId, searchText, allRecipes])

  const openCreateModal = () => {
    setEditingId(null)
    setForm({
      parentProductId: '',
      materialId: '',
      quantityRequired: '',
      wasteAllowancePercent: '0',
    })
    setShowModal(true)
  }

  const openEditModal = (recipe) => {
    const id = recipe.recipeId || recipe.bomId
    setEditingId(id)
    setForm({
      parentProductId: String(recipe.parentProductId),
      materialId: String(recipe.materialId),
      quantityRequired: String(recipe.quantityRequired),
      wasteAllowancePercent: String(recipe.wasteAllowancePercent),
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.parentProductId || !form.materialId || !form.quantityRequired) return

    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      const url = editingId ? `${apiBase}/recipes/${editingId}` : `${apiBase}/recipes`
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentProductId: Number(form.parentProductId),
          materialId: Number(form.materialId),
          quantityRequired: Number(form.quantityRequired),
          wasteAllowancePercent: Number(form.wasteAllowancePercent),
        }),
      })

      if (response.ok) {
        await fetchAllRecipes()
        closeModal()
        alert(editingId ? 'Cập nhật thành công!' : 'Thêm thành công!')
      } else {
        const error = await response.json()
        alert(error.message || 'Có lỗi xảy ra!')
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra!')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (recipeId) => {
    if (!window.confirm(`Xóa công thức #${recipeId}?`)) return

    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (response.ok) {
        await fetchAllRecipes()
        alert('Xóa thành công!')
      } else {
        const error = await response.json()
        alert(error.message || 'Xóa thất bại!')
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra!')
    } finally {
      setLoading(false)
    }
  }

  const getProductName = (productId) => {
    const product = products.find((p) => p.productId === Number(productId))
    return product?.productName || product?.name || `Sản phẩm #${productId}`
  }

  const getMaterialName = (materialId) => {
    if (!materialId) return 'N/A'

    // Try to find in materials first
    const material = materials.find((m) => m.productId === Number(materialId))
    if (material) {
      return material.productName || material.name || `Nguyên liệu #${materialId}`
    }

    // Try to find in products as fallback
    const product = products.find((p) => p.productId === Number(materialId))
    if (product) {
      return product.productName || product.name || `Nguyên liệu #${materialId}`
    }

    // If not found anywhere, show ID with warning
    return `Nguyên liệu #${materialId} (đã xóa?)`
  }

  const stats = {
    total: allRecipes.length,
    products: new Set(allRecipes.map(r => r.parentProductId)).size,
    materials: new Set(allRecipes.map(r => r.materialId)).size,
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">menu_book</span>
          <h2 className="text-lg font-bold leading-tight">Quản lý công thức</h2>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Thêm công thức
        </button>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Công thức sản xuất</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý định mức nguyên liệu cho sản phẩm.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Tổng công thức', value: stats.total, icon: 'menu_book', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Sản phẩm', value: stats.products, icon: 'inventory', color: 'text-green-600 dark:text-green-400' },
            { label: 'Nguyên liệu', value: stats.materials, icon: 'nutrition', color: 'text-amber-600 dark:text-amber-400' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[32px] ${card.color}`}>{card.icon}</span>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Lọc theo sản phẩm</span>
              <select
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
              >
                <option value="">-- Tất cả --</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName || product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tìm kiếm</span>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Nhập tên sản phẩm hoặc nguyên liệu..."
              />
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Đang tải...</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              {searchText || filterProductId ? 'Không tìm thấy công thức' : 'Chưa có công thức'}
            </div>
          ) : (
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                  <th className="w-[25%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                  <th className="w-[25%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Nguyên liệu</th>
                  <th className="w-[15%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                  <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Hao hụt</th>
                  <th className="w-[15%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecipes.map((recipe, index) => {
                  const id = recipe.recipeId || recipe.bomId
                  return (
                    <tr key={id || `recipe-${index}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold">#{id || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{getProductName(recipe.parentProductId)}</td>
                      <td className="px-4 py-3 text-sm">{getMaterialName(recipe.materialId)}</td>
                      <td className="px-4 py-3 text-sm">{recipe.quantityRequired}</td>
                      <td className="px-4 py-3 text-sm">{recipe.wasteAllowancePercent}%</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(recipe)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                            title={`Sửa công thức #${id}`}
                            disabled={!id}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => id && handleDelete(id)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Xóa công thức #${id}`}
                            disabled={!id}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingId ? 'Sửa công thức' : 'Thêm công thức'}
              </h3>
              <button
                onClick={closeModal}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Sản phẩm
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={form.parentProductId}
                  onChange={(e) => setForm({ ...form, parentProductId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nguyên liệu
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={form.materialId}
                  onChange={(e) => setForm({ ...form, materialId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn nguyên liệu --</option>
                  {materials.map((material) => (
                    <option key={material.productId} value={material.productId}>
                      {material.productName || material.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Số lượng
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  type="number"
                  step="0.01"
                  value={form.quantityRequired}
                  onChange={(e) => setForm({ ...form, quantityRequired: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Hao hụt (%)
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  type="number"
                  step="0.1"
                  value={form.wasteAllowancePercent}
                  onChange={(e) => setForm({ ...form, wasteAllowancePercent: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  disabled={loading}
                >
                  {editingId ? 'Cập nhật' : 'Thêm'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  disabled={loading}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
