import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
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
