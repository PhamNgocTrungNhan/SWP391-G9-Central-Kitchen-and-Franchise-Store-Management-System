import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getNavigationByRole } from '../data/appSchema'
import { clearAuthStorage, decodeJwtPayload, getCurrentUserRole, getStoredToken } from '../utils/auth'

export default function Sidebar() {
  const navigate = useNavigate()
  const role = getCurrentUserRole()
  const navigationGroups = getNavigationByRole(role)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const resolveDisplayName = () => {
    const payload = decodeJwtPayload(getStoredToken()) || {}
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

  const displayName = resolveDisplayName()

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/', { replace: true })
  }

  return (
    <>
      <aside className={`sticky top-2 hidden h-[calc(100vh-1rem)] min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-[1.8rem] border border-[#d9cfbf] bg-[#f7f0e4]/90 p-4 shadow-[0_18px_40px_rgba(94,77,52,0.08)] backdrop-blur-sm xl:flex transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-[248px] 2xl:w-[260px]'}`}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="rounded-[1.35rem] border border-[#dfd4c4] bg-[#fff8ee] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm flex-shrink-0 ring-2 ring-primary/20">
                <span className="material-symbols-outlined text-[22px]">soup_kitchen</span>
              </div>
              {!isCollapsed && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887654]">Bếp trung tâm</p>
                  <h2 className="mt-1 font-display text-lg font-bold text-kitchen-ink">Central Kitchen</h2>
                </div>
              )}
            </div>
          </div>

          <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
            {navigationGroups.map((group) => (
              <div key={group.title}>
                {!isCollapsed && (
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8e7a58]">
                    {group.title}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={isCollapsed ? item.label : ''}
                      className={({ isActive }) =>
                        [
                          'group flex items-center gap-2 rounded-[1.1rem] border px-2.5 py-2.5 transition duration-150',
                          isCollapsed ? 'justify-center' : 'justify-between',
                          isActive
                            ? 'border-[#c7d8c9] bg-[#eef7ef] text-primary shadow-sm'
                            : 'border-transparent text-[#55624f] hover:border-[#e0d5c5] hover:bg-[#fff9ef]',
                        ].join(' ')
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-white/70 text-[18px] shadow-sm flex-shrink-0">
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </span>
                        {!isCollapsed && (
                          <div>
                            <p className="text-[13px] font-semibold leading-5">{item.label}</p>
                          </div>
                        )}
                      </div>
                      {!isCollapsed && (
                        <span className="material-symbols-outlined text-[18px] text-[#9a8a72] transition group-hover:translate-x-0.5">
                          arrow_forward
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            {navigationGroups.length === 0 && !isCollapsed && (
              <div className="rounded-2xl border border-[#e0d5c5] bg-[#fff9ef] p-3 text-sm text-[#6f644f]">
                Bạn chưa có quyền truy cập màn hình nào.
              </div>
            )}
          </nav>

          {!isCollapsed ? (
            <div className="mt-4 rounded-[1.1rem] border border-[#e0d5c5] bg-[#fff9ef] p-3">
              <p className="text-sm font-semibold text-[#344234] truncate" title={displayName}>{displayName}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8e7a58]">{role || 'USER'}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d9c9b4] bg-white text-sm font-semibold text-[#4e5d43] transition hover:bg-[#fff5e7]"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex h-10 items-center justify-center rounded-xl border border-[#e0d5c5] bg-[#fff9ef] text-[#55624f] transition-colors hover:bg-[#fff8ee]"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mt-3 flex items-center justify-center gap-2 rounded-[1.1rem] border border-[#e0d5c5] bg-[#fff9ef] px-3 py-2.5 text-[#55624f] hover:bg-[#fff8ee] transition-colors"
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
            {!isCollapsed && <span className="text-[13px] font-semibold">Thu gọn</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
