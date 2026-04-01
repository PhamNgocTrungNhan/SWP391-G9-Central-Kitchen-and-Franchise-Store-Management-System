import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  useEffect(() => {
    const updateBodyScrollLock = () => {
      const hasOpenModal = Array.from(document.querySelectorAll('div.fixed.inset-0')).some((el) => {
        if (!(el instanceof HTMLElement)) return false
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') return false

        const className = el.className
        const hasBackdropClass = typeof className === 'string' && /bg-(black|slate|gray|zinc|neutral)/.test(className)
        return style.position === 'fixed' && hasBackdropClass
      })

      document.body.style.overflow = hasOpenModal ? 'hidden' : ''
    }

    const observer = new MutationObserver(updateBodyScrollLock)
    observer.observe(document.body, { childList: true, subtree: true })
    updateBodyScrollLock()

    return () => {
      observer.disconnect()
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="min-h-screen bg-background-light px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[1920px] gap-3 lg:gap-4">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col rounded-[1.8rem] border border-[#d9cfbf] bg-[#fbf7ef]/95 shadow-[0_18px_40px_rgba(94,77,52,0.10)] backdrop-blur-sm">
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
