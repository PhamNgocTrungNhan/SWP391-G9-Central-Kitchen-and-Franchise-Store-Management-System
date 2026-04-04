import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'
import { getCurrentUserRole } from '../utils/auth'

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

export default function InventoryPage() {
  const apiBase = getApiBaseUrl()
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
  const [deleteStockId, setDeleteStockId] = useState(null)
  const [showEditStockModal, setShowEditStockModal] = useState(false)
  const [editStockRow, setEditStockRow] = useState(null)
  const [editStockSaving, setEditStockSaving] = useState(false)
  const [editStockError, setEditStockError] = useState('')
  const [editStockForm, setEditStockForm] = useState({ quantity: '', unit: '' })
  const [editStockId, setEditStockId] = useState(null)

  const canManageInventoryRow = () => {
    const r = getCurrentUserRole()
    return r === 'ADMIN' || r === 'MANAGER'
  }

  const isAnyModalOpen =
    showExpiredModal || showDetailModal || showExpiryDetailModal || showImportModal || showEditStockModal

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
          productMap[p.productId] = {
            name: p.productName || p.name || `Sản phẩm #${p.productId}`,
            baseUnit: p.baseUnit || '',
          }
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

      const normalized = data.map((item) => {
        const meta = productMap[item.productId]
        const productName =
          meta?.name ||
          item.product?.productName ||
          item.product?.name ||
          item.productName ||
          `Sản phẩm #${item.productId}`
        const location = item.location || item.locationName || 'Bếp trung tâm #1'
        const quantity = Number(item.currentQuantity || item.quantity || 0)
        const baseUnit = meta?.baseUnit || item.product?.baseUnit || item.baseUnit || ''
        const displayOverride = item.displayUnit ?? item.display_unit
        const unit =
          (displayOverride != null && String(displayOverride).trim() !== '' ? String(displayOverride).trim() : '') ||
          baseUnit ||
          'unit'

        const inventoryId = Number(item.inventoryId ?? item.inventory_id)
        return {
          inventoryId: Number.isFinite(inventoryId) && inventoryId > 0 ? inventoryId : null,
          id: item.inventoryId || item.stockId || `${item.productId}-${item.locationType}-${item.locationId}`,
          productId: item.productId,
          product: productName,
          location,
          quantity,
          unit,
          productBaseUnit: baseUnit,
          inventoryDisplayUnit:
            displayOverride != null && String(displayOverride).trim() !== '' ? String(displayOverride).trim() : null,
        }
      })

      setStock(normalized)
    } catch {
      setStock([])
    } finally {
      setLoading(false)
    }
  }

  const deleteInventoryRow = async (row) => {
    const invId = row?.inventoryId
    if (!invId || invId < 1) {
      setMessage({ type: 'error', text: 'Không xác định được mã dòng tồn kho (inventoryId). Tải lại trang.' })
      return
    }
    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Bạn chưa đăng nhập.' })
      return
    }
    if (
      !window.confirm(
        `Xóa dòng tồn kho?\n\n${row.product} @ ${row.location}\nTồn hiện tại: ${row.quantity}\n\nHành động này không thể hoàn tác (chỉ xóa bản ghi tồn, không xóa sản phẩm).`
      )
    ) {
      return
    }
    setDeleteStockId(invId)
    try {
      const response = await fetch(`${apiBase}/Inventory/stock/${invId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tk}`, accept: '*/*' },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || data?.title || 'Không thể xóa dòng tồn kho.')
      }
      setMessage({ type: 'success', text: data?.message || 'Đã xóa dòng tồn kho.' })
      await fetchStock()
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Xóa thất bại.' })
    } finally {
      setDeleteStockId(null)
    }
  }

  const openEditStockModal = (row) => {
    if (!row?.inventoryId) return
    setEditStockRow(row)
    setEditStockError('')
    setEditStockForm({
      quantity: String(row.quantity ?? ''),
      unit: row.inventoryDisplayUnit != null ? row.inventoryDisplayUnit : '',
    })
    setShowEditStockModal(true)
  }

  const closeEditStockModal = () => {
    if (editStockSaving) return
    setShowEditStockModal(false)
    setEditStockRow(null)
    setEditStockError('')
  }

  const submitEditStock = async (e) => {
    e.preventDefault()
    setEditStockError('')
    const invId = editStockRow?.inventoryId
    if (!invId) {
      setEditStockError('Không xác định được mã dòng tồn kho.')
      return
    }
    const tk = getToken()
    if (!tk) {
      setEditStockError('Bạn chưa đăng nhập.')
      return
    }
    const qty = Number(editStockForm.quantity)
    if (!Number.isFinite(qty) || qty < 0) {
      setEditStockError('Số lượng phải là số không âm.')
      return
    }
    const unitTrim = String(editStockForm.unit || '').trim()
    const displayUnitPayload = unitTrim === '' ? null : unitTrim

    setEditStockSaving(true)
    setEditStockId(invId)
    try {
      const response = await fetch(`${apiBase}/Inventory/stock/${invId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tk}`,
          accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentQuantity: qty,
          displayUnit: displayUnitPayload,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || data?.title || 'Không thể cập nhật tồn kho.')
      }
      setMessage({ type: 'success', text: data?.message || 'Đã cập nhật tồn kho.' })
      setShowEditStockModal(false)
      setEditStockRow(null)
      setEditStockError('')
      await fetchStock()
      fetchLogs()
    } catch (err) {
      setEditStockError(err.message || 'Cập nhật thất bại.')
    } finally {
      setEditStockSaving(false)
      setEditStockId(null)
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
          productMap[p.productId] = p.productName || p.name || `Sản phẩm #${p.productId}`
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
        const productName = productMap[item.productId] || item.product?.productName || item.product?.name || item.productName || `Sản phẩm #${item.productId}`

        let action = item.reason || 'Unknown'
        if (action.includes('SẢN XUẤT')) action = 'Trừ nguyên liệu sản xuất'
        if (action.includes('NHẬP THÀNH PHẨM')) action = 'Nhập thành phẩm'
        if (action.includes('XUẤT GIAO')) action = 'Xuất giao cửa hàng'
        if (action.includes('NHẬP NGUYÊN LIỆU') || action.includes('NHAP_TU_NHA_CUNG_CAP')) action = 'Nhập nguyên liệu'
        if (item.referenceType === 'INVENTORY_DELETE') action = 'Xóa dòng tồn kho (quản trị)'
        if (item.referenceType === 'INVENTORY_ADJUST') action = 'Điều chỉnh tồn (quản trị)'

        let actor = 'Hệ thống'
        if (item.referenceType === 'PRODUCTION_BATCH' && item.referenceId) {
          actor = `Mẻ SX #${item.referenceId}`
        } else if (item.referenceType === 'INTERNAL_ORDER' && item.referenceId) {
          actor = `Đơn hàng #${item.referenceId}`
        } else if (item.supplierId) {
          actor = `NCC #${item.supplierId}`
        }

        return {
          id: item.logId,
          product: productName,
          quantity: qty >= 0 ? `+${qty}` : `${qty}`,
          action,
          actor,
          date: toReadableDate(item.createdAt),
          type: qty >= 0 ? 'IN' : 'OUT',
        }
      })

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
            name: p.productName || p.name || `Sản phẩm #${p.productId}`,
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
        const productInfo = productMap[batch.productId] || { name: `Sản phẩm #${batch.productId}`, sku: 'N/A' }
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
          productMap[p.productId] = p.productName || p.name || `Sản phẩm #${p.productId}`
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
          const productName = productMap[batch.productId] || `Sản phẩm #${batch.productId}`
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
          productMap[p.productId] = p.productName || p.name || `Sản phẩm #${p.productId}`
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
      const recipeRes = await fetch(`${apiBase}/Recipes/product/${item.productId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      let recipeData = null
      if (recipeRes.ok) {
        recipeData = await recipeRes.json()
      }

      // Enrich batch data
      const enrichedBatch = {
        ...batchData,
        productName: productMap[batchData.productId] || `Sản phẩm #${batchData.productId}`,
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
        const data = await productsRes.json()
        const normalized = (Array.isArray(data) ? data : []).map((p) => ({
          id: p.productId || p.id,
          name: p.productName || p.name || `Sản phẩm #${p.productId || p.id}`,
        }))
        setRawProducts(normalized)

        if (normalized.length > 0 && !importForm.productId) {
          setImportForm((prev) => ({ ...prev, productId: String(normalized[0].id) }))
        }
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json()
        const normalized = (Array.isArray(data) ? data : []).map((s) => ({
          id: s.supplierId || s.id,
          name: s.supplierName || s.name || `NCC #${s.supplierId || s.id}`,
        }))
        setSuppliers(normalized)

        if (normalized.length > 0 && !importForm.supplierId) {
          setImportForm((prev) => ({ ...prev, supplierId: String(normalized[0].id) }))
        }
      }
    } catch (error) {
      console.error('Error fetching raw products/suppliers:', error)
    }
  }

  const openImportModal = () => {
    setShowImportModal(true)
    setImportError('')
    if (rawProducts.length === 0 || suppliers.length === 0) {
      fetchRawProductsAndSuppliers()
    }
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

    const productId = Number(importForm.productId || 0)
    const supplierId = Number(importForm.supplierId || 0)
    const quantity = Number(importForm.quantity || 0)

    if (productId < 1) {
      setImportError('Vui lòng chọn sản phẩm hợp lệ.')
      return
    }
    if (supplierId < 1) {
      setImportError('Vui lòng chọn nhà cung cấp hợp lệ.')
      return
    }
    if (quantity <= 0) {
      setImportError('Số lượng nhập phải lớn hơn 0.')
      return
    }

    setImporting(true)
    try {
      const response = await fetch(`${apiBase}/Inventory/import`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify({
          productId,
          quantity,
          supplierId,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const errorMsg = data?.message || data?.title || 'Nhập kho thất bại.'
        throw new Error(errorMsg)
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
                      <th className="w-[30%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                      <th className="w-[22%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vị trí</th>
                      <th className="w-[14%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tồn hiện tại</th>
                      <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn vị</th>
                      <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Cảnh báo</th>
                      {canManageInventoryRow() ? (
                        <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                      ) : null}
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${item.quantity > 100 ? 'bg-emerald-100 text-emerald-700' : item.quantity > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {item.quantity > 100 ? '●' : item.quantity > 0 ? '●' : '●'}
                          </span>
                        </td>
                        {canManageInventoryRow() ? (
                          <td className="px-4 py-3 text-right">
                            {item.inventoryId ? (
                              <div className="inline-flex flex-wrap items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditStockModal(item)}
                                  disabled={editStockId === item.inventoryId || deleteStockId === item.inventoryId}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 dark:border-slate-600 bg-slate-900 dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50"
                                  title="Chỉnh sửa số lượng và đơn vị hiển thị"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                  {editStockId === item.inventoryId ? '…' : 'Sửa'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteInventoryRow(item)}
                                  disabled={deleteStockId === item.inventoryId || editStockId === item.inventoryId}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                                  title="Xóa dòng tồn kho tại vị trí này (không xóa sản phẩm)"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                  {deleteStockId === item.inventoryId ? '…' : 'Xóa'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        ) : null}
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
                        <td className="px-4 py-3 text-sm">{log.actor}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={String(log.quantity).startsWith('+') ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {log.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{log.date}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${String(log.quantity).startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {String(log.quantity).startsWith('+') ? 'Nhập' : 'Xuất'}
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${item.expiryStatus === 'Hết hạn' ? 'bg-red-100 text-red-700' :
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
              <h3 className="text-lg font-semibold">Chi tiết mẻ sản xuất #{selectedExpiryItem.batchId}</h3>
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${selectedExpiryItem.expiryStatus === 'Hết hạn' ? 'bg-red-100 text-red-700' :
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
                            const actualNeeded = mat.quantityRequired * (1 + (mat.wasteAllowancePercent || 0) / 100)
                            return (
                              <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="px-3 py-2 text-sm">{mat.materialName || `Material #${mat.materialId}`}</td>
                                <td className="px-3 py-2 text-sm">{mat.quantityRequired}</td>
                                <td className="px-3 py-2 text-sm">{mat.wasteAllowancePercent || 0}%</td>
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


      {/* Chỉnh sửa tồn kho (Admin / Manager) */}
      {showEditStockModal && editStockRow && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onClick={closeEditStockModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Chỉnh sửa tồn kho</h3>
              <button
                type="button"
                onClick={closeEditStockModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">{editStockRow.product}</p>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{editStockRow.location}</p>
            </div>

            <form onSubmit={submitEditStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tồn hiện tại
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editStockForm.quantity}
                  onChange={(e) => setEditStockForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Đơn vị hiển thị
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={editStockForm.unit}
                  onChange={(e) => setEditStockForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder={
                    editStockRow.productBaseUnit
                      ? `Để trống = mặc định (${editStockRow.productBaseUnit})`
                      : 'Ví dụ: kg, thùng, quả'
                  }
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Để trống để dùng đơn vị mặc định của sản phẩm trong hệ thống.
                </p>
              </div>

              {editStockError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                  {editStockError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditStockModal}
                  className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editStockSaving}
                  className="h-10 px-4 rounded-lg bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editStockSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
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
