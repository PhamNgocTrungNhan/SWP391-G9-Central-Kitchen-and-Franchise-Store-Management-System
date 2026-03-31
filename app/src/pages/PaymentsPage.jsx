import { useEffect, useState } from 'react'
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

export default function PaymentsPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)

  // Refund modal states
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [refundPolicies, setRefundPolicies] = useState([])
  const [refundForm, setRefundForm] = useState({
    policyCode: '',
    additionalNote: ''
  })

  // PayOS QR modal states
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrUrl, setQrUrl] = useState('')

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
      const normalized = (Array.isArray(data) ? data : []).map((item) => ({
        orderId: item.orderId || item.internalOrderId || item.id,
        orderCode: item.orderCode || `#${item.orderId}`,
        storeName: item.store?.storeName || item.store?.name || `Store #${item.storeId}`,
        createdAt: item.createdAt,
        paymentStatus: item.paymentStatus || 'UNPAID',
        totalAmount: item.totalAmount || 0,
        paidAmount: item.paidAmount || 0,
        refundedAmount: item.refundedAmount || 0,
      }))

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

  const payManually = async (orderId) => {
    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập' })
      return
    }

    if (!window.confirm('Xác nhận đã nhận tiền mặt/chuyển khoản?')) return

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

  const openRefundModal = (order) => {
    if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL_REFUND') {
      setMessage({ type: 'error', text: 'Chỉ đơn đã thanh toán mới có thể hoàn tiền' })
      return
    }

    setSelectedOrder(order)
    setRefundForm({ policyCode: '', additionalNote: '' })
    setShowRefundModal(true)

    if (refundPolicies.length === 0) {
      fetchRefundPolicies()
    }
  }

  const submitRefund = async (e) => {
    e.preventDefault()

    if (!refundForm.policyCode) {
      setMessage({ type: 'error', text: 'Vui lòng chọn chính sách hoàn tiền' })
      return
    }

    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập' })
      return
    }

    setActionLoading(selectedOrder.orderId)
    try {
      const response = await fetch(`${apiBase}/internal-orders/${selectedOrder.orderId}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policyCode: refundForm.policyCode,
          additionalNote: refundForm.additionalNote || '',
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || 'Không thể hoàn tiền')
      }

      const data = await response.json()
      setMessage({ type: 'success', text: data?.message || 'Đã hoàn tiền thành công' })
      setShowRefundModal(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
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

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
          <h2 className="text-lg font-bold leading-tight">Thanh toán & Hoàn tiền</h2>
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
        <div>
          <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Tạo link PayOS QR, xác nhận thanh toán thủ công, và hoàn tiền theo chính sách
          </p>
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

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Không có đơn hàng</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn hàng</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Cửa hàng</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tạo</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng tiền</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{order.orderCode}</td>
                    <td className="px-4 py-3 text-sm">{order.storeName}</td>
                    <td className="px-4 py-3 text-xs">{toShortDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {order.totalAmount?.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${paymentStatusStyle[order.paymentStatus] || paymentStatusStyle.UNPAID
                          }`}
                      >
                        {paymentStatusLabel[order.paymentStatus] || order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.paymentStatus === 'UNPAID' && (
                          <>
                            <button
                              onClick={() => createPayOSLink(order.orderId)}
                              disabled={actionLoading === order.orderId}
                              className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                              title="Tạo link PayOS QR"
                            >
                              QR
                            </button>
                            <button
                              onClick={() => payManually(order.orderId)}
                              disabled={actionLoading === order.orderId}
                              className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                              title="Xác nhận thanh toán thủ công"
                            >
                              Xác nhận
                            </button>
                          </>
                        )}
                        {(order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL_REFUND') && (
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

      {/* PayOS QR Modal */}
      {showQRModal && qrUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          onClick={() => setShowRefundModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Hoàn tiền đơn {selectedOrder.orderCode}</h3>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
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

            <form onSubmit={submitRefund} className="space-y-4">
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
                      {policy.displayName} ({policy.refundPercentage}%)
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

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === selectedOrder.orderId}
                  className="h-10 px-4 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60"
                >
                  {actionLoading === selectedOrder.orderId ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
