import { useEffect, useMemo, useState } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'

function getToken() {
  const candidates = [
    localStorage.getItem('auth_token'),
    localStorage.getItem('token'),
    localStorage.getItem('access_token'),
  ]
  const first = candidates.find((item) => String(item || '').trim())
  return first ? String(first).replace(/^Bearer\s+/i, '').trim() : ''
}

async function readApiErrorMessage(response, fallback = 'Có lỗi xảy ra!') {
  try {
    const data = await response.json()
    if (data?.message) return String(data.message)
    if (data?.title) return String(data.title)
    if (data?.errors && typeof data.errors === 'object') {
      const parts = Object.entries(data.errors).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${v}`]
      )
      if (parts.length) return parts.join('\n')
    }
  } catch {
    /* not JSON */
  }
  return fallback
}

export default function RecipesPage() {
  const apiBase = getApiBaseUrl()
  const [allRecipes, setAllRecipes] = useState([])
  const [filteredRecipes, setFilteredRecipes] = useState([])
  const [products, setProducts] = useState([])
  const [materials, setMaterials] = useState([])
  const [filterProductId, setFilterProductId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    parentProductId: '',
    materialId: '',
    quantityRequired: '',
    wasteAllowancePercent: '0',
  })
  /** Chế độ thêm mới: chọn nhiều nguyên liệu — key = materialId (string) */
  const [createRecipeName, setCreateRecipeName] = useState('')
  const [createCategoryId, setCreateCategoryId] = useState('')
  const [createOutputUnit, setCreateOutputUnit] = useState('cái')
  const [materialPick, setMaterialPick] = useState({})
  const [materialFilterModal, setMaterialFilterModal] = useState('')
  /** Chi tiết 1 công thức (theo thành phẩm cha) */
  const [detailParentId, setDetailParentId] = useState(null)

  const fetchProducts = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const response = await fetch(`${apiBase}/Products/manufactured`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (response.ok) {
        const data = await response.json()
        // Backend GetManufacturedProducts() đã trả về mọi loại khác RAW (FINISHED, SEMI_FINISHED, ...).
        // Không lọc thêm chỉ FINISHED — nếu không SEMI_FINISHED bị loại hết → không gọi recipes/parent → luôn 0 dòng.
        const list = Array.isArray(data) ? data : []
        setProducts(list)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCategories = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const response = await fetch(`${apiBase}/Category`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data) ? data : []
        setCategories(list)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
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
      const parentProducts = Array.isArray(productsData) ? productsData : []

      const promises = parentProducts.map(async (product) => {
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
      await Promise.all([fetchProducts(), fetchMaterials(), fetchCategories()])
      await fetchAllRecipes()
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!showModal || editingId || createCategoryId) return
    const first = categories[0]
    if (first) {
      const id = first.categoryId ?? first.CategoryId
      if (id != null) setCreateCategoryId(String(id))
    }
  }, [showModal, editingId, categories, createCategoryId])

  const getParentName = (parentProductId, recipeParentName) => {
    if (recipeParentName) return recipeParentName
    const product = products.find((p) => p.productId === Number(parentProductId))
    return product?.productName || product?.name || `Sản phẩm #${parentProductId}`
  }

  const getMaterialName = (materialId, recipeMaterialName) => {
    if (recipeMaterialName) return recipeMaterialName
    if (!materialId) return 'N/A'

    const material = materials.find((m) => m.productId === Number(materialId))
    if (material) {
      return material.productName || material.name || `Nguyên liệu #${materialId}`
    }

    const product = products.find((p) => p.productId === Number(materialId))
    if (product) {
      return product.productName || product.name || `Nguyên liệu #${materialId}`
    }

    return `Nguyên liệu #${materialId}`
  }

  useEffect(() => {
    let filtered = allRecipes

    if (filterProductId) {
      filtered = filtered.filter(r => r.parentProductId === Number(filterProductId))
    }

    if (searchText.trim()) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(r => {
        const productName = getParentName(r.parentProductId, r.parentProductName).toLowerCase()
        const materialName = getMaterialName(r.materialId, r.materialName).toLowerCase()
        return productName.includes(search) || materialName.includes(search)
      })
    }

    setFilteredRecipes(filtered)
  }, [filterProductId, searchText, allRecipes, products, materials])

  /** Một hàng = một thành phẩm (công thức), gồm nhiều dòng nguyên liệu */
  const recipeGroupsFiltered = useMemo(() => {
    const map = new Map()
    for (const r of filteredRecipes) {
      const pid = r.parentProductId
      if (pid == null) continue
      if (!map.has(pid)) {
        map.set(pid, { parentProductId: pid, lines: [] })
      }
      map.get(pid).lines.push(r)
    }
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        parentProductName: getParentName(g.parentProductId, g.lines[0]?.parentProductName),
      }))
      .sort((a, b) => String(a.parentProductName).localeCompare(String(b.parentProductName), 'vi'))
  }, [filteredRecipes, products, materials])

  const detailLines = useMemo(() => {
    if (detailParentId == null) return []
    return allRecipes
      .filter((r) => r.parentProductId === detailParentId)
      .slice()
      .sort((a, b) => {
        const na = getMaterialName(a.materialId, a.materialName)
        const nb = getMaterialName(b.materialId, b.materialName)
        return String(na).localeCompare(String(nb), 'vi')
      })
  }, [allRecipes, detailParentId, materials, products])

  const detailParentName =
    detailLines.length > 0
      ? getParentName(detailParentId, detailLines[0]?.parentProductName)
      : getParentName(detailParentId, null)

  const openRecipeDetail = (parentProductId) => {
    setDetailParentId(parentProductId)
  }

  const closeRecipeDetail = () => setDetailParentId(null)

  useEffect(() => {
    if (detailParentId == null) return
    const n = allRecipes.filter((r) => r.parentProductId === detailParentId).length
    if (n === 0) setDetailParentId(null)
  }, [allRecipes, detailParentId])

  const openCreateModal = () => {
    setDetailParentId(null)
    setEditingId(null)
    setForm({
      parentProductId: '',
      materialId: '',
      quantityRequired: '',
      wasteAllowancePercent: '0',
    })
    setCreateRecipeName('')
    setCreateOutputUnit('cái')
    setMaterialPick({})
    setMaterialFilterModal('')
    const firstCat = categories[0]
    setCreateCategoryId(firstCat ? String(firstCat.categoryId ?? firstCat.CategoryId ?? '') : '')
    setShowModal(true)
  }

  const recipeWastePercent = (recipe) =>
    recipe.maxWastePercent ?? recipe.MaxWastePercent ?? recipe.wasteAllowancePercent ?? 0

  const openEditModal = (recipe) => {
    setDetailParentId(null)
    const id = recipe.recipeId || recipe.bomId
    setEditingId(id)
    setForm({
      parentProductId: String(recipe.parentProductId),
      materialId: String(recipe.materialId),
      quantityRequired: String(recipe.quantityRequired),
      wasteAllowancePercent: String(recipeWastePercent(recipe)),
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setMaterialPick({})
    setMaterialFilterModal('')
  }

  const toggleMaterialPick = (materialId, checked) => {
    const key = String(materialId)
    setMaterialPick((prev) => {
      if (!checked) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { qty: '', waste: '0' } }
    })
  }

  const updateMaterialPickField = (materialId, field, value) => {
    const key = String(materialId)
    setMaterialPick((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      if (editingId) {
        if (!form.parentProductId || !form.materialId || !form.quantityRequired) {
          return
        }
        const maxWastePercent = Number(form.wasteAllowancePercent) || 0
        const response = await fetch(`${apiBase}/recipes/${editingId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${tk}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            materialId: Number(form.materialId),
            quantityRequired: Number(form.quantityRequired),
            maxWastePercent,
          }),
        })

        if (response.ok) {
          await Promise.all([fetchAllRecipes(), fetchProducts()])
          closeModal()
          alert('Cập nhật thành công!')
        } else {
          alert(await readApiErrorMessage(response))
        }
        return
      }

      const name = createRecipeName.trim()
      if (!name) {
        alert('Vui lòng nhập tên công thức.')
        return
      }
      const catId = Number(createCategoryId)
      if (!catId) {
        alert('Vui lòng chọn danh mục cho sản phẩm đầu ra (hoặc tạo danh mục trong hệ thống).')
        return
      }

      const materialsPayload = Object.entries(materialPick)
        .map(([id, row]) => {
          const q = Number(row?.qty)
          return {
            materialId: Number(id),
            quantityRequired: q,
            maxWastePercent: Number(row?.waste) || 0,
          }
        })
        .filter((m) => Number.isFinite(m.quantityRequired) && m.quantityRequired > 0)

      if (materialsPayload.length < 1) {
        alert('Chọn ít nhất một nguyên liệu và nhập số lượng lớn hơn 0 cho mỗi dòng đã chọn.')
        return
      }

      const sku = `RCP-${Date.now()}`
      const productRes = await fetch(`${apiBase}/Products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku,
          productName: name,
          categoryId: catId,
          baseUnit: (createOutputUnit || 'cái').trim() || 'cái',
          productType: 'FINISHED',
          purchasePrice: null,
          internalPrice: null,
        }),
      })

      const productJson = await productRes.json().catch(() => ({}))
      if (!productRes.ok) {
        alert(await readApiErrorMessage(productRes, productJson?.message || 'Không tạo được sản phẩm.'))
        return
      }

      const parentProductId = Number(productJson.productId ?? productJson.ProductId)
      if (!parentProductId) {
        alert('API không trả về mã sản phẩm mới. Hãy cập nhật backend hoặc tạo sản phẩm thủ công.')
        return
      }

      const recipeRes = await fetch(`${apiBase}/recipes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentProductId,
          materials: materialsPayload,
        }),
      })

      if (recipeRes.ok) {
        await Promise.all([fetchAllRecipes(), fetchProducts()])
        closeModal()
        alert('Thêm công thức thành công!')
      } else {
        alert(
          (await readApiErrorMessage(recipeRes)) +
            '\n\n(Lưu ý: sản phẩm đầu ra đã được tạo; bạn có thể xóa hoặc gắn công thức sau trong trường hợp lỗi.)'
        )
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra!')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (recipeId) => {
    if (!window.confirm(`Xóa dòng định mức #${recipeId}? (chỉ xóa một nguyên liệu trong công thức)`)) return

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
        alert(await readApiErrorMessage(response, 'Xóa thất bại!'))
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra!')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecipeGroup = async (group) => {
    const name = group.parentProductName || `Sản phẩm #${group.parentProductId}`
    const n = group.lines.length
    if (
      !window.confirm(
        `Xóa toàn bộ công thức "${name}"?\n\nSẽ xóa ${n} dòng định mức nguyên liệu. Thành phẩm vẫn còn trong danh mục sản phẩm (chỉ gỡ BOM).`
      )
    ) {
      return
    }

    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      for (const line of group.lines) {
        const id = line.recipeId || line.bomId
        if (!id) continue
        const response = await fetch(`${apiBase}/recipes/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tk}` },
        })
        if (!response.ok) {
          alert(await readApiErrorMessage(response, `Không xóa được dòng định mức #${id}.`))
          await fetchAllRecipes()
          return
        }
      }
      await fetchAllRecipes()
      if (detailParentId != null && Number(detailParentId) === Number(group.parentProductId)) {
        setDetailParentId(null)
      }
      alert('Đã xóa toàn bộ công thức.')
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra khi xóa công thức.')
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalRecipes: new Set(allRecipes.map((r) => r.parentProductId).filter(Boolean)).size,
    totalLines: allRecipes.length,
    materials: new Set(allRecipes.map((r) => r.materialId).filter(Boolean)).size,
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
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Mỗi dòng trong bảng là một công thức (thành phẩm). Bấm &quot;Xem nguyên liệu&quot; để xem toàn bộ định mức.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Tổng công thức', value: stats.totalRecipes, icon: 'menu_book', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Dòng định mức', value: stats.totalLines, icon: 'format_list_numbered', color: 'text-green-600 dark:text-green-400' },
            { label: 'Loại nguyên liệu', value: stats.materials, icon: 'nutrition', color: 'text-amber-600 dark:text-amber-400' },
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
          ) : recipeGroupsFiltered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              {searchText || filterProductId ? 'Không tìm thấy công thức' : 'Chưa có công thức'}
            </div>
          ) : (
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mã SP</th>
                  <th className="w-[38%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tên công thức / thành phẩm</th>
                  <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Số nguyên liệu</th>
                  <th className="w-[32%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recipeGroupsFiltered.map((group) => (
                  <tr
                    key={group.parentProductId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      #{group.parentProductId}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{group.parentProductName}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold">
                        {group.lines.length} nguyên liệu
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openRecipeDetail(group.parentProductId)}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/15 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                          Xem nguyên liệu
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecipeGroup(group)}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                          Xóa công thức
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detailParentId != null && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/45 flex items-center justify-center p-4"
          onClick={closeRecipeDetail}
          role="presentation"
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="recipe-detail-title"
          >
            <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h3 id="recipe-detail-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Nguyên liệu trong công thức
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{detailParentName}</p>
              </div>
              <button
                type="button"
                onClick={closeRecipeDetail}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 p-5">
              {detailLines.length === 0 ? (
                <p className="text-sm text-slate-500">Không còn dòng định mức.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-3">ID dòng</th>
                      <th className="py-2 pr-3">Nguyên liệu</th>
                      <th className="py-2 pr-3">Số lượng</th>
                      <th className="py-2 pr-3">Hao hụt</th>
                      <th className="py-2 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detailLines.map((recipe) => {
                      const id = recipe.recipeId || recipe.bomId
                      return (
                        <tr key={id || `${recipe.materialId}-${recipe.parentProductId}`}>
                          <td className="py-3 pr-3 text-sm font-medium">#{id ?? '—'}</td>
                          <td className="py-3 pr-3 text-sm">
                            {getMaterialName(recipe.materialId, recipe.materialName)}
                          </td>
                          <td className="py-3 pr-3 text-sm">{recipe.quantityRequired}</td>
                          <td className="py-3 pr-3 text-sm">{recipeWastePercent(recipe)}%</td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(recipe)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                                title="Sửa dòng"
                                disabled={!id}
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => id && handleDelete(id)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                                title="Xóa dòng"
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
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
          <div
            className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[90vh] flex flex-col ${editingId ? 'max-w-md' : 'max-w-2xl'}`}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingId ? 'Sửa công thức' : 'Thêm công thức'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {editingId ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Sản phẩm (thành phẩm)
                    </label>
                    <select
                      className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={form.parentProductId}
                      onChange={(e) => setForm({ ...form, parentProductId: e.target.value })}
                      required
                      disabled
                    >
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
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Tên công thức / thành phẩm
                    </label>
                    <input
                      type="text"
                      className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={createRecipeName}
                      onChange={(e) => setCreateRecipeName(e.target.value)}
                      placeholder="Ví dụ: Bánh chưng đặc biệt"
                      required
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Hệ thống sẽ tạo một thành phẩm mới với tên này, sau đó gắn toàn bộ nguyên liệu đã chọn.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Danh mục
                      </span>
                      <select
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        value={createCategoryId}
                        onChange={(e) => setCreateCategoryId(e.target.value)}
                        required
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map((c) => {
                          const id = c.categoryId ?? c.CategoryId
                          const name = c.name ?? c.Name ?? `Danh mục #${id}`
                          return (
                            <option key={id} value={String(id)}>
                              {name}
                            </option>
                          )
                        })}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Đơn vị thành phẩm
                      </span>
                      <input
                        type="text"
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        value={createOutputUnit}
                        onChange={(e) => setCreateOutputUnit(e.target.value)}
                        placeholder="cái, kg, hộp..."
                      />
                    </label>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nguyên liệu (chọn nhiều — cùng nguồn trang nguyên liệu)
                      </label>
                      <input
                        type="search"
                        className="h-9 w-full sm:w-56 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                        placeholder="Lọc tên nguyên liệu..."
                        value={materialFilterModal}
                        onChange={(e) => setMaterialFilterModal(e.target.value)}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                      {materials
                        .filter((m) => {
                          const q = materialFilterModal.trim().toLowerCase()
                          if (!q) return true
                          const n = (m.productName || m.name || '').toLowerCase()
                          return n.includes(q)
                        })
                        .map((material) => {
                          const mid = material.productId
                          const key = String(mid)
                          const checked = Boolean(materialPick[key])
                          const row = materialPick[key] || { qty: '', waste: '0' }
                          return (
                            <div
                              key={mid}
                              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 bg-white dark:bg-slate-900/40"
                            >
                              <label className="flex items-center gap-2 min-w-0 sm:w-[42%] cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-primary focus:ring-primary shrink-0"
                                  checked={checked}
                                  onChange={(e) => toggleMaterialPick(mid, e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {material.productName || material.name || `Nguyên liệu #${mid}`}
                                </span>
                              </label>
                              {checked ? (
                                <div className="flex flex-wrap items-center gap-2 sm:flex-1 sm:justify-end">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">SL</span>
                                    <input
                                      type="number"
                                      step="0.0001"
                                      min="0"
                                      className="h-9 w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
                                      value={row.qty}
                                      onChange={(e) => updateMaterialPickField(mid, 'qty', e.target.value)}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500 whitespace-nowrap">Hao hụt %</span>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="100"
                                      className="h-9 w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
                                      value={row.waste}
                                      onChange={(e) => updateMaterialPickField(mid, 'waste', e.target.value)}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Đánh dấu nguyên liệu cần dùng, nhập số lượng cho từng dòng. Có thể chọn nhiều dòng cùng lúc.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
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
