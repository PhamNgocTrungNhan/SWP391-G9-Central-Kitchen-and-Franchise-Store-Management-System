import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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

export default function CreateProductionBatchPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

  const [productId, setProductId] = useState('1')
  const [quantityPlanned, setQuantityPlanned] = useState('1')
  const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const toastMessage = error || success
  const toastType = error ? 'error' : (success ? 'success' : '')
  const closeToast = () => {
    setError('')
    setSuccess('')
  }

  useEffect(() => {
    if (!toastMessage) return undefined

    const timer = window.setTimeout(() => {
      closeToast()
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const tk = getToken()
    if (!tk) {
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const pid = Number(productId)
    const qty = Number(quantityPlanned)
    if (!pid || pid < 1 || !Number.isFinite(qty) || qty < 1) {
      setError('Mã sản phẩm và số lượng kế hoạch phải lớn hơn 0.')
      return
    }

    if (!mfgDate) {
      setError('Vui lòng nhập ngày sản xuất.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/ProductionBatches`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: pid,
          quantityPlanned: qty,
          mfgDate: new Date(mfgDate).toISOString(),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || data?.title || 'Không thể tạo mẻ sản xuất.')
      }

      setSuccess(data?.message || 'Tạo mẻ sản xuất thành công.')
    } catch (requestError) {
      setError(requestError.message || 'Tạo mẻ sản xuất thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {toastMessage ? (
        <div className="fixed top-4 right-4 z-[80] pointer-events-none">
          <div className="pointer-events-auto w-[min(92vw,24rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            <div className="px-4 py-3 flex items-start gap-3">
              <span className={`material-symbols-outlined mt-0.5 ${toastType === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {toastType === 'success' ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{toastType === 'success' ? 'Thao tác thành công' : 'Có lỗi xảy ra'}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">{toastMessage}</p>
              </div>
              <button
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={closeToast}
                aria-label="Đóng thông báo"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className={`h-1 rounded-b-xl ${toastType === 'success' ? 'bg-emerald-500/80' : 'bg-red-500/80'}`} />
          </div>
        </div>
      ) : null}

      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">precision_manufacturing</span>
          <h2 className="text-lg font-bold leading-tight">Tạo mẻ sản xuất</h2>
        </div>
        <Link
          to="/inventory"
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại tồn kho
        </Link>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Tách riêng luồng tạo mẻ để thao tác nhanh và tránh rối với trang tồn kho.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mã sản phẩm</span>
              <input
                type="number"
                min="1"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Số lượng kế hoạch</span>
              <input
                type="number"
                min="1"
                value={quantityPlanned}
                onChange={(e) => setQuantityPlanned(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ngày sản xuất</span>
              <input
                type="datetime-local"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? 'Đang tạo...' : 'Tạo mẻ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
