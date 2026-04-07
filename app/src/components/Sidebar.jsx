import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getNavigationByRole } from '../data/appSchema'
import { clearAuthStorage, decodeJwtPayload, getCurrentUserRole, getStoredToken } from '../utils/auth'

export default function Sidebar() {
  const navigate = useNavigate()
  const role = getCurrentUserRole()
  const navigationGroups = getNavigationByRole(role)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })

  const payload = decodeJwtPayload(getStoredToken()) || {}

  const resolveDisplayName = () => {
    const raw = payload?.fullName
      || payload?.full_name
      || payload?.name
      || payload?.unique_name
      || payload?.preferred_username
      || payload?.username
      || payload?.email

    if (String(raw || '').trim()) return String(raw).trim()
    if (role === 'ADMIN') return 'Admin'
    return 'Người dùng'
  }

  const resolveDisplayEmail = () => {
    const raw = payload?.email || payload?.preferred_username || payload?.username || payload?.sub
    if (String(raw || '').trim()) return String(raw).trim()
    return 'user@company.local'
  }

  const displayName = resolveDisplayName()
  const displayEmail = resolveDisplayEmail()

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0')
    } catch {
      // Ignore storage errors (private mode, restricted env, etc.)
    }
  }, [isCollapsed])

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/', { replace: true })
  }

  const getInitial = (name) => String(name || 'U').trim().charAt(0).toUpperCase()

  return (
    <aside className={`sticky top-2 hidden h-[calc(100vh-1rem)] min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-[1.2rem] border border-[#d5d9dc] bg-[#f4f5f7] p-3 shadow-[0_12px_28px_rgba(20,27,40,0.08)] backdrop-blur-sm xl:flex transition-all duration-300 ${isCollapsed ? 'w-[84px]' : 'w-[272px]'}`}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 pb-3">
          {!isCollapsed ? (
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#d9dde0] bg-white px-2.5 text-left text-[#1d2633] shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#5f6470] text-[11px] font-semibold text-white">
                  {getInitial(displayName)}
                </span>
                <span className="truncate text-sm font-semibold">AUTUMN CENTRAL</span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-[#5e6673]">expand_more</span>
            </button>
          ) : (
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9dde0] bg-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5f6470] text-[11px] font-semibold text-white">
                {getInitial(displayName)}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#d9dde0] bg-white text-[#4f5a67] transition-colors hover:bg-[#edf1f4] ${isCollapsed ? 'mx-auto mt-2' : ''}`}
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              {!isCollapsed && (
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a9099]">
                  {group.title}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'group relative flex items-center rounded-lg transition-all duration-150',
                        isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-start gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-[#dff1e8] text-[#1d6348] shadow-[inset_0_0_0_1px_rgba(39,109,80,0.12)]'
                          : 'text-[#303947] hover:bg-[#e9ecef]',
                      ].join(' ')
                    }
                  >
                    <span className="material-symbols-outlined text-[19px] leading-none">{item.icon}</span>
                    {!isCollapsed && <span className="truncate text-[13px] font-semibold">{item.label}</span>}

                    {isCollapsed && (
                      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-[#2b3340] px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {navigationGroups.length === 0 && !isCollapsed && (
            <div className="rounded-lg border border-[#d9dde0] bg-white p-3 text-sm text-[#4b5563]">
              Bạn chưa có quyền truy cập màn hình nào.
            </div>
          )}
        </nav>

        {!isCollapsed ? (
          <div className="mt-3 rounded-xl border border-[#d9dde0] bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#eceff3] text-sm font-semibold text-[#303947]">
                {getInitial(displayName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1f2937]" title={displayName}>{displayName}</p>
                <p className="truncate text-[11px] text-[#8a9099]" title={displayEmail}>{displayEmail}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d9dde0] bg-[#f8fafb] text-[13px] font-semibold text-[#374151] transition hover:bg-[#eef2f5]"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#303947]">
              {getInitial(displayName)}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9dde0] bg-white text-[#4f5a67] transition-colors hover:bg-[#edf1f4]"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
