import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

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

function toDateTime(dateString) {
  if (!dateString) return 'Chưa thanh toán'
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

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`
}

function toAmount(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const raw = String(value ?? '').trim()
  if (!raw) return fallback

  let normalized = raw.replace(/[\s₫đ]/gi, '')

  if (/^\d{1,3}([.,]\d{3})+([.,]\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/[.,](?=\d{3}(\D|$))/g, '')
  }

  normalized = normalized.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatRefundPolicyLabel(policy) {
  const name = String(policy?.displayName || policy?.name || policy?.policyCode || '').trim()
  const pct = Number(policy?.refundPercentage)

  if (!name) return ''
  if (!Number.isFinite(pct)) return name

  const compact = name.replace(/\s+/g, '').toLowerCase()
  if (compact.includes(`${pct}%`) || compact.includes(`${pct.toFixed(0)}%`)) {
    return name
  }

  return `${name} (${pct}%)`
}

function findRefundPolicyByValue(policies, value) {
  const target = String(value || '').trim().toLowerCase()
  if (!target) return null

  return (policies || []).find((policy) => {
    const byCode = String(policy?.policyCode || '').trim().toLowerCase()
    const byDisplay = String(policy?.displayName || policy?.name || '').trim().toLowerCase()
    const byLabel = formatRefundPolicyLabel(policy).trim().toLowerCase()
    return target === byCode || target === byDisplay || target === byLabel
  }) || null
}

function extractApiErrorMessage(data, fallback = 'Có lỗi xảy ra') {
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (!data || typeof data !== 'object') return fallback

  if (typeof data.message === 'string' && data.message.trim()) return data.message
  if (typeof data.title === 'string' && data.title.trim()) return data.title
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail

  const firstError = Object.values(data.errors || {}).find((value) => Array.isArray(value) && value.length)
  if (firstError && firstError[0]) return String(firstError[0])

  return fallback
}

const paymentStatusStyle = {
  UNPAID: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REFUNDED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PARTIAL_REFUND: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

const paymentStatusLabel = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
  PARTIAL_REFUND: 'Hoàn một phần',
}

const orderStatusStyle = {
  PENDING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  APPROVED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  PROCESSING: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  PRODUCED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  SHIPPING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  REFUNDED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

const orderStatusLabel = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PROCESSING: 'Đang xử lý',
  PRODUCED: 'Đã sản xuất',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Đã từ chối',
  REFUNDED: 'Đã hoàn tiền',
}

function normalizeOrderStatus(rawStatus, fallback = 'PENDING') {
  const raw = String(rawStatus || '').trim().toUpperCase()
  if (!raw) return fallback

  const aliases = {
    SHIPPED: 'SHIPPING',
    DELIVERED: 'COMPLETED',
    CHO_DUYET: 'PENDING',
    DUYET: 'APPROVED',
    DA_DUYET: 'APPROVED',
    DANG_XU_LY: 'PROCESSING',
    DA_SAN_XUAT: 'PRODUCED',
    DANG_GIAO: 'SHIPPING',
    DA_HUY: 'CANCELLED',
    DA_TU_CHOI: 'REJECTED',
    DA_HOAN_TIEN: 'REFUNDED',
  }

  return aliases[raw] || raw
}

function isOrderRefunded(order) {
  return normalizeOrderStatus(order?.orderStatus) === 'REFUNDED' || String(order?.paymentStatus || '').toUpperCase() === 'REFUNDED'
}

function getRefundableRemainingByOrder(order) {
  const paid = toAmount(order?.paidAmount, 0)
  const refunded = toAmount(order?.refundedAmount, 0)
  return Math.max(0, paid - refunded)
}

function canRefundOrder(order) {
  const paymentStatus = String(order?.paymentStatus || '').toUpperCase()
  const refundableRemaining = getRefundableRemainingByOrder(order)

  if (isOrderRefunded(order)) return false
  if (paymentStatus !== 'PAID' && paymentStatus !== 'PARTIAL_REFUND') return false
  if (refundableRemaining <= 0) return false

  return true
}

function refundDebug(step, details) {
  if (!import.meta.env.DEV) return

  const stamp = new Date().toISOString()
  const payload = { stamp, step, ...details }

  console.log(`[RefundDebug] ${step}`, payload)

  if (typeof window !== 'undefined') {
    window.__lastRefundDebug = payload
  }
}

export default function PaymentsPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const enableRefundAction = false
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Refund modal states
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showRefundConfirm, setShowRefundConfirm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [refundPolicies, setRefundPolicies] = useState([])
  const [refundForm, setRefundForm] = useState({
    policyCode: '',
    additionalNote: ''
  })

  // PayOS QR modal states
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null)
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false)
  const [selectedListOrder, setSelectedListOrder] = useState(null)

  const fetchOrders = async () => {
    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/internal-orders`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        throw new Error('Không thể tải danh sách đơn hàng')
      }

      const data = await response.json()
      const normalized = (Array.isArray(data) ? data : []).map((item) => {
        const orderId = Number(item.orderId || item.internalOrderId || item.id || 0)
        const details = Array.isArray(item?.internalOrderDetails)
          ? item.internalOrderDetails
          : Array.isArray(item?.orderDetails)
            ? item.orderDetails
            : []

        const quantityFromDetails = details.reduce((sum, row) => {
          return sum + Number(row?.quantityOrdered ?? row?.quantityConfirmed ?? row?.quantity ?? 0)
        }, 0)
        const quantityTotal = quantityFromDetails || Number(item?.totalQuantity ?? item?.quantityOrdered ?? item?.quantity ?? 0)

        const detailsSubtotal = details.reduce((sum, row) => {
          const qty = Number(row?.quantityOrdered ?? row?.quantityConfirmed ?? row?.quantity ?? 0)
          const unitPrice = Number(row?.unitPrice ?? row?.price ?? row?.sellingPrice ?? 0)
          return sum + (qty * unitPrice)
        }, 0)

        const totalAmount = toAmount(item.totalAmount, detailsSubtotal)
        const paymentStatus = String(item.paymentStatus || 'UNPAID').toUpperCase()
        const orderStatus = normalizeOrderStatus(
          item.orderStatus || item.status,
          paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'PENDING',
        )
        const paidAmountFromApi = toAmount(item.paidAmount, Number.NaN)
        const paidAmount = Number.isFinite(paidAmountFromApi)
          ? paidAmountFromApi
          : (paymentStatus === 'UNPAID' ? 0 : totalAmount)
        const refundedAmount = toAmount(item.refundedAmount, 0)
        const avgUnitPrice = quantityTotal > 0
          ? totalAmount / quantityTotal
          : Number(details?.[0]?.unitPrice ?? details?.[0]?.price ?? 0)

        return {
          orderId,
          orderCode: item.orderCode || item.code || (orderId ? `ORD${orderId}` : 'N/A'),
          storeName: item.store?.storeName || item.store?.name || `Store #${item.storeId || 'N/A'}`,
          createdAt: item.createdAt,
          paymentDate: item.paidAt || item.paymentDate || item.lastPaidAt || (paymentStatus === 'UNPAID' ? null : item.updatedAt),
          orderStatus,
          paymentStatus,
          quantityTotal,
          avgUnitPrice,
          totalAmount,
          paidAmount,
          refundedAmount,
          dueAmount: Math.max(0, totalAmount - paidAmount),
        }
      })

      setOrders(normalized)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchRefundPolicies = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const response = await fetch(`${apiBase}/internal-orders/refund-policies`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (response.ok) {
        const data = await response.json()
        setRefundPolicies(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching refund policies:', error)
    }
  }

  const createPayOSLink = async (orderId) => {
    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập' })
      return
    }

    setActionLoading(orderId)
    try {
      const returnUrl = `${window.location.origin}/payment-result?status=success`
      const cancelUrl = `${window.location.origin}/payment-result?status=cancel`

      console.log('Creating PayOS link for order:', orderId)
      console.log('Return URL:', returnUrl)
      console.log('Cancel URL:', cancelUrl)

      const response = await fetch(
        `${apiBase}/internal-orders/${orderId}/payos-link?returnUrl=${encodeURIComponent(returnUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tk}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json().catch(() => ({}))
      console.log('PayOS response:', response.status, data)

      if (!response.ok) {
        const errorMsg = data?.message || data?.title || data?.error || 'Không thể tạo link thanh toán'
        console.error('PayOS error:', errorMsg, data)
        throw new Error(errorMsg)
      }

      const checkoutUrl = data.checkoutUrl || data.data?.checkoutUrl || data.url

      if (!checkoutUrl) {
        console.error('No checkoutUrl in response:', data)
        throw new Error('Backend không trả về checkoutUrl')
      }

      console.log('Checkout URL:', checkoutUrl)
      setQrUrl(checkoutUrl)
      setShowQRModal(true)
      setMessage({ type: 'success', text: 'Đã tạo link thanh toán QR' })
    } catch (error) {
      console.error('Create PayOS link error:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(null)
    }
  }

  const payManually = async (orderId, options = {}) => {
    const skipConfirm = Boolean(options?.skipConfirm)
    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập' })
      return
    }

    if (!skipConfirm && !window.confirm('Xác nhận đã nhận tiền mặt/chuyển khoản?')) return

    setActionLoading(orderId)
    try {
      const response = await fetch(`${apiBase}/internal-orders/${orderId}/pay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || 'Không thể xác nhận thanh toán')
      }

      setMessage({ type: 'success', text: 'Đã xác nhận thanh toán thành công' })
      fetchOrders()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(null)
    }
  }

  const openPaymentMethodModal = (order) => {
    setSelectedPaymentOrder(order)
    setShowPaymentMethodModal(true)
  }

  const openOrderDetailModal = (order) => {
    setSelectedListOrder(order)
    setShowOrderDetailModal(true)
  }

  const closeOrderDetailModal = () => {
    setShowOrderDetailModal(false)
    setSelectedListOrder(null)
  }

  const closePaymentMethodModal = () => {
    if (selectedPaymentOrder && actionLoading === selectedPaymentOrder.orderId) return
    setShowPaymentMethodModal(false)
    setSelectedPaymentOrder(null)
  }

  const payOrderByPayOS = () => {
    const orderId = Number(selectedPaymentOrder?.orderId)
    if (!orderId) return

    setShowPaymentMethodModal(false)
    setSelectedPaymentOrder(null)
    createPayOSLink(orderId)
  }

  const payOrderManually = () => {
    const orderId = Number(selectedPaymentOrder?.orderId)
    if (!orderId) return

    setShowPaymentMethodModal(false)
    setSelectedPaymentOrder(null)
    payManually(orderId, { skipConfirm: true })
  }

  const openRefundModal = (order) => {
    refundDebug('open_refund_modal_attempt', {
      orderId: order?.orderId,
      orderStatus: order?.orderStatus,
      paymentStatus: order?.paymentStatus,
      paidAmount: order?.paidAmount,
      refundedAmount: order?.refundedAmount,
      refundableRemaining: getRefundableRemainingByOrder(order),
    })

    if (getRefundableRemainingByOrder(order) <= 0) {
      refundDebug('open_refund_modal_blocked', {
        orderId: order?.orderId,
        reason: 'NO_REFUNDABLE_REMAINING',
      })
      setMessage({ type: 'error', text: 'Đơn đã hoàn hết tiền, không thể hoàn thêm.' })
      return
    }

    if (isOrderRefunded(order)) {
      refundDebug('open_refund_modal_blocked', {
        orderId: order?.orderId,
        reason: 'ORDER_ALREADY_REFUNDED',
      })
      setMessage({ type: 'error', text: 'Đơn đã hoàn tiền, không thể hoàn tiền lại.' })
      return
    }

    if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL_REFUND') {
      refundDebug('open_refund_modal_blocked', {
        orderId: order?.orderId,
        reason: 'INVALID_PAYMENT_STATUS',
        paymentStatus: order?.paymentStatus,
      })
      setMessage({ type: 'error', text: 'Chỉ đơn đã thanh toán mới có thể hoàn tiền' })
      return
    }

    setSelectedOrder(order)
    setRefundForm({ policyCode: '', additionalNote: '' })
    setShowRefundConfirm(false)
    setShowRefundModal(true)

    if (refundPolicies.length === 0) {
      fetchRefundPolicies()
    }
  }

  const submitRefund = async () => {
    if (!selectedOrder) return
    if (actionLoading === selectedOrder.orderId) return

    const debugRequestId = `${selectedOrder.orderId}-${Date.now()}`
    refundDebug('submit_refund_start', {
      requestId: debugRequestId,
      orderId: selectedOrder.orderId,
      selectedOrder,
      refundForm,
      refundPreviewAmount,
      actionLoading,
    })

    const latestOrder = orders.find((order) => order.orderId === selectedOrder.orderId) || selectedOrder
    const latestRefundableRemaining = getRefundableRemainingByOrder(latestOrder)

    if (!canRefundOrder(latestOrder)) {
      const latestOrderStatus = normalizeOrderStatus(latestOrder.orderStatus)
      refundDebug('submit_refund_blocked', {
        requestId: debugRequestId,
        orderId: latestOrder?.orderId,
        latestOrderStatus,
        latestPaymentStatus: latestOrder?.paymentStatus,
        latestRefundableRemaining,
      })

      if (latestOrderStatus === 'REFUNDED') {
        setMessage({ type: 'error', text: 'Đơn đã hoàn tiền, không thể hoàn tiền lại.' })
      } else if (latestRefundableRemaining <= 0) {
        setMessage({ type: 'error', text: 'Đơn đã hoàn hết tiền, không thể hoàn thêm.' })
      } else {
        setMessage({ type: 'error', text: 'Đơn hiện không hợp lệ để hoàn tiền.' })
      }
      return
    }

    const resolvedPolicyCode = String(selectedRefundPolicy?.policyCode || refundForm.policyCode || '').trim()
    const resolvedAdditionalNote = String(refundForm.additionalNote || '').trim()

    if (!resolvedPolicyCode) {
      refundDebug('submit_refund_blocked', {
        requestId: debugRequestId,
        orderId: latestOrder?.orderId,
        reason: 'EMPTY_POLICY_CODE',
      })
      setMessage({ type: 'error', text: 'Vui lòng chọn chính sách hoàn tiền' })
      return
    }

    if (refundPreviewAmount <= 0) {
      refundDebug('submit_refund_blocked', {
        requestId: debugRequestId,
        orderId: latestOrder?.orderId,
        reason: 'INVALID_PREVIEW_AMOUNT',
        refundPreviewAmount,
      })
      setMessage({ type: 'error', text: 'Số tiền hoàn dự kiến không hợp lệ.' })
      return
    }

    if (refundPreviewAmount > latestRefundableRemaining) {
      refundDebug('submit_refund_blocked', {
        requestId: debugRequestId,
        orderId: latestOrder?.orderId,
        reason: 'PREVIEW_GT_REMAINING',
        refundPreviewAmount,
        latestRefundableRemaining,
      })
      setMessage({
        type: 'error',
        text: `Số tiền hoàn vượt mức còn lại (${formatCurrency(latestRefundableRemaining)}). Vui lòng chọn chính sách khác.`,
      })
      return
    }

    const tk = getToken()
    if (!tk) {
      refundDebug('submit_refund_blocked', {
        requestId: debugRequestId,
        orderId: latestOrder?.orderId,
        reason: 'MISSING_TOKEN',
      })
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập' })
      return
    }

    setActionLoading(selectedOrder.orderId)
    try {
      const payload = {
        policyCode: resolvedPolicyCode,
      }
      if (resolvedAdditionalNote) {
        payload.additionalNote = resolvedAdditionalNote
      }

      const refundUrl = `${apiBase}/internal-orders/${selectedOrder.orderId}/refund`
      refundDebug('submit_refund_request', {
        requestId: debugRequestId,
        url: refundUrl,
        orderId: selectedOrder.orderId,
        payload,
        hasToken: Boolean(tk),
      })

      const response = await fetch(refundUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text().catch(() => '')
      let data = {}
      if (responseText) {
        try {
          data = JSON.parse(responseText)
        } catch {
          data = { message: responseText }
        }
      }

      refundDebug('submit_refund_response', {
        requestId: debugRequestId,
        orderId: selectedOrder.orderId,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type') || '',
        responseText,
        parsedData: data,
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Bạn không có quyền thao tác')
        }

        const apiError = extractApiErrorMessage(data, `Không thể hoàn tiền (HTTP ${response.status})`)
        const normalizedError = String(apiError || '').toLowerCase()

        if (
          response.status === 400 &&
          (normalizedError.includes('already refunded') ||
            normalizedError.includes('đã hoàn tiền') ||
            normalizedError.includes('refunded'))
        ) {
          setOrders((prev) => prev.map((order) => (
            order.orderId === selectedOrder.orderId
              ? { ...order, orderStatus: 'REFUNDED', paymentStatus: 'REFUNDED' }
              : order
          )))
          setShowRefundConfirm(false)
          setShowRefundModal(false)
          setSelectedOrder(null)
        }

        throw new Error(apiError)
      }

      const responseOrderStatus = normalizeOrderStatus(data?.orderStatus || data?.updatedOrder?.orderStatus || data?.updatedOrder?.status, '')
      const responsePaymentStatus = String(data?.paymentStatus || '').trim().toUpperCase()
      const nextOrderStatus = responseOrderStatus || 'REFUNDED'
      const nextPaymentStatus = responsePaymentStatus || 'REFUNDED'
      const nextRefundedAmountRaw = toAmount(data?.refundedAmount ?? data?.refundAmount, Number.NaN)

      setOrders((prev) => prev.map((order) => {
        if (order.orderId !== selectedOrder.orderId) return order

        const fallbackRefunded = toAmount(order.refundedAmount, 0) + toAmount(refundPreviewAmount, 0)
        const nextRefundedAmount = Number.isFinite(nextRefundedAmountRaw)
          ? Math.max(nextRefundedAmountRaw, fallbackRefunded)
          : fallbackRefunded
        const nextDueAmount = Math.max(0, toAmount(order.totalAmount, 0) - toAmount(order.paidAmount, 0))

        return {
          ...order,
          orderStatus: nextOrderStatus,
          paymentStatus: nextPaymentStatus,
          refundedAmount: nextRefundedAmount,
          dueAmount: nextDueAmount,
        }
      }))

      setMessage({ type: 'success', text: data?.message || 'Đã hoàn tiền thành công' })
      setShowRefundConfirm(false)
      setShowRefundModal(false)
      setSelectedOrder(null)

      refundDebug('submit_refund_state_applied', {
        requestId: debugRequestId,
        orderId: selectedOrder.orderId,
        nextOrderStatus,
        nextPaymentStatus,
        backendRefundAmount: data?.refundAmount,
        backendRefundedAmount: data?.refundedAmount,
      })
    } catch (error) {
      refundDebug('submit_refund_exception', {
        requestId: debugRequestId,
        orderId: selectedOrder?.orderId,
        errorMessage: error?.message || String(error),
      })
      setMessage({ type: 'error', text: error.message })
    } finally {
      refundDebug('submit_refund_finish', {
        requestId: debugRequestId,
        orderId: selectedOrder?.orderId,
      })
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    if (!message) return undefined

    const timer = window.setTimeout(() => {
      setMessage(null)
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [message])

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders
    return orders.filter((order) => order.paymentStatus === statusFilter)
  }, [orders, statusFilter])

  const selectedRefundPolicy = useMemo(
    () => findRefundPolicyByValue(refundPolicies, refundForm.policyCode),
    [refundPolicies, refundForm.policyCode],
  )

  const refundPreviewAmount = useMemo(() => {
    if (!selectedOrder || !selectedRefundPolicy) return 0
    const percent = Number(selectedRefundPolicy.refundPercentage || 0)
    return Math.round(Number(selectedOrder.totalAmount || 0) * (percent / 100))
  }, [selectedOrder, selectedRefundPolicy])

  const refundableRemaining = useMemo(() => {
    if (!selectedOrder) return 0
    const paid = toAmount(selectedOrder.paidAmount, 0)
    const refunded = toAmount(selectedOrder.refundedAmount, 0)
    return Math.max(0, paid - refunded)
  }, [selectedOrder])

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const unpaidOrders = orders.filter((o) => o.paymentStatus === 'UNPAID').length
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID').length
    const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
    const totalCollected = orders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0)
    const totalDue = orders.reduce((sum, o) => sum + Number(o.dueAmount || 0), 0)

    return {
      totalOrders,
      unpaidOrders,
      paidOrders,
      totalValue,
      totalCollected,
      totalDue,
    }
  }, [orders])

  const visibleColumns = useMemo(() => {
    const rows = filteredOrders || []
    return {
      quantity: rows.some((order) => Number(order?.quantityTotal || 0) > 0),
      avgUnitPrice: rows.some((order) => Number(order?.avgUnitPrice || 0) > 0),
      dueAmount: rows.some((order) => Number(order?.dueAmount || 0) > 0),
      orderStatus: rows.some((order) => String(order?.orderStatus || '').trim()),
    }
  }, [filteredOrders])

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
          <h2 className="text-lg font-bold leading-tight">Quản lý thanh toán</h2>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lịch sử thanh toán</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Theo dõi đơn cần thanh toán, đã thanh toán, số lượng, đơn giá và số tiền còn phải chi.
            </p>
          </div>
          <label className="flex flex-col gap-1 min-w-[220px]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lọc trạng thái thanh toán</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="ALL">Tất cả</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PARTIAL_REFUND">Hoàn một phần</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-500">Tổng đơn</p>
            <p className="mt-2 text-xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-900/10 p-3 shadow-sm">
            <p className="text-[11px] text-amber-700 dark:text-amber-400">Cần thanh toán</p>
            <p className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-300">{stats.unpaidOrders}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-900/10 p-3 shadow-sm">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Đã thanh toán</p>
            <p className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.paidOrders}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
            <p className="text-[11px] text-slate-500">Tổng giá trị</p>
            <p className="mt-2 text-sm font-bold">{formatCurrency(stats.totalValue)}</p>
          </div>
          <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-900/10 p-3 shadow-sm">
            <p className="text-[11px] text-blue-700 dark:text-blue-400">Đã chi</p>
            <p className="mt-2 text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(stats.totalCollected)}</p>
          </div>
          <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-900/10 p-3 shadow-sm">
            <p className="text-[11px] text-rose-700 dark:text-rose-400">Còn phải chi</p>
            <p className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-300">{formatCurrency(stats.totalDue)}</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border ${message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Đang tải...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Không có đơn hàng</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Đơn hàng</th>
                  {visibleColumns.quantity && (
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center whitespace-nowrap">Số lượng</th>
                  )}
                  {visibleColumns.avgUnitPrice && (
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">Đơn giá TB</th>
                  )}
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Tổng tiền</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Đã thanh toán</th>
                  {visibleColumns.dueAmount && (
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Cần thanh toán</th>
                  )}
                  {visibleColumns.orderStatus && (
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Trạng thái đơn</th>
                  )}
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Trạng thái</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openOrderDetailModal(order)}
                        className="text-primary hover:underline"
                        title="Xem chi tiết đơn"
                      >
                        {order.orderCode}
                      </button>
                    </td>
                    {visibleColumns.quantity && (
                      <td className="px-4 py-3 text-sm text-center font-semibold whitespace-nowrap">{order.quantityTotal || '-'}</td>
                    )}
                    {visibleColumns.avgUnitPrice && (
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{formatCurrency(order.avgUnitPrice)}</td>
                    )}
                    <td className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-semibold">
                      {formatCurrency(order.paidAmount)}
                    </td>
                    {visibleColumns.dueAmount && (
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap text-rose-700 dark:text-rose-400 font-semibold">
                        {formatCurrency(order.dueAmount)}
                      </td>
                    )}
                    {visibleColumns.orderStatus && (
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${orderStatusStyle[normalizeOrderStatus(order.orderStatus)] || orderStatusStyle.PENDING}`}
                        >
                          {orderStatusLabel[normalizeOrderStatus(order.orderStatus)] || normalizeOrderStatus(order.orderStatus)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${paymentStatusStyle[order.paymentStatus] || paymentStatusStyle.UNPAID
                          }`}
                      >
                        {paymentStatusLabel[order.paymentStatus] || order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right min-w-[140px]">
                      <div className="flex items-center justify-end gap-2">
                        {order.paymentStatus === 'UNPAID' && (
                          <button
                            onClick={() => openPaymentMethodModal(order)}
                            disabled={actionLoading === order.orderId}
                            className="h-8 min-w-[96px] px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
                            title="Thanh toán"
                          >
                            Thanh toán
                          </button>
                        )}
                        {enableRefundAction && canRefundOrder(order) && (
                          <button
                            onClick={() => openRefundModal(order)}
                            disabled={actionLoading === order.orderId}
                            className="h-8 px-3 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-60"
                            title="Hoàn tiền"
                          >
                            Hoàn tiền
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showOrderDetailModal && selectedListOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-start md:items-center justify-center bg-slate-900/45 p-4 overflow-y-auto"
          onClick={closeOrderDetailModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Chi tiết đơn {selectedListOrder.orderCode}</h3>
              <button
                type="button"
                onClick={closeOrderDetailModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Cửa hàng:</span> {selectedListOrder.storeName}</p>
              <p><span className="font-semibold">Ngày tạo:</span> {toDateTime(selectedListOrder.createdAt)}</p>
              <p><span className="font-semibold">Ngày thanh toán:</span> {toDateTime(selectedListOrder.paymentDate)}</p>
              <p><span className="font-semibold">Tổng tiền:</span> {formatCurrency(selectedListOrder.totalAmount)}</p>
              <p><span className="font-semibold">Đã thanh toán:</span> {formatCurrency(selectedListOrder.paidAmount)}</p>
              <p><span className="font-semibold">Cần thanh toán:</span> {formatCurrency(selectedListOrder.dueAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {showPaymentMethodModal && selectedPaymentOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-start md:items-center justify-center bg-slate-900/45 p-4 overflow-y-auto"
          onClick={closePaymentMethodModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Chọn phương thức thanh toán</h3>
              <button
                type="button"
                onClick={closePaymentMethodModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm">
              <p><span className="font-semibold">Đơn:</span> {selectedPaymentOrder.orderCode || `#${selectedPaymentOrder.orderId}`}</p>
              <p className="mt-1"><span className="font-semibold">Số tiền:</span> {formatCurrency(selectedPaymentOrder.totalAmount)}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={payOrderByPayOS}
                disabled={actionLoading === selectedPaymentOrder.orderId}
                className="h-11 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                Thanh toán QR (PayOS)
              </button>
              <button
                type="button"
                onClick={payOrderManually}
                disabled={actionLoading === selectedPaymentOrder.orderId}
                className="h-11 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                Xác nhận thanh toán thủ công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PayOS QR Modal */}
      {showQRModal && qrUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-start md:items-center justify-center bg-slate-900/45 p-4 overflow-y-auto"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Thanh toán PayOS</h3>
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Khách hàng quét mã QR để thanh toán
              </p>

              {/* QR Code */}
              <div className="flex justify-center p-6 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                <QRCodeSVG
                  value={qrUrl}
                  size={220}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Mở trang thanh toán
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrUrl)
                    setMessage({ type: 'success', text: 'Đã copy link' })
                  }}
                  className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Copy link
                </button>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 Sau khi thanh toán, PayOS sẽ tự động cập nhật trạng thái đơn hàng
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-start md:items-center justify-center bg-slate-900/45 p-4 overflow-y-auto"
          onClick={() => {
            if (actionLoading === selectedOrder.orderId) return
            setShowRefundConfirm(false)
            setShowRefundModal(false)
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Hoàn tiền đơn {selectedOrder.orderCode}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowRefundConfirm(false)
                  setShowRefundModal(false)
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-sm">
                <span className="font-semibold">Đã thanh toán:</span>{' '}
                {selectedOrder.paidAmount?.toLocaleString('vi-VN')} đ
              </p>
              {selectedOrder.refundedAmount > 0 && (
                <p className="text-sm mt-1">
                  <span className="font-semibold">Đã hoàn:</span>{' '}
                  {selectedOrder.refundedAmount?.toLocaleString('vi-VN')} đ
                </p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!refundForm.policyCode) {
                  setMessage({ type: 'error', text: 'Vui lòng chọn chính sách hoàn tiền' })
                  return
                }
                if (refundPreviewAmount > refundableRemaining) {
                  setMessage({
                    type: 'error',
                    text: `Số tiền hoàn vượt mức còn lại (${formatCurrency(refundableRemaining)}). Vui lòng chọn chính sách khác.`,
                  })
                  return
                }
                setShowRefundConfirm(true)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Chính sách hoàn tiền <span className="text-red-500">*</span>
                </label>
                <select
                  value={refundForm.policyCode}
                  onChange={(e) => setRefundForm({ ...refundForm, policyCode: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                  required
                >
                  <option value="">Chọn chính sách</option>
                  {refundPolicies.map((policy) => (
                    <option key={policy.policyCode} value={policy.policyCode}>
                      {formatRefundPolicyLabel(policy)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ghi chú thêm
                </label>
                <textarea
                  value={refundForm.additionalNote}
                  onChange={(e) => setRefundForm({ ...refundForm, additionalNote: e.target.value })}
                  className="w-full h-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                  placeholder="Mô tả lý do hoàn tiền..."
                />
              </div>

              {selectedRefundPolicy ? (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/15 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Chính sách: <span className="font-semibold">{formatRefundPolicyLabel(selectedRefundPolicy)}</span>
                  </p>
                  <p className="mt-1 text-sm font-bold text-amber-800 dark:text-amber-200">
                    Tiền hoàn dự kiến: {formatCurrency(refundPreviewAmount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Mức hoàn tối đa còn lại: {formatCurrency(refundableRemaining)}
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefundConfirm(false)
                    setShowRefundModal(false)
                  }}
                  className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === selectedOrder.orderId || !refundForm.policyCode || refundPreviewAmount > refundableRemaining}
                  className="h-10 px-4 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60"
                >
                  Tiếp tục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRefundConfirm && selectedOrder && selectedRefundPolicy && (
        <div
          className="fixed inset-0 z-[70] flex items-start md:items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
          onClick={() => actionLoading !== selectedOrder.orderId && setShowRefundConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Xác nhận hoàn tiền</h3>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                Chính sách: <span className="font-semibold">{formatRefundPolicyLabel(selectedRefundPolicy)}</span>
              </p>
              <p>
                Số tiền hoàn: <span className="font-bold text-amber-700 dark:text-amber-300">{formatCurrency(refundPreviewAmount)}</span>
              </p>
              <p className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/15 p-2 text-red-700 dark:text-red-300">
                Thao tác hoàn tiền không thể hoàn tác.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRefundConfirm(false)}
                disabled={actionLoading === selectedOrder.orderId}
                className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={submitRefund}
                disabled={actionLoading === selectedOrder.orderId}
                className="h-10 px-4 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60"
              >
                {actionLoading === selectedOrder.orderId ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
