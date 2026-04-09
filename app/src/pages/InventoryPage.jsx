import { useEffect, useMemo, useState } from 'react'
import { MetricsStrip } from '../components/ui'

function parseArrayData(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function readApiErrorMessage(data, fallback) {
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (!data || typeof data !== 'object') return fallback

  if (typeof data.message === 'string' && data.message.trim()) return data.message
  if (typeof data.title === 'string' && data.title.trim()) return data.title
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail

  const firstError = Object.values(data.errors || {}).find((value) => Array.isArray(value) && value.length)
  if (firstError && firstError[0]) return String(firstError[0])

  return fallback
}

function normalizeSupplierActive(value) {
  if (value === undefined || value === null || value === '') return true
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0

  const normalized = String(value).trim().toUpperCase()
  if (['FALSE', '0', 'INACTIVE', 'DISABLED', 'BLACKLIST', 'BANNED', 'BLOCKED', 'NGUNG_HOAT_DONG', 'NGỪNG_HOẠT_ĐỘNG'].includes(normalized)) return false
  if (['TRUE', '1', 'ACTIVE', 'ENABLED', 'HOAT_DONG', 'HOẠT_ĐỘNG'].includes(normalized)) return true
  return true
}

function parseUserNumber(value) {
  if (typeof value === 'number') return value
  const normalized = String(value ?? '').trim().replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

function normalizeImportPayload(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    productId: Number(raw.productId ?? raw.ProductId),
    quantity: Number(raw.quantity ?? raw.Quantity),
    supplierId: Number(raw.supplierId ?? raw.SupplierId),
  }
}

function isSameImportPayload(requestPayload, debugPayload) {
  const requestNormalized = normalizeImportPayload(requestPayload)
  const debugNormalized = normalizeImportPayload(debugPayload)
  if (!requestNormalized || !debugNormalized) return false

  return requestNormalized.productId === debugNormalized.productId
    && requestNormalized.supplierId === debugNormalized.supplierId
    && requestNormalized.quantity === debugNormalized.quantity
}

function withTraceId(message, traceId) {
  const normalizedTrace = String(traceId || '').trim()
  if (!normalizedTrace) return message
  return `${message} (traceId: ${normalizedTrace})`
}

function resolveImportErrorMessage(data, requestPayload) {
  const rawError = readApiErrorMessage(data, 'Nhập kho thất bại.')
  const normalized = String(rawError || '').toLowerCase()
  const errorCode = String(data?.errorCode || '').trim().toUpperCase()
  const traceId = data?.traceId
  const debugPayload = data?.debugPayload
  const hasDebugPayload = Boolean(debugPayload && typeof debugPayload === 'object')
  const payloadMatched = hasDebugPayload && isSameImportPayload(requestPayload, debugPayload)

  if (hasDebugPayload && !payloadMatched) {
    return withTraceId('Dữ liệu API nhận được không khớp dữ liệu FE gửi. Vui lòng thử lại và kiểm tra request payload.', traceId)
  }

  if (errorCode === 'INV_IMPORT_LOG_FIELD_TOO_LONG') {
    return withTraceId('Hệ thống đang lỗi độ dài dữ liệu log khi nhập kho. Vui lòng gửi traceId cho backend để kiểm tra.', traceId)
  }

  if (errorCode === 'INV_IMPORT_DUPLICATE_INVENTORY') {
    return withTraceId('Dữ liệu tồn kho bị trùng khóa. Vui lòng gửi traceId cho backend để xử lý dữ liệu hệ thống.', traceId)
  }

  if (errorCode === 'INV_IMPORT_SUPPLIER_FK_FAILED') {
    return withTraceId('Nhà cung cấp không hợp lệ trong hệ thống. Vui lòng chọn nhà cung cấp khác.', traceId)
  }

  if (errorCode === 'INV_IMPORT_PRODUCT_FK_FAILED') {
    return withTraceId('Nguyên liệu không hợp lệ trong hệ thống. Vui lòng chọn nguyên liệu khác.', traceId)
  }

  if (errorCode === 'INV_IMPORT_SAVE_FAILED') {
    return withTraceId('Không thể nhập kho lúc này do lỗi lưu dữ liệu hệ thống. Vui lòng gửi traceId cho backend kiểm tra.', traceId)
  }

  if (errorCode === 'INV_IMPORT_BUSINESS_ERROR') {
    if (normalized.includes('blacklist') || normalized.includes('ngừng hoạt động')) {
      return withTraceId('Nhà cung cấp đã ngừng hoạt động. Vui lòng chọn nhà cung cấp khác.', traceId)
    }
    if (normalized.includes('raw')) {
      return withTraceId('Chỉ có thể nhập kho cho nhóm nguyên liệu thô (RAW).', traceId)
    }
    if (normalized.includes('không tìm thấy sản phẩm')) {
      return withTraceId('Sản phẩm không còn tồn tại. Vui lòng chọn lại.', traceId)
    }
    if (normalized.includes('không tìm thấy nhà cung cấp')) {
      return withTraceId('Nhà cung cấp không còn tồn tại. Vui lòng chọn lại.', traceId)
    }
    if (normalized.includes('số lượng') || normalized.includes('so luong')) {
      return withTraceId('Số lượng nhập kho phải lớn hơn 0.', traceId)
    }
    return withTraceId(rawError, traceId)
  }

  if (normalized.includes('saving the entity changes') || normalized.includes('inner exception')) {
    const hasStructuredError = Boolean(errorCode || traceId)
    if (payloadMatched) {
      return withTraceId(
        hasStructuredError
          ? 'Dữ liệu nhập kho đã hợp lệ nhưng hệ thống đang lỗi lưu dữ liệu. Vui lòng gửi traceId cho backend kiểm tra DB.'
          : 'Dữ liệu nhập kho đã hợp lệ nhưng hệ thống đang lỗi lưu dữ liệu. API hiện chưa trả errorCode/traceId để truy vết nhanh.',
        traceId,
      )
    }
    return withTraceId(
      hasStructuredError
        ? 'Không thể nhập kho lúc này do lỗi lưu dữ liệu hệ thống. Vui lòng thử lại sau.'
        : 'Không thể nhập kho lúc này do lỗi lưu dữ liệu hệ thống. API hiện chưa trả errorCode/traceId để truy vết nhanh.',
      traceId,
    )
  }

  if (normalized.includes('blacklist') || normalized.includes('ngừng hoạt động')) {
    return withTraceId('Nhà cung cấp đã ngừng hoạt động. Vui lòng chọn nhà cung cấp khác.', traceId)
  }
  if (normalized.includes('raw')) {
    return withTraceId('Chỉ có thể nhập kho cho nhóm nguyên liệu thô (RAW).', traceId)
  }
  if (normalized.includes('không tìm thấy sản phẩm')) {
    return withTraceId('Sản phẩm không còn tồn tại. Vui lòng chọn lại.', traceId)
  }
  if (normalized.includes('không tìm thấy nhà cung cấp')) {
    return withTraceId('Nhà cung cấp không còn tồn tại. Vui lòng chọn lại.', traceId)
  }

  return withTraceId(rawError, traceId)
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

function toShortDate(dateString) {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return String(dateString)
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function normalizeLocationLabel(locationType, locationId) {
  const type = String(locationType || '').trim().toUpperCase()
  const id = Number(locationId || 0)

  if (type === 'STORE') return `Kho cửa hàng ${id > 0 ? `#${id}` : ''}`.trim()
  if (type === 'KITCHEN') return `Kho bếp trung tâm ${id > 0 ? `#${id}` : ''}`.trim()
  return 'Kho hệ thống'
}

export default function InventoryPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [activeTab, setActiveTab] = useState('stock')
  const [stock, setStock] = useState([])
  const [logs, setLogs] = useState([])
  const [expiryTracking, setExpiryTracking] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Expired scan states
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState(null)
  const [expiredItems, setExpiredItems] = useState([])
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [selectedExpiredItem, setSelectedExpiredItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // Expiry tracking modal states
  const [showExpiryDetailModal, setShowExpiryDetailModal] = useState(false)
  const [selectedExpiryItem, setSelectedExpiryItem] = useState(null)
  const [expiryDetailLoading, setExpiryDetailLoading] = useState(false)

  // Import ingredient states
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [rawProducts, setRawProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [importForm, setImportForm] = useState({
    productId: '',
    quantity: '1',
    supplierId: '',
  })

  const isAnyModalOpen = showExpiredModal || showDetailModal || showExpiryDetailModal || showImportModal

  useEffect(() => {
    if (!isAnyModalOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isAnyModalOpen])


  const fetchStock = async () => {
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      // Fetch all products first to get correct names
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm chưa có tên`
        })
      }

      const response = await fetch(`${apiBase}/Inventory/stock`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        setStock([])
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        setStock([])
        return
      }

      const normalized = data
        .filter((item) => String(item?.locationType || '').toUpperCase() !== 'STORE')
        .map((item) => {
          const productName = productMap[item.productId] || item.product?.productName || item.product?.name || item.productName || `Sản phẩm chưa có tên`
          const location = item.location || item.locationName || 'Bếp trung tâm #1'
          const quantity = Number(item.currentQuantity || item.quantity || 0)

          return {
            id: item.inventoryId || item.stockId || item.productId,
            productId: item.productId,
            product: productName,
            location,
            quantity,
            unit: item.product?.baseUnit || item.baseUnit || 'unit',
          }
        })

      setStock(normalized)
    } catch {
      setStock([])
    } finally {
      setLoading(false)
    }
  }


  const fetchLogs = async () => {
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      // Fetch all products first to get correct names
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm chưa có tên`
        })
      }

      const response = await fetch(`${apiBase}/Inventory/logs`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        setLogs([])
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        setLogs([])
        return
      }

      const normalized = data.map((item) => {
        const qty = Number(item.changeQuantity || 0)
        const productName = productMap[item.productId] || item.product?.productName || item.product?.name || item.productName || `Sản phẩm chưa có tên`
        const reasonRaw = String(item.reason || '')
        const reasonUpper = reasonRaw.toUpperCase()
        const referenceType = String(item.referenceType || '').toUpperCase()
        const locationType = String(item.locationType || '').toUpperCase()

        // Trang này đang là UI kho bếp: tạm ẩn log kho STORE, sẽ hiển thị ở UI kho store riêng.
        if (locationType === 'STORE') return null

        const locationLabel = normalizeLocationLabel(item.locationType, item.locationId)

        let action = reasonRaw || 'Unknown'
        if (reasonUpper.includes('SẢN XUẤT')) action = 'Trừ nguyên liệu sản xuất'
        if (reasonUpper.includes('NHẬP THÀNH PHẨM')) action = 'Nhập thành phẩm'
        if (reasonUpper.includes('XUẤT GIAO')) action = 'Xuất giao cửa hàng'
        if (reasonUpper.includes('NHẬP NGUYÊN LIỆU') || reasonUpper.includes('NHAP_TU_NHA_CUNG_CAP')) action = 'Nhập nguyên liệu'

        if (referenceType === 'INTERNAL_ORDER') {
          if (locationType === 'STORE' && qty > 0) {
            action = 'Nhận giao từ bếp (kho cửa hàng)'
          } else if (locationType === 'KITCHEN' && qty < 0) {
            action = 'Xuất giao cho cửa hàng'
          }
        }

        let actor = 'Hệ thống'
        if (referenceType === 'PRODUCTION_BATCH' && item.referenceId) {
          actor = `Mẻ SX ${item.referenceId}`
        } else if (referenceType === 'INTERNAL_ORDER' && item.referenceId) {
          actor = `Đơn hàng ${item.referenceId}`
        } else if (item.supplierId) {
          actor = 'Nhà cung cấp'
        }

        const statusLabel = qty >= 0
          ? (locationType === 'STORE' ? 'Nhập kho store' : 'Nhập')
          : (locationType === 'KITCHEN' ? 'Xuất' : 'Xuất')

        return {
          id: item.logId,
          product: productName,
          quantity: qty >= 0 ? `+${qty}` : `${qty}`,
          action,
          actor,
          locationLabel,
          statusLabel,
          date: toReadableDate(item.createdAt),
          type: qty >= 0 ? 'IN' : 'OUT',
        }
      }).filter(Boolean)

      setLogs(normalized)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchExpiryTracking = async () => {
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      // Fetch products để lấy tên sản phẩm
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = {
            name: p.productName || p.name || `Sản phẩm chưa có tên`,
            sku: p.sku || 'N/A'
          }
        })
      }

      // Fetch tất cả mẻ COMPLETED có expDate
      const batchesRes = await fetch(`${apiBase}/ProductionBatches`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const batchesData = batchesRes.ok ? await batchesRes.json() : []

      const completedBatches = (Array.isArray(batchesData) ? batchesData : [])
        .filter((b) => {
          const isCompleted = String(b.status || '').toUpperCase() === 'COMPLETED'
          const hasExpDate = !!b.expDate
          return isCompleted && hasExpDate
        })
        .map((b) => ({
          batchId: b.batchId,
          batchCode: b.batchCode || `BATCH-${b.batchId}`,
          productId: b.productId,
          quantityPlanned: Number(b.quantityPlanned || 0),
          quantityActual: Number(b.quantityActual || 0),
          createdAt: b.createdAt || b.creationTime || b.createdDate || null,
          mfgDate: b.mfgDate || b.createdAt || b.creationTime || b.createdDate || null,
          expDate: b.expDate,
          status: b.status
        }))

      // Ưu tiên mẻ mới tạo lên đầu
      completedBatches.sort((a, b) => new Date(b.createdAt || b.mfgDate || 0) - new Date(a.createdAt || a.mfgDate || 0))

      // Hiển thị TẤT CẢ mẻ COMPLETED có expDate, không cần phân bổ tồn kho
      const result = completedBatches.map((batch) => {
        const productInfo = productMap[batch.productId] || { name: `Sản phẩm chưa có tên`, sku: 'N/A' }
        const now = new Date()
        const expDate = batch.expDate ? new Date(batch.expDate) : null
        let expiryStatus = 'N/A'
        let daysRemaining = null

        if (expDate) {
          const diffTime = expDate - now
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (daysRemaining < 0) {
            expiryStatus = 'Hết hạn'
          } else if (daysRemaining <= 3) {
            expiryStatus = 'Sắp hết hạn'
          } else if (daysRemaining <= 7) {
            expiryStatus = 'Cảnh báo'
          } else {
            expiryStatus = 'Còn hạn'
          }
        }

        return {
          batchId: batch.batchId,
          batchCode: batch.batchCode,
          productId: batch.productId,
          productName: productInfo.name,
          sku: productInfo.sku,
          quantity: batch.quantityActual, // Hiển thị số lượng thực tế của mẻ
          quantityPlanned: batch.quantityPlanned,
          quantityActual: batch.quantityActual,
          createdAt: batch.createdAt,
          mfgDate: batch.mfgDate,
          expDate: batch.expDate,
          expiryStatus,
          daysRemaining
        }
      })
      setExpiryTracking(result)
    } catch (error) {
      console.error('Error fetching expiry tracking:', error)
      setExpiryTracking([])
    } finally {
      setLoading(false)
    }
  }


  const handleScanExpired = async () => {
    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập để thực hiện chức năng này' })
      return
    }

    setScanning(true)
    setMessage(null)
    setExpiredItems([])

    try {
      // Fetch all products
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm chưa có tên`
        })
      }

      // Fetch all batches
      const batchesRes = await fetch(`${apiBase}/ProductionBatches`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!batchesRes.ok) {
        setMessage({ type: 'error', text: 'Không thể tải dữ liệu mẻ sản xuất' })
        return
      }

      const batchesData = await batchesRes.json()

      if (!Array.isArray(batchesData)) {
        setMessage({ type: 'error', text: 'Dữ liệu mẻ sản xuất không hợp lệ' })
        return
      }

      // Filter completed batches with expDate
      const completedBatches = batchesData.filter(
        (b) => b.status === 'COMPLETED' && b.expDate
      )

      // Ưu tiên mẻ mới tạo lên đầu
      completedBatches.sort((a, b) => new Date(b.createdAt || b.mfgDate || 0) - new Date(a.createdAt || a.mfgDate || 0))

      const now = new Date()
      const expired = []

      for (const batch of completedBatches) {
        const expDate = new Date(batch.expDate)
        if (expDate < now) {
          const productName = productMap[batch.productId] || `Sản phẩm chưa có tên`
          expired.push({
            batchId: batch.batchId,
            batchCode: batch.batchCode,
            productId: batch.productId,
            productName,
            expiredQuantity: batch.actualQuantity || batch.plannedQuantity || 0,
            createdAt: batch.createdAt || batch.creationTime || batch.createdDate || null,
            mfgDate: batch.mfgDate,
            expDate: batch.expDate,
          })
        }
      }

      if (expired.length === 0) {
        setMessage({ type: 'success', text: 'Không tìm thấy sản phẩm hết hạn sử dụng' })
      } else {
        setExpiredItems(expired)
        setShowExpiredModal(true)
        setMessage({ type: 'success', text: `Tìm thấy ${expired.length} sản phẩm hết hạn sử dụng` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi khi quét hàng hết hạn: ' + error.message })
    } finally {
      setScanning(false)
    }
  }

  const handleViewExpiredDetail = async (item) => {
    const tk = getToken()
    if (!tk) return

    setSelectedExpiredItem(item)
    setShowDetailModal(true)
    setDetailLoading(true)

    try {
      // Fetch all products
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm chưa có tên`
        })
      }

      // Fetch batch details
      const batchRes = await fetch(`${apiBase}/ProductionBatches/${item.batchId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!batchRes.ok) {
        setDetailLoading(false)
        return
      }

      const batchData = await batchRes.json()

      // Fetch recipe/BOM
      const recipeRes = await fetch(`${apiBase}/Recipes/parent/${item.productId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      let recipeData = null
      if (recipeRes.ok) {
        const recipeJson = await recipeRes.json().catch(() => [])
        const recipeRows = parseArrayData(recipeJson)
        const materials = recipeRows.map((row) => ({
          materialId: row.materialId,
          materialName: row.materialName || productMap[row.materialId] || 'Nguyên liệu chưa có tên',
          quantityRequired: Number(row.quantityRequired || 0),
          maxWastePercent: Number(row.maxWastePercent ?? row.wasteAllowancePercent ?? 0),
        }))
        recipeData = { materials }
      }

      // Enrich batch data
      const enrichedBatch = {
        ...batchData,
        productName: productMap[batchData.productId] || `Sản phẩm chưa có tên`,
        recipe: recipeData,
      }

      setSelectedExpiredItem(enrichedBatch)
    } catch (error) {
      console.error('Error fetching batch details:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshData = () => {
    setCurrentPage(1)
    if (activeTab === 'stock') {
      fetchStock()
    } else if (activeTab === 'logs') {
      fetchLogs()
    } else if (activeTab === 'expiry') {
      fetchExpiryTracking()
    }
  }

  const handleViewExpiryDetail = async (item) => {
    const tk = getToken()
    if (!tk) return

    setSelectedExpiryItem(item)
    setShowExpiryDetailModal(true)
    setExpiryDetailLoading(true)

    try {
      const batchRes = await fetch(`${apiBase}/ProductionBatches/${item.batchId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (batchRes.ok) {
        const batchData = await batchRes.json()
        setSelectedExpiryItem({
          ...item,
          ...batchData,
          createdAt: batchData?.createdAt || batchData?.creationTime || batchData?.createdDate || item?.createdAt || null,
          mfgDate: batchData?.mfgDate || item?.mfgDate || batchData?.createdAt || null,
        })
      }
    } catch (error) {
      console.error('Error fetching batch details:', error)
    } finally {
      setExpiryDetailLoading(false)
    }
  }

  const fetchRawProductsAndSuppliers = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const [productsRes, suppliersRes] = await Promise.all([
        fetch(`${apiBase}/Products/raw`, {
          headers: { Authorization: `Bearer ${tk}` },
        }),
        fetch(`${apiBase}/Suppliers`, {
          headers: { Authorization: `Bearer ${tk}` },
        }),
      ])

      if (productsRes.ok) {
        const data = await productsRes.json().catch(() => [])
        const normalized = parseArrayData(data)
          .map((p) => ({
            id: p.productId || p.id,
            name: p.productName || p.name || `Sản phẩm chưa có tên`,
            productType: String(p.productType || '').toUpperCase(),
          }))
          .filter((item) => Number(item.id) > 0)
          .filter((item) => !item.productType || item.productType === 'RAW')
        setRawProducts(normalized)

        if (normalized.length > 0 && !importForm.productId) {
          setImportForm((prev) => ({ ...prev, productId: String(normalized[0].id) }))
        }
      } else {
        setRawProducts([])
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json().catch(() => [])
        const normalized = parseArrayData(data)
          .map((s) => ({
            id: s.supplierId || s.id,
            name: s.supplierName || s.name || 'Nhà cung cấp chưa có tên',
            isActive: normalizeSupplierActive(s.isActive ?? s.active ?? s.is_active ?? s.status),
          }))
          .filter((s) => Number(s.id) > 0)

        const activeSuppliers = normalized.filter((s) => s.isActive)
        setSuppliers(activeSuppliers)

        if (activeSuppliers.length > 0 && !importForm.supplierId) {
          setImportForm((prev) => ({ ...prev, supplierId: String(activeSuppliers[0].id) }))
        }

        if (normalized.length > 0 && activeSuppliers.length === 0) {
          setImportError('Hiện không có nhà cung cấp đang hoạt động để nhập kho.')
        }
      } else {
        setSuppliers([])
      }
    } catch (error) {
      console.error('Error fetching raw products/suppliers:', error)
      setImportError('Không tải được dữ liệu nhập kho. Vui lòng thử lại.')
    }
  }

  const openImportModal = () => {
    setShowImportModal(true)
    setImportError('')
    fetchRawProductsAndSuppliers()
  }

  const closeImportModal = () => {
    if (importing) return
    setShowImportModal(false)
    setImportError('')
  }

  const handleImportSubmit = async (e) => {
    e.preventDefault()
    setImportError('')

    const tk = getToken()
    if (!tk) {
      setImportError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const productId = parseUserNumber(importForm.productId)
    const supplierId = parseUserNumber(importForm.supplierId)
    const quantity = parseUserNumber(importForm.quantity)
    const selectedProduct = rawProducts.find((p) => Number(p.id) === productId)
    const selectedSupplier = suppliers.find((s) => Number(s.id) === supplierId)

    if (!Number.isFinite(productId) || productId < 1) {
      setImportError('Vui lòng chọn sản phẩm hợp lệ.')
      return
    }
    if (!Number.isFinite(supplierId) || supplierId < 1) {
      setImportError('Vui lòng chọn nhà cung cấp hợp lệ.')
      return
    }
    if (!selectedProduct) {
      setImportError('Sản phẩm không hợp lệ hoặc không thuộc nhóm nguyên liệu thô (RAW).')
      return
    }
    if (!selectedSupplier) {
      setImportError('Nhà cung cấp không hợp lệ hoặc đã ngừng hoạt động.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setImportError('Số lượng nhập phải lớn hơn 0.')
      return
    }

    setImporting(true)
    try {
      const requestPayload = {
        productId: Number(productId),
        quantity: Number(quantity),
        supplierId: Number(supplierId),
      }

      const response = await fetch(`${apiBase}/Inventory/import`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify(requestPayload),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.warn('[InventoryImport] request failed', {
            status: response.status,
            requestPayload,
            responseBody: data,
          })
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('Bạn không có quyền nhập kho. Vui lòng đăng nhập bằng tài khoản ADMIN hoặc MANAGER.')
        }

        throw new Error(resolveImportErrorMessage(data, requestPayload))
      }

      setMessage({ type: 'success', text: data?.message || 'Nhập nguyên liệu thành công.' })
      setShowImportModal(false)
      setImportForm({ productId: '', quantity: '1', supplierId: '' })
      fetchStock()
      fetchLogs()
    } catch (requestError) {
      setImportError(requestError.message || 'Không thể nhập kho.')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    if (activeTab === 'stock') {
      fetchStock()
    } else if (activeTab === 'logs') {
      fetchLogs()
    } else if (activeTab === 'expiry') {
      fetchExpiryTracking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const currentData = activeTab === 'stock' ? stock : activeTab === 'logs' ? logs : expiryTracking
  const totalPages = Math.ceil(currentData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = currentData.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const statsItems = useMemo(() => {
    const lowStockCount = stock.filter((item) => item.status === 'low').length
    const criticalStockCount = stock.filter((item) => item.status === 'critical').length

    return [
      {
        key: 'inventory-total-stock',
        label: 'Mặt hàng tồn kho',
        value: Number(stock.length || 0).toLocaleString('vi-VN'),
        note: 'Số dòng tồn kho hiện tại',
        icon: 'inventory_2',
        tone: 'blue',
      },
      {
        key: 'inventory-low-critical',
        label: 'Cảnh báo tồn kho',
        value: Number(lowStockCount + criticalStockCount).toLocaleString('vi-VN'),
        note: `${lowStockCount} sắp hết • ${criticalStockCount} hết hàng`,
        icon: 'warning',
        tone: criticalStockCount > 0 ? 'red' : 'amber',
      },
      {
        key: 'inventory-logs',
        label: 'Nhật ký tồn kho',
        value: Number(logs.length || 0).toLocaleString('vi-VN'),
        note: 'Tổng giao dịch đã ghi nhận',
        icon: 'receipt_long',
        tone: 'green',
      },
      {
        key: 'inventory-expiry',
        label: 'Theo dõi hạn dùng',
        value: Number(expiryTracking.length || 0).toLocaleString('vi-VN'),
        note: 'Danh sách lô theo hạn sử dụng',
        icon: 'event_busy',
        tone: 'purple',
      },
    ]
  }, [stock, logs, expiryTracking])


  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">inventory</span>
          <h2 className="text-lg font-bold leading-tight">Quản lý tồn kho</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openImportModal}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            Nhập nguyên liệu
          </button>
          <button
            onClick={handleScanExpired}
            disabled={scanning}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            {scanning ? 'Đang quét...' : 'Quét hàng hết hạn'}
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Tồn kho và lịch sử</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi số lượng tồn kho và lịch sử thay đổi.</p>
        </div>

        <MetricsStrip items={statsItems} columns="sm:grid-cols-2 xl:grid-cols-4" />

        {message && (
          <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'stock'
                ? 'border-b-2 border-primary text-primary'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Tồn kho
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'logs'
                ? 'border-b-2 border-primary text-primary'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Lịch sử thay đổi
            </button>
            <button
              onClick={() => setActiveTab('expiry')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'expiry'
                ? 'border-b-2 border-primary text-primary'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Theo dõi hạn sử dụng
            </button>
          </div>
        </div>


        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {activeTab === 'stock' ? (
            stock.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Không có dữ liệu tồn kho</div>
            ) : (
              <>
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="w-[35%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                      <th className="w-[25%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vị trí</th>
                      <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tồn hiện tại</th>
                      <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn vị</th>
                      <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Cảnh báo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{item.product}</td>
                        <td className="px-4 py-3 text-sm">{item.location}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={item.quantity > 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{item.unit}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${item.quantity > 100 ? 'bg-emerald-100 text-emerald-700' : item.quantity > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {item.quantity > 100 ? '●' : item.quantity > 0 ? '●' : '●'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-500">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, stock.length)} trong tổng số {stock.length} mục
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
            )
          ) : activeTab === 'logs' ? (
            logs.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Không có lịch sử thay đổi</div>
            ) : (
              <>
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="w-[25%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                      <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Hành động</th>
                      <th className="w-[15%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Nguồn</th>
                      <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                      <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thời gian</th>
                      <th className="w-[8%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedData.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{log.product}</td>
                        <td className="px-4 py-3 text-sm">{log.action}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{log.actor}</div>
                          <div className="text-xs text-slate-500">{log.locationLabel}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={String(log.quantity).startsWith('+') ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {log.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{log.date}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${String(log.quantity).startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {log.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-500">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, logs.length)} trong tổng số {logs.length} mục
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
            )
          ) : (
            expiryTracking.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Không có dữ liệu theo dõi hạn sử dụng</div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mã mẻ</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">SL</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tạo mẻ</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">HSD</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedData.map((item) => (
                      <tr key={item.batchId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{item.productName}</td>
                        <td className="px-4 py-3 text-sm">{item.batchCode}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-emerald-600 font-semibold">{item.quantityActual}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">{toShortDate(item.createdAt || item.mfgDate)}</td>
                        <td className="px-4 py-3 text-xs font-medium">{toShortDate(item.expDate)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${item.expiryStatus === 'Hết hạn' ? 'bg-red-100 text-red-700' :
                            item.expiryStatus === 'Sắp hết hạn' ? 'bg-orange-100 text-orange-700' :
                              item.expiryStatus === 'Cảnh báo' ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                            }`}>
                            {item.expiryStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleViewExpiryDetail(item)}
                            className="text-primary hover:underline text-sm font-medium"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-500">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, expiryTracking.length)} trong tổng số {expiryTracking.length} mục
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
            )
          )}
        </div>
      </div>


      {/* Expiry Detail Modal */}
      {showExpiryDetailModal && selectedExpiryItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setShowExpiryDetailModal(false)}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Chi tiết mẻ sản xuất {selectedExpiryItem.batchId}</h3>
              <button
                type="button"
                onClick={() => setShowExpiryDetailModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            {expiryDetailLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-slate-500">Đang tải...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedExpiryItem.expiryStatus && selectedExpiryItem.expiryStatus !== 'Còn hạn' && (
                  <div className={`rounded-lg border p-4 ${selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                    selectedExpiryItem.expiryStatus === 'Sắp hết hạn' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
                      'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                    }`}>
                    <div className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-[24px] ${selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'text-red-600' :
                        selectedExpiryItem.expiryStatus === 'Sắp hết hạn' ? 'text-orange-600' :
                          'text-amber-600'
                        }`}>warning</span>
                      <div>
                        <h4 className={`font-semibold ${selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'text-red-800 dark:text-red-400' :
                          selectedExpiryItem.expiryStatus === 'Sắp hết hạn' ? 'text-orange-800 dark:text-orange-400' :
                            'text-amber-800 dark:text-amber-400'
                          }`}>
                          {selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'Cảnh báo hết hạn sử dụng' :
                            selectedExpiryItem.expiryStatus === 'Sắp hết hạn' ? 'Sắp hết hạn sử dụng' :
                              'Cảnh báo gần hết hạn'}
                        </h4>
                        <p className={`text-sm mt-1 ${selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'text-red-700 dark:text-red-300' :
                          selectedExpiryItem.expiryStatus === 'Sắp hết hạn' ? 'text-orange-700 dark:text-orange-300' :
                            'text-amber-700 dark:text-amber-300'
                          }`}>
                          {selectedExpiryItem.daysRemaining !== null && selectedExpiryItem.daysRemaining < 0
                            ? `Đã hết hạn ${Math.abs(selectedExpiryItem.daysRemaining)} ngày`
                            : selectedExpiryItem.daysRemaining !== null
                              ? `Còn ${selectedExpiryItem.daysRemaining} ngày`
                              : 'Vui lòng kiểm tra hạn sử dụng'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">Thông tin sản phẩm</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Tên sản phẩm</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiryItem.productName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Mã SKU</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiryItem.sku || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">Thông tin mẻ sản xuất</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Mã mẻ</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiryItem.batchCode}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">SL kế hoạch</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiryItem.quantityPlanned}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">SL thực tế</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiryItem.quantityActual}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">SL còn lại trong kho</label>
                      <p className="text-sm font-medium mt-1 text-emerald-600">{selectedExpiryItem.quantity}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">Thông tin ngày tháng</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Thời gian tạo mẻ</label>
                      <p className="text-sm font-medium mt-1">{toShortDate(selectedExpiryItem.createdAt || selectedExpiryItem.mfgDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Ngày sản xuất</label>
                      <p className="text-sm font-medium mt-1">{toShortDate(selectedExpiryItem.mfgDate || selectedExpiryItem.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Hạn sử dụng</label>
                      <p className={`text-sm font-medium mt-1 ${selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'text-red-600' :
                        selectedExpiryItem.expiryStatus === 'Sắp hết hạn' ? 'text-orange-600' :
                          selectedExpiryItem.expiryStatus === 'Cảnh báo' ? 'text-amber-600' :
                            'text-emerald-600'
                        }`}>
                        {toShortDate(selectedExpiryItem.expDate)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Số ngày còn lại</label>
                      <p className={`text-sm font-medium mt-1 ${selectedExpiryItem.daysRemaining !== null && selectedExpiryItem.daysRemaining < 0 ? 'text-red-600' :
                        selectedExpiryItem.daysRemaining !== null && selectedExpiryItem.daysRemaining <= 3 ? 'text-orange-600' :
                          selectedExpiryItem.daysRemaining !== null && selectedExpiryItem.daysRemaining <= 7 ? 'text-amber-600' :
                            'text-emerald-600'
                        }`}>
                        {selectedExpiryItem.daysRemaining !== null
                          ? selectedExpiryItem.daysRemaining < 0
                            ? `Quá hạn ${Math.abs(selectedExpiryItem.daysRemaining)} ngày`
                            : `${selectedExpiryItem.daysRemaining} ngày`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Trạng thái</label>
                      <p className="text-sm font-medium mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'bg-red-100 text-red-700' :
                          selectedExpiryItem.expiryStatus === 'Sắp hết hạn' ? 'bg-orange-100 text-orange-700' :
                            selectedExpiryItem.expiryStatus === 'Cảnh báo' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                          }`}>
                          {selectedExpiryItem.expiryStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowExpiryDetailModal(false)}
                className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Expired Items Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold">Danh sách sản phẩm hết hạn</h3>
              <button
                onClick={() => setShowExpiredModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mã mẻ</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">SL hết hạn</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">NSX</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">HSD</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expiredItems.map((item) => (
                    <tr key={item.batchId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm">{item.batchCode}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">{item.expiredQuantity}</td>
                      <td className="px-4 py-3 text-xs">{toReadableDate(item.mfgDate)}</td>
                      <td className="px-4 py-3 text-xs text-red-600">{toReadableDate(item.expDate)}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleViewExpiredDetail(item)}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowExpiredModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Detail Modal */}
      {showDetailModal && selectedExpiredItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold">Chi tiết sản phẩm hết hạn</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-auto flex-1 px-6 py-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-slate-500">Đang tải...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-red-600 text-[24px]">warning</span>
                      <div>
                        <h4 className="font-semibold text-red-800 dark:text-red-400">Cảnh báo hết hạn sử dụng</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Sản phẩm này đã hết hạn sử dụng và cần được xử lý theo quy định.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Mã mẻ sản xuất</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiredItem.batchCode}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Sản phẩm</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiredItem.productName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">SL dự kiến</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiredItem.plannedQuantity || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">SL thực tế</label>
                      <p className="text-sm font-medium mt-1 text-red-600">{selectedExpiredItem.actualQuantity || selectedExpiredItem.expiredQuantity || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Ngày sản xuất</label>
                      <p className="text-sm font-medium mt-1">{toShortDate(selectedExpiredItem.mfgDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Hạn sử dụng</label>
                      <p className="text-sm font-medium mt-1 text-red-600">{toShortDate(selectedExpiredItem.expDate)}</p>
                    </div>
                  </div>

                  {selectedExpiredItem.recipe && selectedExpiredItem.recipe.materials && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Nguyên liệu đã sử dụng (Công thức)</h4>
                      <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-800">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">Nguyên liệu</th>
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">SL yêu cầu</th>
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">Hao hụt (%)</th>
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">SL thực tế cần</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedExpiredItem.recipe.materials.map((mat, idx) => {
                            const actualNeeded = mat.quantityRequired * (1 + (mat.maxWastePercent || mat.wasteAllowancePercent || 0) / 100)
                            return (
                              <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="px-3 py-2 text-sm">{mat.materialName || 'Nguyên liệu chưa có tên'}</td>
                                <td className="px-3 py-2 text-sm">{mat.quantityRequired}</td>
                                <td className="px-3 py-2 text-sm">{mat.maxWastePercent ?? mat.wasteAllowancePercent ?? 0}%</td>
                                <td className="px-3 py-2 text-sm font-semibold">{actualNeeded.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Import Ingredient Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={closeImportModal}>
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Nhập nguyên liệu vào kho</h3>
              <button
                type="button"
                onClick={closeImportModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nguyên liệu
                </label>
                <select
                  value={importForm.productId}
                  onChange={(e) => setImportForm({ ...importForm, productId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                  required
                >
                  <option value="">Chọn nguyên liệu</option>
                  {rawProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nhà cung cấp
                </label>
                <select
                  value={importForm.supplierId}
                  onChange={(e) => setImportForm({ ...importForm, supplierId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                  required
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Số lượng nhập
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={importForm.quantity}
                  onChange={(e) => setImportForm({ ...importForm, quantity: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                  required
                />
              </div>

              {importError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                  {importError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="h-10 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {importing ? 'Đang nhập...' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
