import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, Field, PageHeader, SectionCard, StatCard } from '../components/ui'

const statusMeta = {
  AwaitingLink: { label: 'Cho tao link', tone: 'amber' },
  PendingPayment: { label: 'Cho thanh toan', tone: 'blue' },
  Paid: { label: 'Da thanh toan', tone: 'green' },
  RefundRequested: { label: 'Cho hoan tien', tone: 'amber' },
  Refunded: { label: 'Da hoan tien', tone: 'stone' },
}

const policies = [
  { id: 'flex', name: 'Hoan 100% truoc 4 gio giao', sla: '2 gio', rate: '100%' },
  { id: 'standard', name: 'Hoan 80% truoc 2 gio giao', sla: 'Trong ngay', rate: '80%' },
  { id: 'review', name: 'Can kiem duyet sau giao', sla: '24-48 gio', rate: 'Case by case' },
]

const seedOrders = [
  {
    orderId: 6104,
    storeName: 'Store 204',
    status: 'PendingPayment',
    paymentMethod: 'PAYOS_LINK',
    paymentCode: 'PAY-6104-31',
    totalAmount: 1580000,
    outstandingAmount: 1580000,
    createdAt: '2026-03-31T08:45:00',
    dueAt: '2026-03-31T17:30:00',
    notes: 'Don can giao truoc 11h30.',
    items: [
      { id: 9001, name: 'Pizza de song', quantity: 12, lineTotal: 540000 },
      { id: 9002, name: 'Sot ca chua nen', quantity: 10, lineTotal: 280000 },
      { id: 9010, name: 'Pho mai shredded', quantity: 8, lineTotal: 736000 },
    ],
  },
  {
    orderId: 6112,
    storeName: 'Store 101',
    status: 'AwaitingLink',
    paymentMethod: 'PAYOS_LINK',
    paymentCode: 'PAY-6112-04',
    totalAmount: 920000,
    outstandingAmount: 920000,
    createdAt: '2026-03-31T09:25:00',
    dueAt: '2026-04-01T10:00:00',
    notes: 'Cho xac nhan so tien va tao link moi.',
    items: [
      { id: 9022, name: 'Bot mi da dung', quantity: 15, lineTotal: 360000 },
      { id: 9031, name: 'Sot burger signature', quantity: 10, lineTotal: 560000 },
    ],
  },
  {
    orderId: 6077,
    storeName: 'Store 315',
    status: 'RefundRequested',
    paymentMethod: 'PAYOS_LINK',
    paymentCode: 'PAY-6077-88',
    totalAmount: 1320000,
    outstandingAmount: 0,
    createdAt: '2026-03-29T14:05:00',
    dueAt: '2026-03-29T16:30:00',
    notes: 'Khach bao giao thieu hang, dang doi hoan tien.',
    items: [
      { id: 9018, name: 'Bot phu gion', quantity: 24, lineTotal: 600000 },
      { id: 9042, name: 'La hung tuoi', quantity: 16, lineTotal: 720000 },
    ],
  },
]

function money(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0)
}

function dateTime(value) {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toIncomingOrder(raw) {
  if (!raw || typeof raw !== 'object') return null

  const orderId = Number(raw.orderId || raw.id)
  if (!orderId) return null

  const items = Array.isArray(raw.orderDetails) ? raw.orderDetails : Array.isArray(raw.items) ? raw.items : []
  const normalizedItems = items.map((item, index) => ({
    id: Number(item.productId || item.id || index + 1),
    name: item.productName || item.name || `San pham #${item.productId || item.id || index + 1}`,
    quantity: Number(item.quantityOrdered || item.quantity || 0),
    lineTotal: Number(item.lineTotal || item.total || 0),
  }))

  return {
    orderId,
    storeName: raw.storeName || `Store ${raw.storeId || 'N/A'}`,
    status: raw.paymentStatus || 'PendingPayment',
    paymentMethod: raw.paymentMethod || 'PAYOS_LINK',
    paymentCode: raw.paymentCode || `ORDER-${orderId}`,
    totalAmount: Number(raw.totalAmount || raw.amount || 0),
    outstandingAmount: Number(raw.outstandingAmount || raw.totalAmount || raw.amount || 0),
    createdAt: raw.createdAt || raw.orderDate || raw.expectedDeliveryDate,
    dueAt: raw.dueAt || raw.expectedDeliveryDate,
    notes: raw.notes || raw.rejectReason || 'Du lieu duoc mo tu man hinh don hang.',
    items: normalizedItems,
  }
}

export default function PaymentsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const incomingOrder = useMemo(() => toIncomingOrder(location.state?.order), [location.state])
  const orders = useMemo(
    () => (incomingOrder ? [incomingOrder, ...seedOrders.filter((item) => item.orderId !== incomingOrder.orderId)] : seedOrders),
    [incomingOrder],
  )
  const requestedId = Number(searchParams.get('orderId'))
  const [filter, setFilter] = useState({ q: '', status: 'All' })
  const [selectedId, setSelectedId] = useState(requestedId || incomingOrder?.orderId || seedOrders[0].orderId)
  const [draft, setDraft] = useState({
    method: 'PAYOS_LINK',
    returnUrl: `${origin}/success`,
    cancelUrl: `${origin}/cancel`,
    refundPolicy: policies[0].id,
    refundReason: '',
  })

  const filteredOrders = useMemo(() => {
    const q = filter.q.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = filter.status === 'All' || order.status === filter.status
      const matchesQuery = !q
        || String(order.orderId).includes(q)
        || order.storeName.toLowerCase().includes(q)
        || order.paymentCode.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [filter, orders])

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedId(null)
      return
    }
    if (requestedId && filteredOrders.some((order) => order.orderId === requestedId)) {
      setSelectedId(requestedId)
      return
    }
    if (!filteredOrders.some((order) => order.orderId === selectedId)) {
      setSelectedId(filteredOrders[0].orderId)
    }
  }, [filteredOrders, requestedId, selectedId])

  const selectedOrder = filteredOrders.find((order) => order.orderId === selectedId)
    || orders.find((order) => order.orderId === selectedId)
    || null

  const stats = {
    pending: orders.filter((order) => order.status === 'AwaitingLink' || order.status === 'PendingPayment').length,
    paid: orders.filter((order) => order.status === 'Paid').length,
    refunding: orders.filter((order) => order.status === 'RefundRequested' || order.status === 'Refunded').length,
    receivable: orders.reduce((sum, order) => sum + Number(order.outstandingAmount || 0), 0),
  }

  function preview(pathname) {
    if (!selectedOrder) return

    const params = new URLSearchParams({
      orderId: String(selectedOrder.orderId),
      amount: String(selectedOrder.outstandingAmount || selectedOrder.totalAmount),
      code: selectedOrder.paymentCode,
      method: draft.method === 'PAYOS_LINK' ? 'PayOS link' : 'Manual confirm',
      store: selectedOrder.storeName,
    })

    navigate(`${pathname}?${params.toString()}`)
  }

  return (
    <div>
      <PageHeader pageKey="payments" />

      <div className="space-y-6">
        <SectionCard title="Workspace thanh toan">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Dang cho xu ly" value={stats.pending} tone="amber" />
            <StatCard label="Da thanh toan" value={stats.paid} tone="green" />
            <StatCard label="Hoan tien" value={stats.refunding} tone="stone" />
            <StatCard label="Cong no hien tai" value={money(stats.receivable)} tone="blue" />
          </div>
        </SectionCard>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <SectionCard title="Danh sach giao dich">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <Field label="Tim nhanh">
                <input
                  className="app-input"
                  value={filter.q}
                  onChange={(event) => setFilter((current) => ({ ...current, q: event.target.value }))}
                  placeholder="Nhap order id, store hoac payment code"
                />
              </Field>

              <Field label="Trang thai">
                <select
                  className="app-input"
                  value={filter.status}
                  onChange={(event) => setFilter((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="All">Tat ca</option>
                  {Object.keys(statusMeta).map((status) => (
                    <option key={status} value={status}>{statusMeta[status].label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-5 space-y-3">
              {filteredOrders.length ? filteredOrders.map((order) => (
                <button
                  key={order.orderId}
                  type="button"
                  onClick={() => setSelectedId(order.orderId)}
                  className={`w-full rounded-[1.35rem] border p-4 text-left transition ${selectedId === order.orderId ? 'border-[#c6dbc7] bg-[#eef7ef]' : 'border-[#e7dccd] bg-[#fffdf8] hover:bg-[#fff9ef]'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-bold tracking-tight text-[#213323]">Order #{order.orderId}</p>
                      <p className="mt-1 text-sm text-slate-600">{order.storeName} | {order.paymentCode}</p>
                    </div>
                    <Badge tone={statusMeta[order.status]?.tone || 'neutral'}>{statusMeta[order.status]?.label || order.status}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.1rem] border border-[#ece1d2] bg-[#fff8ef] px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Tong tien</p>
                      <p className="mt-2 text-base font-bold text-[#263626]">{money(order.totalAmount)}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[#ece1d2] bg-[#fff8ef] px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Con phai thu</p>
                      <p className="mt-2 text-base font-bold text-[#263626]">{money(order.outstandingAmount)}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[#ece1d2] bg-[#fff8ef] px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Han thanh toan</p>
                      <p className="mt-2 text-sm font-semibold text-[#263626]">{dateTime(order.dueAt)}</p>
                    </div>
                  </div>
                </button>
              )) : (
                <EmptyState
                  title="Khong co giao dich phu hop"
                  description="Thu doi bo loc de chon lai don can tao link, ghi nhan thanh toan hoac xu ly hoan tien."
                  icon="payments"
                />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Chi tiet thanh toan">
            {!selectedOrder ? (
              <EmptyState
                title="Chua chon don hang"
                description="Danh sach hien khong co ban ghi nao phu hop voi bo loc hien tai."
                icon="receipt_long"
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-[1.4rem] border border-[#d8cebf] bg-[linear-gradient(135deg,rgba(35,83,46,0.08),rgba(226,178,92,0.08))] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b7652]">Internal order</p>
                      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#203224]">#{selectedOrder.orderId}</h2>
                      <p className="mt-1 text-sm text-slate-600">{selectedOrder.storeName} | Tao luc {dateTime(selectedOrder.createdAt)}</p>
                    </div>
                    <Badge tone={statusMeta[selectedOrder.status]?.tone || 'neutral'}>{statusMeta[selectedOrder.status]?.label || selectedOrder.status}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.1rem] border border-white/60 bg-white/70 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">So mat hang</p>
                      <p className="mt-2 text-lg font-bold text-[#263626]">{selectedOrder.items.length}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/60 bg-white/70 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Tong thanh toan</p>
                      <p className="mt-2 text-lg font-bold text-[#263626]">{money(selectedOrder.totalAmount)}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-white/60 bg-white/70 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7a59]">Con phai thu</p>
                      <p className="mt-2 text-lg font-bold text-[#263626]">{money(selectedOrder.outstandingAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="app-subcard">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-lg font-bold text-[#243428]">Dong san pham</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={`${selectedOrder.orderId}-${item.id}`} className="rounded-[1.15rem] border border-[#ece1d2] bg-[#fff8ef] px-3.5 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[#263626]">{item.name}</p>
                            <p className="mt-1 text-sm text-slate-500">Product #{item.id} | So luong {item.quantity}</p>
                          </div>
                          <p className="text-sm font-semibold text-[#263626]">{money(item.lineTotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="app-subcard">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-display text-lg font-bold text-[#243428]">Tao link va callback</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-[1.15rem] border px-4 py-4 text-left ${draft.method === 'PAYOS_LINK' ? 'border-[#c6dbc7] bg-[#eef7ef]' : 'border-[#e7dccd] bg-[#fffdf8]'}`}
                      onClick={() => setDraft((current) => ({ ...current, method: 'PAYOS_LINK' }))}
                    >
                      <p className="font-semibold text-[#263626]">PayOS link</p>
                    </button>
                    <button
                      type="button"
                      className={`rounded-[1.15rem] border px-4 py-4 text-left ${draft.method === 'MANUAL_CONFIRM' ? 'border-[#c6dbc7] bg-[#eef7ef]' : 'border-[#e7dccd] bg-[#fffdf8]'}`}
                      onClick={() => setDraft((current) => ({ ...current, method: 'MANUAL_CONFIRM' }))}
                    >
                      <p className="font-semibold text-[#263626]">Manual confirm</p>
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <Field label="Return URL">
                      <input className="app-input" value={draft.returnUrl} onChange={(event) => setDraft((current) => ({ ...current, returnUrl: event.target.value }))} />
                    </Field>
                    <Field label="Cancel URL">
                      <input className="app-input" value={draft.cancelUrl} onChange={(event) => setDraft((current) => ({ ...current, cancelUrl: event.target.value }))} />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button type="button" className="app-button-primary" onClick={() => preview('/success')}>
                      <span className="material-symbols-outlined text-[18px]">north_east</span>
                      Preview success
                    </button>
                    <button type="button" className="app-button-secondary" onClick={() => preview('/cancel')}>
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      Preview cancel
                    </button>
                  </div>
                </div>

                <div className="app-subcard">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-display text-lg font-bold text-[#243428]">Hoan tien</p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {policies.map((policy) => (
                      <button
                        key={policy.id}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, refundPolicy: policy.id }))}
                        className={`rounded-[1.1rem] border px-4 py-3 text-left ${draft.refundPolicy === policy.id ? 'border-[#ead7b4] bg-[#fff6dd]' : 'border-[#ece1d2] bg-[#fffdf8]'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#263626]">{policy.name}</p>
                            <p className="mt-1 text-sm text-slate-500">SLA: {policy.sla}</p>
                          </div>
                          <Badge tone="amber">{policy.rate}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>

                  <Field className="mt-4" label="Ly do hoan tien">
                    <textarea
                      className="app-textarea"
                      value={draft.refundReason}
                      onChange={(event) => setDraft((current) => ({ ...current, refundReason: event.target.value }))}
                      placeholder="Nhap ly do hoan tien"
                    />
                  </Field>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
