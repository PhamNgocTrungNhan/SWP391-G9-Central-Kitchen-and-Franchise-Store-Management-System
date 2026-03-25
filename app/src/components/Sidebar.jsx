import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getNavigationByRole } from '../data/appSchema'
import { getCurrentUserRole } from '../utils/auth'

export default function Sidebar() {
  const role = getCurrentUserRole()
  const navigationGroups = getNavigationByRole(role)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <>
      <aside className={`sticky top-2 hidden h-[calc(100vh-1rem)] min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-[1.8rem] border border-[#d9cfbf] bg-[#f7f0e4]/90 p-4 shadow-[0_18px_40px_rgba(94,77,52,0.08)] backdrop-blur-sm xl:flex transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-[248px] 2xl:w-[260px]'}`}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="rounded-[1.35rem] border border-[#dfd4c4] bg-[#fff8ee] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">storefront</span>
              </div>
              {!isCollapsed && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887654]">Hệ thống</p>
                  <h2 className="mt-1 font-display text-lg font-bold text-[#223223]">Shop2026</h2>
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

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mt-4 flex items-center justify-center gap-2 rounded-[1.1rem] border border-[#e0d5c5] bg-[#fff9ef] px-3 py-2.5 text-[#55624f] hover:bg-[#fff8ee] transition-colors"
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
