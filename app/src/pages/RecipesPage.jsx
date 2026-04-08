import { useEffect, useMemo, useRef, useState } from 'react'
import { MetricsStrip } from '../components/ui'

function parseArrayData(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

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

function normalizeProduct(item) {
  const id = Number(item?.productId ?? item?.id)
  if (!id || id < 1) return null

  const normalizedType = String(item?.productType || '').toUpperCase().trim()
  const productType = normalizedType === 'SEMI-FINISHED' || normalizedType === 'SEMI_FINISH' || normalizedType === 'SEMIFINISHED'
    ? 'SEMI_FINISHED'
    : normalizedType

  return {
    id,
    name: String(item?.productName || item?.name || `Sản phẩm chưa có tên`),
    baseUnit: String(item?.baseUnit || '').trim(),
    productType,
  }
}

function normalizeRecipe(item) {
  const recipeId = Number(item?.recipeId ?? item?.id ?? item?.bomId)
  const parentProductId = Number(item?.parentProductId ?? item?.parentId ?? item?.parentProduct?.productId ?? item?.parentProduct?.id ?? 0)
  const materialId = Number(item?.materialId ?? item?.material?.productId ?? item?.material?.id ?? 0)

  if (!recipeId || !parentProductId || !materialId) return null

  return {
    recipeId,
    parentProductId,
    materialId,
    parentProductName: String(item?.parentProduct?.productName || item?.parentProduct?.name || item?.parentProductName || '').trim(),
    materialName: String(item?.material?.productName || item?.material?.name || item?.materialName || '').trim(),
    quantityRequired: Number(item?.quantityRequired ?? 0),
    maxWastePercent: Number(item?.maxWastePercent ?? item?.max_waste_percent ?? item?.wasteAllowancePercent ?? item?.waste_allowance_percent ?? 0),
  }
}

const blankMaterialLine = () => ({ materialId: '', quantityRequired: '', maxWastePercent: '0' })
const API_TIMEOUT_MS = 15000

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Hệ thống phản hồi chậm. Vui lòng thử lại.')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function readResponsePayload(response) {
  const rawText = await response.text().catch(() => '')
  if (!rawText) return { json: {}, text: '' }

  try {
    return { json: JSON.parse(rawText), text: rawText }
  } catch {
    return { json: {}, text: rawText }
  }
}

function logRecipesApi({ stage, method, url, payload, status, data, rawText, attempt, totalAttempts }) {
  const attemptText = Number.isFinite(attempt) && Number.isFinite(totalAttempts)
    ? ` [${attempt}/${totalAttempts}]`
    : ''

  console.groupCollapsed(`[RecipesAPI] ${stage}${attemptText} ${method} ${url} -> ${status}`)
  if (payload !== undefined) {
    console.log('request payload:', payload)
  }
  console.log('response data:', data)
  if (rawText && typeof rawText === 'string') {
    console.log('response text:', rawText)
  }
  console.groupEnd()
}

function resolveApiErrorMessage(data, fallback) {
  if (typeof data === 'string' && data.trim()) return data.trim()

  const message = data?.message || data?.title || data?.error
  if (message) return String(message)

  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0]
    const firstValue = firstKey ? data.errors[firstKey] : null
    const firstText = Array.isArray(firstValue) ? firstValue[0] : firstValue
    if (firstKey && firstText) {
      return `${firstKey}: ${firstText}`
    }
    if (firstText) {
      return String(firstText)
    }
  }

  return fallback
}

function isEntitySaveError(message) {
  const normalized = String(message || '').toLowerCase()
  return normalized.includes('error occurred while saving the entity changes')
    || normalized.includes('saving the entity changes')
}

function isRecipesSchemaMismatch(message) {
  const normalized = String(message || '').toLowerCase()
  return normalized.includes('invalid column name')
    && normalized.includes('waste_allowance_percent')
}

function toUiNoticeMessage(rawMessage, fallbackMessage) {
  const message = String(rawMessage || '').trim()
  if (!message) return fallbackMessage

  const normalized = message.toLowerCase()

  if (normalized.includes('thiếu token') || normalized.includes('đăng nhập')) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }

  if (normalized.includes('đã tồn tại trong công thức')) {
    return message
  }

  if (normalized.includes('không tồn tại')) {
    return message
  }

  if (
    normalized.includes('invalid column name')
    || normalized.includes('waste_allowance_percent')
    || normalized.includes('entity')
    || normalized.includes('sql')
    || normalized.includes('exception')
    || normalized.includes('schema')
    || normalized.includes('backend')
    || normalized.includes('http ')
    || normalized.includes('/api/')
    || normalized.includes('/recipes')
    || normalized.includes('method not allowed')
    || normalized.includes('bad request')
    || normalized.includes('unauthorized')
    || normalized.includes('forbidden')
    || normalized.includes('timeout')
  ) {
    return fallbackMessage
  }

  return message
}

async function createBulkRecipesWithRetry(apiBase, token, parentProductId, materials) {
  const requestUrl = `${apiBase}/Recipes`
  const payload = {
    parentProductId,
    materials: materials.map((item) => ({
      materialId: item.materialId,
      quantityRequired: item.quantityRequired,
      maxWastePercent: item.maxWastePercent,
    })),
  }

  const response = await fetchWithTimeout(requestUrl, {
    method: 'POST',
    headers: {
      accept: '*/*',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const { json: data, text: rawText } = await readResponsePayload(response)
  logRecipesApi({
    stage: 'create-bulk',
    method: 'POST',
    url: requestUrl,
    payload,
    status: response.status,
    data,
    rawText,
    attempt: 1,
    totalAttempts: 1,
  })

  if (response.ok) {
    return { ok: true, data }
  }

  const errorMessage = resolveApiErrorMessage(data, 'Không thể tạo công thức.')
  return { ok: false, errorMessage }
}

export default function RecipesPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const didInitialLoadRef = useRef(false)

  const [products, setProducts] = useState([])
  const [materials, setMaterials] = useState([])
  const [recipes, setRecipes] = useState([])

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [recipesReadUnavailable, setRecipesReadUnavailable] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterProductId, setFilterProductId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [expandedParentProductId, setExpandedParentProductId] = useState(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createParentProductId, setCreateParentProductId] = useState('')
  const [createMaterials, setCreateMaterials] = useState([blankMaterialLine()])

  const [showEditModal, setShowEditModal] = useState(false)
  const [editRecipeId, setEditRecipeId] = useState('')
  const [editMaterialId, setEditMaterialId] = useState('')
  const [editQuantityRequired, setEditQuantityRequired] = useState('')
  const [editMaxWastePercent, setEditMaxWastePercent] = useState('0')

  const clearNotice = () => {
    setError('')
    setSuccess('')
  }

  const recipeNameById = useMemo(() => {
    const map = {}
    recipes.forEach((row) => {
      const parentId = Number(row?.parentProductId)
      const materialId = Number(row?.materialId)
      const parentName = String(row?.parentProductName || '').trim()
      const materialName = String(row?.materialName || '').trim()

      if (parentId > 0 && parentName) map[parentId] = parentName
      if (materialId > 0 && materialName) map[materialId] = materialName
    })
    return map
  }, [recipes])

  const getProductName = (id) => {
    const numberId = Number(id)
    if (!numberId) return 'N/A'

    const fromProducts = products.find((p) => p.id === numberId)
    if (fromProducts) return fromProducts.name

    const fromMaterials = materials.find((m) => m.id === numberId)
    if (fromMaterials) return fromMaterials.name

    const fromRecipe = recipeNameById[numberId]
    if (fromRecipe) return fromRecipe

    return 'Sản phẩm chưa có tên'
  }

  const getMaterialUnit = (materialId) => {
    const id = Number(materialId)
    if (!id) return 'đơn vị'

    const material = materials.find((item) => item.id === id)
    if (material?.baseUnit) return material.baseUnit

    const product = products.find((item) => item.id === id)
    if (product?.baseUnit) return product.baseUnit

    return 'đơn vị'
  }

  const fetchProducts = async (tk) => {
    const requestUrl = `${apiBase}/Products/manufactured`
    const response = await fetchWithTimeout(requestUrl, {
      method: 'GET',
      headers: {
        accept: '*/*',
        Authorization: `Bearer ${tk}`,
      },
    })

    const { json: data, text: rawText } = await readResponsePayload(response)
    logRecipesApi({
      stage: 'load-products',
      method: 'GET',
      url: requestUrl,
      status: response.status,
      data,
      rawText,
    })

    if (!response.ok) {
      throw new Error(resolveApiErrorMessage(data, 'Không thể tải danh sách thành phẩm.'))
    }

    return parseArrayData(data).map(normalizeProduct).filter(Boolean)
  }

  const fetchMaterials = async (tk) => {
    const requestUrl = `${apiBase}/Products/raw`
    const response = await fetchWithTimeout(requestUrl, {
      method: 'GET',
      headers: {
        accept: '*/*',
        Authorization: `Bearer ${tk}`,
      },
    })

    const { json: data, text: rawText } = await readResponsePayload(response)
    logRecipesApi({
      stage: 'load-materials',
      method: 'GET',
      url: requestUrl,
      status: response.status,
      data,
      rawText,
    })

    if (!response.ok) {
      throw new Error(resolveApiErrorMessage(data, 'Không thể tải danh sách nguyên liệu.'))
    }

    return parseArrayData(data).map(normalizeProduct).filter(Boolean)
  }

  const fetchRecipesByParentsResilient = async (tk, parentProducts) => {
    if (!Array.isArray(parentProducts) || parentProducts.length === 0) {
      return { rows: [], failedParents: [] }
    }

    const requests = parentProducts.map(async (product) => {
      const parentId = Number(product?.id)
      const requestUrl = `${apiBase}/Recipes/parent/${parentId}`

      try {
        const response = await fetchWithTimeout(requestUrl, {
          method: 'GET',
          headers: {
            accept: '*/*',
            Authorization: `Bearer ${tk}`,
          },
        })

        const { json: data, text: rawText } = await readResponsePayload(response)
        logRecipesApi({
          stage: 'load-recipes-parent-fallback',
          method: 'GET',
          url: requestUrl,
          status: response.status,
          data,
          rawText,
        })

        if (!response.ok) {
          if (response.status === 404) {
            return { rows: [], failed: null }
          }

          return {
            rows: [],
            failed: {
              parentId,
              status: response.status,
              message: resolveApiErrorMessage(data, `Không thể tải công thức cho thành phẩm ${parentId}.`),
            },
          }
        }

        return {
          rows: parseArrayData(data).map(normalizeRecipe).filter(Boolean),
          failed: null,
        }
      } catch (requestError) {
        return {
          rows: [],
          failed: {
            parentId,
            status: 0,
            message: requestError?.message || `Không thể tải công thức cho thành phẩm ${parentId}.`,
          },
        }
      }
    })

    const settled = await Promise.all(requests)
    const rows = settled.flatMap((item) => item.rows)
    const failedParents = settled
      .filter((item) => item.failed)
      .map((item) => item.failed)

    return { rows, failedParents }
  }

  const loadAllData = async () => {
    const tk = getToken()
    if (!tk) {
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      setProducts([])
      setMaterials([])
      setRecipes([])
      return
    }

    setLoading(true)
    clearNotice()
    try {
      const [fetchedProducts, fetchedMaterials] = await Promise.all([
        fetchProducts(tk),
        fetchMaterials(tk),
      ])

      setProducts(fetchedProducts)
      setMaterials(fetchedMaterials)

      const fallbackResult = await fetchRecipesByParentsResilient(tk, fetchedProducts)
      if (fallbackResult.rows.length > 0) {
        setRecipes(fallbackResult.rows)
        setRecipesReadUnavailable(false)
      } else {
        setRecipes([])
      }

      if (fallbackResult.failedParents.length > 0) {
        const sample = fallbackResult.failedParents.slice(0, 3).map((item) => `${item.parentId}`).join(', ')
        const firstMessage = fallbackResult.failedParents[0]?.message || ''

        if (fallbackResult.rows.length === 0 && isRecipesSchemaMismatch(firstMessage)) {
          setRecipesReadUnavailable(true)
          setError('Danh sách công thức đang tạm gián đoạn. Vui lòng thử lại sau.')
        } else if (fallbackResult.rows.length === 0) {
          setRecipesReadUnavailable(true)
          setError('Hiện chưa thể tải danh sách công thức. Vui lòng thử lại sau.')
        } else {
          setRecipesReadUnavailable(false)
          setError('Đã tải được một phần công thức. Bạn có thể làm mới lại để đồng bộ thêm dữ liệu.')
        }
      } else if (fallbackResult.rows.length === 0) {
        setRecipesReadUnavailable(false)
      } else {
        setRecipesReadUnavailable(false)
      }
    } catch (requestError) {
      setError(toUiNoticeMessage(requestError.message, 'Không thể tải dữ liệu công thức.'))
    } finally {
      setLoading(false)
    }
  }

  const filteredRecipes = useMemo(() => {
    let result = recipes

    if (filterProductId) {
      result = result.filter((row) => row.parentProductId === Number(filterProductId))
    }

    const keyword = searchText.trim().toLowerCase()
    if (keyword) {
      result = result.filter((row) => {
        const parentName = getProductName(row.parentProductId).toLowerCase()
        const materialName = getProductName(row.materialId).toLowerCase()
        return parentName.includes(keyword) || materialName.includes(keyword)
      })
    }

    return result
  }, [recipes, filterProductId, searchText, products, materials])

  const groupedRecipes = useMemo(() => {
    const groups = new Map()

    filteredRecipes.forEach((row) => {
      const key = Number(row.parentProductId)
      if (!groups.has(key)) {
        groups.set(key, {
          parentProductId: key,
          parentProductName: getProductName(key),
          lines: [],
        })
      }

      groups.get(key).lines.push(row)
    })

    return Array.from(groups.values()).sort((a, b) => a.parentProductName.localeCompare(b.parentProductName, 'vi'))
  }, [filteredRecipes, products, materials])

  useEffect(() => {
    if (groupedRecipes.length === 0) {
      setExpandedParentProductId(null)
      return
    }

    const hasExpanded = groupedRecipes.some((group) => Number(group.parentProductId) === Number(expandedParentProductId))
    if (!hasExpanded) {
      setExpandedParentProductId(null)
    }
  }, [groupedRecipes, expandedParentProductId])

  const stats = useMemo(() => {
    return {
      totalLines: recipes.length,
      parentProducts: new Set(recipes.map((r) => r.parentProductId)).size,
      uniqueMaterials: new Set(recipes.map((r) => r.materialId)).size,
    }
  }, [recipes])

  const statsItems = useMemo(() => ([
    {
      key: 'recipe-total-lines',
      label: 'Tổng dòng công thức',
      value: Number(stats.totalLines || 0).toLocaleString('vi-VN'),
      icon: 'rule_settings',
      tone: 'blue',
    },
    {
      key: 'recipe-parent-products',
      label: 'Sản phẩm có công thức',
      value: Number(stats.parentProducts || 0).toLocaleString('vi-VN'),
      icon: 'inventory_2',
      tone: 'green',
    },
    {
      key: 'recipe-materials',
      label: 'Nguyên liệu sử dụng',
      value: Number(stats.uniqueMaterials || 0).toLocaleString('vi-VN'),
      icon: 'grocery',
      tone: 'amber',
    },
  ]), [stats])

  const openCreateModal = () => {
    clearNotice()
    setCreateParentProductId(filterProductId || (products[0] ? String(products[0].id) : ''))
    setCreateMaterials([blankMaterialLine()])
    setShowCreateModal(true)
  }

  const addCreateMaterialLine = () => {
    setCreateMaterials((current) => [...current, blankMaterialLine()])
  }

  const removeCreateMaterialLine = (index) => {
    setCreateMaterials((current) => {
      if (current.length === 1) return current
      return current.filter((_, idx) => idx !== index)
    })
  }

  const updateCreateMaterialLine = (index, key, value) => {
    setCreateMaterials((current) =>
      current.map((line, idx) => (idx === index ? { ...line, [key]: value } : line)),
    )
  }

  const submitCreateBulkRecipe = async (event) => {
    event.preventDefault()

    const tk = getToken()
    if (!tk) {
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const parentProductId = Number(createParentProductId)
    if (!parentProductId || parentProductId < 1) {
      setError('Vui lòng chọn sản phẩm thành phẩm hợp lệ.')
      return
    }

    let materialsPayload = []
    try {
      materialsPayload = createMaterials.map((line, index) => {
        const materialId = Number(line.materialId)
        const quantityRequired = Number(line.quantityRequired)
        const maxWastePercent = Number(line.maxWastePercent)

        if (!materialId || materialId < 1) {
          throw new Error(`Dòng ${index + 1}: Vui lòng chọn nguyên liệu hợp lệ.`)
        }

        if (materialId === parentProductId) {
          throw new Error(`Dòng ${index + 1}: Nguyên liệu không được trùng với thành phẩm.`)
        }

        if (!Number.isFinite(quantityRequired) || quantityRequired <= 0) {
          throw new Error(`Dòng ${index + 1}: Định mức phải lớn hơn 0.`)
        }

        if (!Number.isFinite(maxWastePercent) || maxWastePercent < 0 || maxWastePercent >= 100) {
          throw new Error(`Dòng ${index + 1}: Hao hụt tối đa phải trong khoảng 0 đến dưới 100%.`)
        }

        return {
          materialId,
          quantityRequired,
          maxWastePercent,
        }
      })
    } catch (validationError) {
      setError(validationError.message || 'Dữ liệu dòng nguyên liệu không hợp lệ.')
      return
    }

    if (materialsPayload.length === 0) {
      setError('Vui lòng nhập ít nhất một dòng nguyên liệu hợp lệ.')
      return
    }

    const duplicateSet = new Set()
    for (let index = 0; index < materialsPayload.length; index += 1) {
      const key = String(materialsPayload[index].materialId)
      if (duplicateSet.has(key)) {
        setError(`Dòng ${index + 1}: Nguyên liệu bị trùng trong danh sách tạo công thức.`)
        return
      }
      duplicateSet.add(key)
    }

    const localExistingMaterialSet = new Set(
      recipes
        .filter((row) => Number(row.parentProductId) === parentProductId)
        .map((row) => Number(row.materialId)),
    )

    const existingMaterialSet = new Set([...localExistingMaterialSet])
    const duplicatedExisting = materialsPayload.find((line) => existingMaterialSet.has(Number(line.materialId)))
    if (duplicatedExisting) {
      setError(`Nguyên liệu ${getProductName(duplicatedExisting.materialId)} đã tồn tại trong công thức của thành phẩm này.`)
      return
    }

    setSubmitting(true)
    clearNotice()
    try {
      const createResult = await createBulkRecipesWithRetry(apiBase, tk, parentProductId, materialsPayload)
      if (!createResult.ok) {
        let finalError = createResult.errorMessage || 'Không thể tạo công thức.'

        if (isEntitySaveError(finalError)) {
          const conflictNames = materialsPayload
            .filter((line) => existingMaterialSet.has(Number(line.materialId)))
            .map((line) => getProductName(line.materialId))

          if (conflictNames.length > 0) {
            finalError = `Công thức đã có sẵn nguyên liệu: ${conflictNames.join(', ')}. Vui lòng sửa dòng cũ thay vì thêm mới.`
          } else {
            finalError = 'Không thể lưu công thức lúc này. Vui lòng kiểm tra dữ liệu và thử lại.'
          }
        }

        if (recipesReadUnavailable && isRecipesSchemaMismatch(finalError)) {
          finalError = 'Không thể tạo công thức lúc này. Vui lòng thử lại sau.'
        }

        if (recipesReadUnavailable && /đã tồn tại trong công thức/i.test(finalError)) {
          finalError = `${finalError} Vui lòng làm mới danh sách công thức để kiểm tra lại dữ liệu.`
        }

        throw new Error(finalError)
      }

      const successMessage = createResult.data?.message || `Lưu công thức thành công (${materialsPayload.length} dòng).`
      setSuccess(successMessage)
      setShowCreateModal(false)
      await loadAllData()
    } catch (requestError) {
      setError(toUiNoticeMessage(requestError.message, 'Tạo công thức thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (row) => {
    clearNotice()
    setEditRecipeId(String(row.recipeId))
    setEditMaterialId(String(row.materialId))
    setEditQuantityRequired(String(row.quantityRequired))
    setEditMaxWastePercent(String(row.maxWastePercent ?? 0))
    setShowEditModal(true)
  }

  const submitUpdateRecipeLine = async (event) => {
    event.preventDefault()

    const tk = getToken()
    if (!tk) {
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const recipeId = Number(editRecipeId)
    const materialId = Number(editMaterialId)
    const quantityRequired = Number(editQuantityRequired)
    const maxWastePercent = Number(editMaxWastePercent)

    if (!recipeId || recipeId < 1) {
      setError('Recipe ID không hợp lệ.')
      return
    }

    if (!materialId || materialId < 1 || !Number.isFinite(quantityRequired) || quantityRequired <= 0) {
      setError('Vui lòng nhập material và quantityRequired hợp lệ.')
      return
    }

    if (!Number.isFinite(maxWastePercent) || maxWastePercent < 0 || maxWastePercent >= 100) {
      setError('Hao hụt tối đa phải trong khoảng từ 0 đến dưới 100%.')
      return
    }

    setSubmitting(true)
    clearNotice()
    try {
      const payload = { materialId, quantityRequired, maxWastePercent }
      const requestUrl = `${apiBase}/Recipes/${recipeId}`

      const response = await fetchWithTimeout(requestUrl, {
        method: 'PUT',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const { json: data, text: rawText } = await readResponsePayload(response)
      logRecipesApi({
        stage: 'update-recipe',
        method: 'PUT',
        url: requestUrl,
        payload,
        status: response.status,
        data,
        rawText,
        attempt: 1,
        totalAttempts: 1,
      })

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(data, 'Không thể cập nhật dòng công thức.'))
      }

      setSuccess(data?.message || 'Cập nhật dòng công thức thành công.')
      setShowEditModal(false)
      await loadAllData()
    } catch (requestError) {
      setError(toUiNoticeMessage(requestError.message, 'Cập nhật công thức thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteLine = async (recipeId) => {
    if (!window.confirm('Xóa dòng công thức này?')) return

    const tk = getToken()
    if (!tk) {
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setDeletingId(recipeId)
    clearNotice()
    try {
      const requestUrl = `${apiBase}/Recipes/${recipeId}`
      const response = await fetchWithTimeout(requestUrl, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${tk}`,
        },
      })

      const { json: data, text: rawText } = await readResponsePayload(response)
      logRecipesApi({
        stage: 'delete-recipe',
        method: 'DELETE',
        url: requestUrl,
        status: response.status,
        data,
        rawText,
      })

      if (!response.ok) {
        throw new Error(data?.message || data?.title || 'Không thể xóa dòng công thức.')
      }

      setSuccess(data?.message || 'Đã xóa dòng công thức thành công.')
      await loadAllData()
    } catch (requestError) {
      setError(toUiNoticeMessage(requestError.message, 'Xóa dòng công thức thất bại.'))
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (didInitialLoadRef.current) return
    didInitialLoadRef.current = true
    loadAllData()
  }, [])

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">menu_book</span>
          <h2 className="text-lg font-bold leading-tight">Quản lý công thức</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading || submitting}
            className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            onClick={openCreateModal}
            disabled={submitting || products.length === 0}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            + Tạo công thức
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Công thức theo sản phẩm</h1>
        </div>

        <MetricsStrip items={statsItems} columns="sm:grid-cols-3" />

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Lọc theo sản phẩm</span>
              <select
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
              >
                <option value="">-- Tất cả --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tìm kiếm</span>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Tên sản phẩm hoặc nguyên liệu"
              />
            </label>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Đang tải dữ liệu công thức...</div>
          ) : groupedRecipes.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Chưa có dòng công thức phù hợp.</div>
          ) : (
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">STT</th>
                  <th className="w-[36%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Nguyên liệu</th>
                  <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Định mức cho 1 sản phẩm</th>
                  <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Hao hụt tối đa (%)</th>
                  <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn vị</th>
                  <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {groupedRecipes.flatMap((group) => ([
                  <tr key={`group-${group.parentProductId}`} className="bg-slate-100/80 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-700">
                    <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <button
                        type="button"
                        onClick={() => setExpandedParentProductId((prev) => (Number(prev) === Number(group.parentProductId) ? null : group.parentProductId))}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="min-w-0 inline-flex items-center gap-2 whitespace-nowrap">
                          <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-300">
                            {Number(expandedParentProductId) === Number(group.parentProductId) ? 'expand_more' : 'chevron_right'}
                          </span>
                          <span className="truncate">Công thức: {group.parentProductName}</span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{group.lines.length} nguyên liệu</span>
                      </button>
                    </td>
                  </tr>,
                  ...(Number(expandedParentProductId) === Number(group.parentProductId)
                    ? group.lines.map((row, index) => (
                      <tr key={`line-${row.recipeId}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold">{index + 1}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium">{getProductName(row.materialId)}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{row.quantityRequired}</td>
                        <td className="px-4 py-3 text-sm">{row.maxWastePercent ?? 0}%</td>
                        <td className="px-4 py-3 text-sm">{getMaterialUnit(row.materialId)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(row)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                              title="Sửa dòng công thức"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteLine(row.recipeId)}
                              disabled={deletingId === row.recipeId}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                              title="Xóa dòng công thức"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    : []),
                ]))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold">Tạo công thức theo nhiều nguyên liệu</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                disabled={submitting}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={submitCreateBulkRecipe} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sản phẩm thành phẩm</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                  value={createParentProductId}
                  onChange={(e) => setCreateParentProductId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Danh sách nguyên liệu</p>
                {createMaterials.map((line, index) => (
                  <div key={`line-${index}`} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <label className="block h-5 text-xs text-slate-500 dark:text-slate-400 mb-1">Nguyên liệu</label>
                      <select
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                        value={line.materialId}
                        onChange={(e) => updateCreateMaterialLine(index, 'materialId', e.target.value)}
                        required
                      >
                        <option value="">-- Chọn nguyên liệu --</option>
                        {materials.map((material) => (
                          <option key={`material-${material.id}`} value={material.id}>{material.name}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-transparent select-none">_</p>
                    </div>
                    <div className="col-span-3">
                      <label className="block h-5 text-xs text-slate-500 dark:text-slate-400 mb-1">Định mức cho 1 sản phẩm</label>
                      <input
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={line.quantityRequired}
                        onChange={(e) => updateCreateMaterialLine(index, 'quantityRequired', e.target.value)}
                        required
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Đơn vị: {getMaterialUnit(line.materialId)}</p>
                    </div>
                    <div className="col-span-3">
                      <label className="block h-5 text-xs text-slate-500 dark:text-slate-400 mb-1">Hao hụt tối đa (%)</label>
                      <input
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                        type="number"
                        min="0"
                        max="99.99"
                        step="0.01"
                        value={line.maxWastePercent}
                        onChange={(e) => updateCreateMaterialLine(index, 'maxWastePercent', e.target.value)}
                        required
                      />
                      <p className="mt-1 text-xs text-transparent select-none">_</p>
                    </div>
                    <div className="col-span-1 flex justify-end pt-6">
                      <button
                        type="button"
                        onClick={() => removeCreateMaterialLine(index)}
                        disabled={createMaterials.length === 1}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                        title="Xóa dòng"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCreateMaterialLine}
                  className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  + Thêm dòng nguyên liệu
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu công thức'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  disabled={submitting}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold">Sửa dòng công thức</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                disabled={submitting}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={submitUpdateRecipeLine} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nguyên liệu</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                  value={editMaterialId}
                  onChange={(e) => setEditMaterialId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn nguyên liệu --</option>
                  {materials.map((material) => (
                    <option key={`edit-material-${material.id}`} value={material.id}>{material.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Định mức cho 1 sản phẩm</label>
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={editQuantityRequired}
                  onChange={(e) => setEditQuantityRequired(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Đơn vị: {getMaterialUnit(editMaterialId)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hao hụt tối đa (%)</label>
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.01"
                  value={editMaxWastePercent}
                  onChange={(e) => setEditMaxWastePercent(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Đang cập nhật...' : 'Lưu cập nhật'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  disabled={submitting}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
