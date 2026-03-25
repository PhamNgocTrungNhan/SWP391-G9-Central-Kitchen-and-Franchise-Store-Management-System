import { useEffect, useState } from 'react'
import { EmptyState, Field, PageHeader, SectionCard } from '../components/ui'

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

export default function RecipesPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [recipes, setRecipes] = useState([])
  const [products, setProducts] = useState([])
  const [materials, setMaterials] = useState([])
  const [parentProductId, setParentProductId] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
        setProducts(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
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
        setMaterials(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err)
    }
  }

  const fetchRecipes = async (productId) => {
    if (!productId) {
      setRecipes([])
      return
    }

    const tk = getToken()
    if (!tk) {
      setError('Vui lòng đăng nhập lại')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/Recipes/parent/${productId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setRecipes([])
          return
        }
        throw new Error('Không thể tải công thức')
      }

      const data = await response.json()
      setRecipes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchMaterials()
  }, [])

  useEffect(() => {
    if (parentProductId) {
      fetchRecipes(parentProductId)
    }
  }, [parentProductId])

  const handleParentChange = (value) => {
    setParentProductId(value)
    setSelectedId(null)
    setForm({
      parentProductId: value,
      materialId: '',
      quantityRequired: '',
      wasteAllowancePercent: '0',
    })
  }

  const selectRecipe = (recipe) => {
    if (!recipe) {
      setSelectedId(null)
      setForm({
        parentProductId: parentProductId,
        materialId: '',
        quantityRequired: '',
        wasteAllowancePercent: '0',
      })
      return
    }

    setSelectedId(recipe.recipeId || recipe.id)
    setForm({
      parentProductId: String(recipe.productId || recipe.parentProductId || parentProductId),
      materialId: String(recipe.materialId || ''),
      quantityRequired: String(recipe.quantityRequired || ''),
      wasteAllowancePercent: String(recipe.wasteAllowancePercent || '0'),
    })
  }

  const createRecipe = async () => {
    if (!form.parentProductId || !form.materialId || !form.quantityRequired) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    const tk = getToken()
    if (!tk) {
      setError('Vui lòng đăng nhập lại')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${apiBase}/Recipes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: Number(form.parentProductId),
          materialId: Number(form.materialId),
          quantityRequired: Number(form.quantityRequired),
          wasteAllowancePercent: Number(form.wasteAllowancePercent),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || 'Không thể tạo công thức')
      }

      setSuccess('Tạo công thức thành công')
      await fetchRecipes(parentProductId)
      selectRecipe(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRecipe = async () => {
    if (!selectedId) {
      setError('Vui lòng chọn công thức cần cập nhật')
      return
    }

    const tk = getToken()
    if (!tk) {
      setError('Vui lòng đăng nhập lại')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${apiBase}/Recipes/${selectedId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: Number(form.parentProductId),
          materialId: Number(form.materialId),
          quantityRequired: Number(form.quantityRequired),
          wasteAllowancePercent: Number(form.wasteAllowancePercent),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || 'Không thể cập nhật công thức')
      }

      setSuccess('Cập nhật công thức thành công')
      await fetchRecipes(parentProductId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteRecipe = async () => {
    if (!selectedId) {
      setError('Vui lòng chọn công thức cần xóa')
      return
    }

    if (!window.confirm('Bạn có chắc muốn xóa công thức này?')) {
      return
    }

    const tk = getToken()
    if (!tk) {
      setError('Vui lòng đăng nhập lại')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`${apiBase}/Recipes/${selectedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || 'Không thể xóa công thức')
      }

      setSuccess('Xóa công thức thành công')
      await fetchRecipes(parentProductId)
      selectRecipe(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getProductName = (productId) => {
    const product = products.find((p) => p.productId === Number(productId))
    return product?.productName || `Sản phẩm #${productId}`
  }

  const getMaterialName = (materialId) => {
    const material = materials.find((m) => m.productId === Number(materialId))
    return material?.productName || `Nguyên liệu #${materialId}`
  }

  return (
    <div>
      <PageHeader pageKey="recipes" />

      <div className="space-y-6">
        <SectionCard title="Danh sách công thức">
          <div className="mb-4">
            <Field label="Chọn sản phẩm">
              <select
                className="app-input"
                value={parentProductId}
                onChange={(e) => handleParentChange(e.target.value)}
              >
                <option value="">-- Chọn sản phẩm --</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-600">
              {success}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-slate-500">Đang tải...</div>
          ) : !parentProductId ? (
            <EmptyState
              title="Chưa chọn sản phẩm"
              description="Vui lòng chọn sản phẩm để xem công thức"
              icon="menu_book"
            />
          ) : recipes.length === 0 ? (
            <EmptyState
              title="Chưa có công thức"
              description="Sản phẩm này chưa có công thức nào"
              icon="menu_book"
            />
          ) : (
            <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="app-th">ID</th>
                    <th className="app-th">Nguyên liệu</th>
                    <th className="app-th">Số lượng</th>
                    <th className="app-th">Hao hụt (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe) => {
                    const recipeId = recipe.recipeId || recipe.id
                    return (
                      <tr
                        key={recipeId}
                        className={`cursor-pointer transition-colors ${recipeId === selectedId ? 'bg-[#eef7ef]' : 'bg-[#fffdf8] hover:bg-[#fff9ef]'
                          }`}
                        onClick={() => selectRecipe(recipe)}
                      >
                        <td className="app-td font-medium">#{recipeId}</td>
                        <td className="app-td">{getMaterialName(recipe.materialId)}</td>
                        <td className="app-td">{recipe.quantityRequired}</td>
                        <td className="app-td">{recipe.wasteAllowancePercent}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title={selectedId ? 'Chỉnh sửa công thức' : 'Thêm công thức mới'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sản phẩm">
              <select
                className="app-input"
                value={form.parentProductId}
                onChange={(e) => setForm({ ...form, parentProductId: e.target.value })}
              >
                <option value="">-- Chọn sản phẩm --</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nguyên liệu">
              <select
                className="app-input"
                value={form.materialId}
                onChange={(e) => setForm({ ...form, materialId: e.target.value })}
              >
                <option value="">-- Chọn nguyên liệu --</option>
                {materials.map((material) => (
                  <option key={material.productId} value={material.productId}>
                    {material.productName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Số lượng cần">
              <input
                className="app-input"
                type="number"
                step="0.01"
                value={form.quantityRequired}
                onChange={(e) => setForm({ ...form, quantityRequired: e.target.value })}
                placeholder="Nhập số lượng"
              />
            </Field>

            <Field label="Hao hụt cho phép (%)">
              <input
                className="app-input"
                type="number"
                step="0.1"
                value={form.wasteAllowancePercent}
                onChange={(e) => setForm({ ...form, wasteAllowancePercent: e.target.value })}
                placeholder="Nhập % hao hụt"
              />
            </Field>
          </div>

          {selectedId && (
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-700">
                Đang chỉnh sửa công thức #{selectedId}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {!selectedId ? (
              <button
                className="app-button-primary"
                onClick={createRecipe}
                disabled={loading}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Thêm công thức
              </button>
            ) : (
              <>
                <button
                  className="app-button-primary"
                  onClick={updateRecipe}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Cập nhật
                </button>
                <button
                  className="app-button-danger"
                  onClick={deleteRecipe}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Xóa
                </button>
                <button
                  className="app-button-secondary"
                  onClick={() => selectRecipe(null)}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Hủy
                </button>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
