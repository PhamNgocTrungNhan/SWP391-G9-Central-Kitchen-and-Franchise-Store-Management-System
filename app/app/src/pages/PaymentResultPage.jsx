import { Link, useSearchParams } from 'react-router-dom'
import { Badge, SectionCard } from '../components/ui'

const variantMeta = {
  success: {
    icon: 'check_circle',
    tone: 'green',
    badge: 'Thanh toan thanh cong',
    title: 'Giao dich da duoc ghi nhan',
    panelClass: 'border-[#c6dbc7] bg-[linear-gradient(135deg,rgba(42,102,54,0.10),rgba(211,232,214,0.75))]',
  },
  cancel: {
    icon: 'cancel',
    tone: 'red',
    badge: 'Thanh toan bi huy',
    title: 'Giao dich chua hoan tat',
    panelClass: 'border-[#efc5bd] bg-[linear-gradient(135deg,rgba(173,69,46,0.08),rgba(255,239,236,0.92))]',
  },
}

function money(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0)
}

export default function PaymentResultPage({ variant = 'success' }) {
  const meta = variantMeta[variant] || variantMeta.success
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || 'N/A'
  const amount = searchParams.get('amount') || '0'
  const code = searchParams.get('code') || 'No-code'
  const method = searchParams.get('method') || 'PayOS link'
  const store = searchParams.get('store') || 'Store N/A'

  return (
    <div className="min-h-screen bg-background-light px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center">
        <div className="w-full space-y-6">
          <section className={`rounded-[1.8rem] border p-6 shadow-[0_20px_48px_rgba(94,77,52,0.12)] ${meta.panelClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone={meta.tone}>{meta.badge}</Badge>
                <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#203224] sm:text-4xl">{meta.title}</h1>
              </div>
              <div className="flex size-16 items-center justify-center rounded-[1.4rem] bg-white/70 text-[#27402b] shadow-sm">
                <span className="material-symbols-outlined text-[34px]">{meta.icon}</span>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SectionCard title="Tom tat callback">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="app-subcard">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Order</p>
                  <p className="mt-2 text-xl font-bold text-[#243428]">#{orderId}</p>
                  <p className="mt-1 text-sm text-slate-500">{store}</p>
                </div>
                <div className="app-subcard">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">So tien</p>
                  <p className="mt-2 text-xl font-bold text-[#243428]">{money(amount)}</p>
                  <p className="mt-1 text-sm text-slate-500">{method}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.2rem] border border-[#ece1d2] bg-[#fff8ef] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Ma giao dich</p>
                <p className="mt-2 text-base font-semibold text-[#243428]">{code}</p>
              </div>
            </SectionCard>

            <SectionCard title="Dieu huong tiep theo">
              <div className="space-y-3">
                <Link to={`/payments?orderId=${encodeURIComponent(orderId)}`} className="app-button-primary w-full">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  Quay lai thanh toan
                </Link>
                <Link to="/store-orders" className="app-button-secondary w-full">
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                  Ve don cua hang
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
