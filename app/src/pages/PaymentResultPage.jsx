import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { Badge, SectionCard } from '../components/ui'
import { useEffect, useState } from 'react'

const variantMeta = {
  success: {
    icon: 'check_circle',
    tone: 'green',
    badge: 'Thanh toán thành công',
    title: 'Giao dịch đã được ghi nhận',
    panelClass: 'border-[#c6dbc7] bg-[linear-gradient(135deg,rgba(42,102,54,0.10),rgba(211,232,214,0.75))]',
  },
  cancel: {
    icon: 'cancel',
    tone: 'orange',
    badge: 'Thanh toán bị hủy',
    title: 'Giao dịch chưa hoàn tất',
    panelClass: 'border-[#f5d5a8] bg-[linear-gradient(135deg,rgba(184,134,11,0.08),rgba(255,250,240,0.92))]',
  },
  error: {
    icon: 'error',
    tone: 'red',
    badge: 'Thanh toán thất bại',
    title: 'Giao dịch không thành công',
    panelClass: 'border-[#efc5bd] bg-[linear-gradient(135deg,rgba(173,69,46,0.08),rgba(255,239,236,0.92))]',
  },
}

function money(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0)
}

function formatVnpayDate(vnpPayDate) {
  if (!vnpPayDate || vnpPayDate.length !== 14) return 'N/A'
  const year = vnpPayDate.substring(0, 4)
  const month = vnpPayDate.substring(4, 6)
  const day = vnpPayDate.substring(6, 8)
  const hour = vnpPayDate.substring(8, 10)
  const minute = vnpPayDate.substring(10, 12)
  const second = vnpPayDate.substring(12, 14)
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`
}

export default function PaymentResultPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [variant, setVariant] = useState('success')
  const [orderId, setOrderId] = useState('N/A')
  const [amount, setAmount] = useState('0')
  const [code, setCode] = useState('No-code')
  const [method, setMethod] = useState('VNPAY')
  const [transactionDate, setTransactionDate] = useState('N/A')
  const [autoConfirming, setAutoConfirming] = useState(false)
  const [autoConfirmError, setAutoConfirmError] = useState('')
  const [showManualButton, setShowManualButton] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    const vnpResponseCode = searchParams.get('vnp_ResponseCode')
    const vnpTransactionStatus = searchParams.get('vnp_TransactionStatus')
    const vnpAmount = searchParams.get('vnp_Amount')
    const vnpTxnRef = searchParams.get('vnp_TxnRef')
    const vnpTransactionNo = searchParams.get('vnp_TransactionNo')
    const vnpBankCode = searchParams.get('vnp_BankCode')
    const vnpPayDate = searchParams.get('vnp_PayDate')

    if (vnpResponseCode) {
      if (vnpAmount) {
        setAmount(String(Number(vnpAmount) / 100))
      }

      if (vnpTxnRef) {
        const extractedOrderId = vnpTxnRef.split('_')[0]
        setOrderId(extractedOrderId)
      }

      if (vnpTransactionNo) {
        setCode(vnpTransactionNo)
      }

      if (vnpBankCode) {
        setMethod(`VNPAY - ${vnpBankCode}`)
      } else {
        setMethod('VNPAY')
      }

      if (vnpPayDate) {
        setTransactionDate(formatVnpayDate(vnpPayDate))
      }

      if (vnpResponseCode === '00' && vnpTransactionStatus === '00') {
        setVariant('success')

        const autoConfirmPayment = async () => {
          if (vnpTxnRef) {
            const extractedOrderId = vnpTxnRef.split('_')[0]
            if (extractedOrderId && !isNaN(extractedOrderId)) {
              setAutoConfirming(true)

              try {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                const response = await fetch(`${apiBase}/internal-orders/${extractedOrderId}/pay`, {
                  method: 'POST',
                  headers: {
                    accept: '*/*',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                })

                if (response.ok) {
                  // Hiển thị modal thành công
                  setAutoConfirming(false)
                  setShowSuccessModal(true)

                  setTimeout(() => {
                    window.location.href = '/store-orders'
                  }, 2000)
                } else {
                  const data = await response.json().catch(() => ({}))
                  setAutoConfirmError(data?.message || 'Không thể tự động xác nhận')
                  setShowManualButton(true)
                  setAutoConfirming(false)
                }
              } catch (error) {
                setAutoConfirmError('Lỗi kết nối: ' + error.message)
                setShowManualButton(true)
                setAutoConfirming(false)
              }
            }
          }
        }

        autoConfirmPayment()
      } else if (vnpResponseCode === '24') {
        setVariant('cancel')
      } else {
        setVariant('error')
        setAutoConfirmError(`Mã lỗi VNPAY: ${vnpResponseCode}`)
      }
    } else {
      const statusParam = searchParams.get('status')
      const orderIdParam = searchParams.get('orderId')
      const amountParam = searchParams.get('amount')
      const codeParam = searchParams.get('code')
      const methodParam = searchParams.get('method')

      if (statusParam === 'cancel') {
        setVariant('cancel')
      } else if (statusParam === 'error') {
        setVariant('error')
      } else {
        setVariant('success')
      }

      if (orderIdParam) setOrderId(orderIdParam)
      if (amountParam) setAmount(amountParam)
      if (codeParam) setCode(codeParam)
      if (methodParam) setMethod(methodParam)
    }
  }, [searchParams, location.search, apiBase])

  const meta = variantMeta[variant] || variantMeta.success

  return (
    <div className="min-h-screen bg-background-light px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center">
        <div className="w-full space-y-6">
          {autoConfirming ? (
            <section className="rounded-[1.8rem] border border-green-200 bg-green-50 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-green-900">
                    Đang xác nhận thanh toán...
                  </h1>
                  <p className="mt-1 text-sm text-green-700">
                    Vui lòng chờ, bạn sẽ được chuyển về trang đơn hàng
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className={`rounded-[1.8rem] border p-6 shadow-[0_20px_48px_rgba(94,77,52,0.12)] ${meta.panelClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge tone={meta.tone}>{meta.badge}</Badge>
                    <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#203224] sm:text-4xl">{meta.title}</h1>
                    {autoConfirmError && (
                      <p className="mt-2 text-sm text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                        {autoConfirmError}
                      </p>
                    )}
                  </div>
                  <div className="flex size-16 items-center justify-center rounded-[1.4rem] bg-white/70 text-[#27402b] shadow-sm">
                    <span className="material-symbols-outlined text-[34px]">{meta.icon}</span>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <SectionCard title="Chi tiết giao dịch">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="app-subcard">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Mã đơn hàng</p>
                        <p className="mt-2 text-xl font-bold text-[#243428]">{orderId}</p>
                      </div>
                      <div className="app-subcard">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Mã giao dịch</p>
                        <p className="mt-2 text-xl font-bold text-[#243428]">{code}</p>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border-2 border-dashed border-[#d4c5a9] bg-white px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Thời gian</p>
                          <p className="mt-1 text-sm text-[#243428]">{transactionDate}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Phương thức</p>
                          <p className="mt-1 text-sm text-[#243428]">{method}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-[#ece1d2] bg-[#fffbf5] px-6 py-5 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Số tiền thanh toán</p>
                      <p className="mt-2 text-3xl font-bold text-[#243428]">{money(amount)}</p>
                    </div>
                  </div>

                  {variant === 'error' && (
                    <div className="mt-4 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700">Lý do thất bại</p>
                      <p className="mt-2 text-sm text-red-600">
                        {searchParams.get('vnp_ResponseCode') === '07' && 'Giao dịch nghi ngờ (liên hệ ngân hàng)'}
                        {searchParams.get('vnp_ResponseCode') === '09' && 'Thẻ chưa đăng ký dịch vụ'}
                        {searchParams.get('vnp_ResponseCode') === '10' && 'Xác thực thông tin thất bại'}
                        {searchParams.get('vnp_ResponseCode') === '11' && 'Hết hạn chờ thanh toán'}
                        {searchParams.get('vnp_ResponseCode') === '51' && 'Tài khoản không đủ số dư'}
                        {!['07', '09', '10', '11', '51'].includes(searchParams.get('vnp_ResponseCode')) && 'Vui lòng thử lại hoặc liên hệ hỗ trợ'}
                      </p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Điều hướng">
                  <div className="space-y-3">
                    <Link to="/store-orders" className="app-button-primary w-full">
                      <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                      Về đơn cửa hàng
                    </Link>
                    {variant === 'success' && showManualButton && (
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

                          try {
                            const response = await fetch(`${apiBase}/internal-orders/${orderId}/pay`, {
                              method: 'POST',
                              headers: {
                                accept: '*/*',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                            })

                            if (response.ok) {
                              alert('Đã xác nhận thanh toán thành công!')
                              window.location.href = '/store-orders'
                            } else {
                              const data = await response.json().catch(() => ({}))
                              alert('Không thể xác nhận thanh toán: ' + (data?.message || response.status))
                            }
                          } catch (error) {
                            alert('Lỗi: ' + error.message)
                          }
                        }}
                        className="app-button-secondary w-full bg-orange-600 text-white hover:bg-orange-700"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Xác nhận thanh toán thủ công
                      </button>
                    )}
                    {variant === 'success' && !showManualButton && (
                      <button
                        onClick={() => window.location.reload()}
                        className="app-button-secondary w-full"
                      >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                        Làm mới trang
                      </button>
                    )}
                  </div>

                  <div className="mt-6 rounded-lg border border-[#e5dcc8] bg-[#fffcf7] px-4 py-3">
                    <p className="text-xs text-[#6b5d47] leading-relaxed">
                      Cảm ơn bạn đã sử dụng dịch vụ. Nếu có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ.
                    </p>
                  </div>
                </SectionCard>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success Modal - Fixed center screen */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white p-6 shadow-2xl animate-[scale-in_0.2s_ease-out]">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100 mb-4">
                <span className="material-symbols-outlined text-[40px] text-green-600">check_circle</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-green-900 mb-2">
                Thanh toán thành công!
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Đơn hàng {orderId} đã được xác nhận thanh toán
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                <span>Đang chuyển về trang đơn hàng...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
