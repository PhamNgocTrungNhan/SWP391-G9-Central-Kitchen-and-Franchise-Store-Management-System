import { useNavigate } from 'react-router-dom'

const modules = [
  'Dashboard summaries',
  'Category CRUD',
  'Stores and kitchens',
  'Inventory operations',
  'Internal order actions',
  'Production batches',
  'User CRUD',
]

export default function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background-light px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1380px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="app-card relative overflow-hidden">
          <div className="absolute -left-16 top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-[#c98f47]/10 blur-3xl" />
          <div className="relative">
            <h1 className="max-w-xl font-display text-5xl font-bold tracking-tight text-[#213223]">
              Shop2026 Operations Hub
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Sign in to manage categories, organization units, inventory, internal orders, production batches, recipes, and users.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {modules.map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                  <p className="text-sm font-semibold text-[#2f4031]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="app-card flex items-center justify-center">
          <div className="w-full max-w-lg">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#223323]">Sign in</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Use your account to access the system.
            </p>

            <div className="mt-8 space-y-5">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6d54]">Username</span>
                <input className="app-input" placeholder="admin" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6d54]">Password</span>
                <input className="app-input" placeholder="password" type="password" />
              </label>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button className="app-button-primary" onClick={() => navigate('/dashboard')}>
                <span className="material-symbols-outlined text-[18px]">login</span>
                Sign in
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
