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

export function EmptyState({ title, description, icon = 'search_off' }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-[#d9cfbf] bg-[#fff8ee] px-6 py-10 text-center">
      <span className="material-symbols-outlined text-4xl text-[#9c8d73]">{icon}</span>
      <p className="mt-4 font-display text-xl font-bold text-[#2b3c2d]">{title}</p>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}
