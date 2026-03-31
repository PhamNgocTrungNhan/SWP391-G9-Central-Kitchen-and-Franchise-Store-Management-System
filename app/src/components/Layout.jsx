import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { clearAuthStorage, getCurrentUserRole } from '../utils/auth'

export default function Layout() {
  const navigate = useNavigate()
  const currentRole = getCurrentUserRole()

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background-light px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[1920px] gap-3 lg:gap-4">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col rounded-[1.8rem] border border-[#d9cfbf] bg-[#fbf7ef]/95 shadow-[0_18px_40px_rgba(94,77,52,0.10)] backdrop-blur-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7dccd] px-4 py-4 sm:px-5 lg:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8e7a58]">Shop2026</p>
              <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#243428] sm:text-2xl">
                Không gian quản trị
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-[#ddcfbe] bg-[#fff8ed] px-3 py-1 text-xs font-semibold text-[#6f6148]">
                {currentRole || 'USER'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9c9b4] bg-white px-4 text-sm font-semibold text-[#4e5d43] transition hover:bg-[#fff5e7]"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Đăng xuất
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
