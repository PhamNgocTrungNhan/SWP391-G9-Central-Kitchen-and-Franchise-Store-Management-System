import { pageCatalog } from '../data/appSchema'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

const toneClasses = {
  neutral: 'border-[#ded3c3] bg-[#fff8ee] text-[#6f644f]',
  green: 'border-[#c6dbc7] bg-[#edf7ed] text-[#355e3e]',
  amber: 'border-[#ead7b4] bg-[#fff6dd] text-[#8b641b]',
  blue: 'border-[#c8d6eb] bg-[#eef5ff] text-[#335f86]',
  red: 'border-[#efc5bd] bg-[#fff0ec] text-[#a4482a]',
  stone: 'border-[#d6d0c7] bg-[#f6f1e7] text-[#5e594d]',
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={cx('app-badge', toneClasses[tone], className)}>{children}</span>
}

export function PageHeader({ pageKey }) {
  const page = pageCatalog[pageKey]

  return (
    <section className="mb-6">
      <div className="app-card relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <h1 className="font-display text-[1.9rem] font-bold tracking-tight text-[#203224] sm:text-[2.2rem]">
            {page.title}
          </h1>
        </div>
      </div>
    </section>
  )
}

export function SectionCard({ title, action, children, className = '' }) {
  return (
    <section className={cx('app-card', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#ece1d2] pb-3">
          <div>
            {title && <h2 className="font-display text-lg font-bold tracking-tight text-[#243428] sm:text-xl">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={cx('flex flex-col gap-2', className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7e7056]">{label}</span>
      {children}
    </label>
  )
}

export function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className="app-subcard">
      <Badge tone={tone}>{label}</Badge>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-[#203224] sm:text-3xl">{value}</p>
    </div>
  )
}

const metricToneClasses = {
  blue: {
    card: 'border-blue-200 from-blue-50 to-blue-100',
    text: 'text-blue-600',
    valueText: 'text-blue-900',
    iconBg: 'bg-blue-500',
  },
  green: {
    card: 'border-green-200 from-green-50 to-green-100',
    text: 'text-green-600',
    valueText: 'text-green-900',
    iconBg: 'bg-green-500',
  },
  emerald: {
    card: 'border-emerald-200 from-emerald-50 to-emerald-100',
    text: 'text-emerald-600',
    valueText: 'text-emerald-900',
    iconBg: 'bg-emerald-500',
  },
  purple: {
    card: 'border-purple-200 from-purple-50 to-purple-100',
    text: 'text-purple-600',
    valueText: 'text-purple-900',
    iconBg: 'bg-purple-500',
  },
  amber: {
    card: 'border-amber-200 from-amber-50 to-amber-100',
    text: 'text-amber-600',
    valueText: 'text-amber-900',
    iconBg: 'bg-amber-500',
  },
  red: {
    card: 'border-red-200 from-red-50 to-red-100',
    text: 'text-red-600',
    valueText: 'text-red-900',
    iconBg: 'bg-red-500',
  },
  stone: {
    card: 'border-slate-200 from-slate-50 to-slate-100',
    text: 'text-slate-600',
    valueText: 'text-slate-900',
    iconBg: 'bg-slate-500',
  },
}

export function MetricsStrip({ items = [], columns = 'md:grid-cols-2 lg:grid-cols-4', className = '' }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <div className={cx('grid gap-4', columns, className)}>
      {items.map((item, index) => {
        const tone = metricToneClasses[item?.tone] || metricToneClasses.blue
        const key = item?.key || `${item?.label || 'metric'}-${index}`
        const value = item?.value ?? 0

        return (
          <div
            key={key}
            className={cx('rounded-xl border-2 bg-gradient-to-br p-4 shadow-lg transition-shadow hover:shadow-xl', tone.card, item?.cardClassName || '')}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={cx('text-xs font-semibold uppercase tracking-wider', tone.text)}>{item?.label || 'Thống kê'}</p>
                <p className={cx('mt-1 text-3xl font-bold', tone.valueText)}>{value}</p>
                {item?.note ? <p className={cx('mt-1 text-xs', tone.text)}>{item.note}</p> : null}
              </div>
              <div className={cx('flex h-12 w-12 items-center justify-center rounded-full', tone.iconBg)}>
                <span className="material-symbols-outlined text-[28px] text-white">{item?.icon || 'query_stats'}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function EmptyState({ title, description, icon = 'search_off' }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-[#d9cfbf] bg-[#fff8ee] px-6 py-10 text-center">
      <span className="material-symbols-outlined text-4xl text-[#9c8d73]">{icon}</span>
      <p className="mt-4 font-display text-xl font-bold text-[#2b3c2d]">{title}</p>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}
