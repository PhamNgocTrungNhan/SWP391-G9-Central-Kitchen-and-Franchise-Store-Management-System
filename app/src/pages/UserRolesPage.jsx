import { useState } from 'react'

const roles = [
    { icon: 'admin_panel_settings', name: 'Admin', desc: 'Full access to all modules' },
    { icon: 'manage_accounts', name: 'Manager', desc: 'Operational oversight' },
    { icon: 'soup_kitchen', name: 'CK Staff', desc: 'Production & inventory' },
    { icon: 'storefront', name: 'Store Staff', desc: 'Orders & receiving' },
    { icon: 'local_shipping', name: 'Supply Coordinator', desc: 'Logistics & dispatch' },
]

const modules = [
    { icon: 'inventory_2', name: 'Inventory' },
    { icon: 'receipt_long', name: 'Orders' },
    { icon: 'conveyor_belt', name: 'Production' },
    { icon: 'analytics', name: 'Reports' },
    { icon: 'settings', name: 'System Settings' },
]

export default function UserRolesPage() {
    const [activeRole, setActiveRole] = useState(0)
    const [activeTab, setActiveTab] = useState(0)

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <div className="flex h-full grow flex-col">
                <div className="flex flex-1 justify-center">
                    <div className="flex flex-col w-full flex-1">
                        {/* Header */}
                        <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-10 py-3 bg-white dark:bg-background-dark">
                            <div className="flex items-center gap-4 text-slate-900 dark:text-white">
                                <div className="size-6 text-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                                </div>
                                <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Central Kitchen</h2>
                            </div>
                            <div className="flex flex-1 justify-end gap-8">
                                <div className="hidden md:flex items-center gap-9">
                                    {['Dashboard', 'Inventory', 'Orders', 'Production', 'Reports', 'Settings'].map((item, i) => (
                                        <a key={item} href="#" className={`text-sm font-medium leading-normal transition-colors ${i === 5 ? 'text-primary font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-primary'}`}>{item}</a>
                                    ))}
                                </div>
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700" />
                            </div>
                        </header>

                        <div className="p-6 md:p-10 flex-1 max-w-[1440px] mx-auto w-full">
                            {/* Page Title */}
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold leading-tight">User Roles &amp; Permissions</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage roles, set granular permissions, and oversee user access levels.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                        <span className="material-symbols-outlined mr-2 text-[20px]">person_add</span>Add User
                                    </button>
                                    <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                                        <span className="material-symbols-outlined mr-2 text-[20px]">add</span>Add New Role
                                    </button>
                                </div>
                            </div>

                            {/* Split Panel */}
                            <div className="flex flex-col lg:flex-row gap-6" style={{ minHeight: 600 }}>
                                {/* Left: Roles */}
                                <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                        <h3 className="font-semibold">Defined Roles</h3>
                                        <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">5 Roles</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="flex flex-col">
                                            {roles.map((role, i) => (
                                                <button
                                                    key={role.name}
                                                    onClick={() => setActiveRole(i)}
                                                    className={`flex items-center gap-4 px-4 py-4 border-l-4 transition-colors text-left w-full ${i === activeRole ? 'bg-primary/10 border-primary hover:bg-primary/15' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800'}`}
                                                >
                                                    <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${i === activeRole ? 'text-primary bg-primary/20' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                                        <span className="material-symbols-outlined">{role.icon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-${i === activeRole ? 'semibold' : 'medium'} truncate ${i === activeRole ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{role.name}</p>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{role.desc}</p>
                                                    </div>
                                                    {i === activeRole && <span className="material-symbols-outlined text-primary text-xl">chevron_right</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Permissions */}
                                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    {/* Tabs */}
                                    <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-800/50">
                                        {['Permissions Matrix', `Assigned Users (12)`].map((tab, i) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(i)}
                                                className={`flex flex-col items-center justify-center pb-3 pt-4 px-4 mr-4 border-b-[3px] transition-colors text-sm ${i === activeTab ? 'border-b-primary text-primary font-semibold' : 'border-b-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'}`}
                                            >{tab}</button>
                                        ))}
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h2 className="text-xl font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">{roles[activeRole].icon}</span>
                                                    {roles[activeRole].name} Permissions
                                                </h2>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure module access levels for this role.</p>
                                            </div>
                                            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
                                                Save Changes
                                            </button>
                                        </div>

                                        {activeTab === 0 ? (
                                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                                                            <th className="py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 w-1/3">Module</th>
                                                            {['View', 'Create', 'Edit', 'Delete'].map(h => (
                                                                <th key={h} className="py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                        {modules.map(({ icon, name }) => (
                                                            <tr key={name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="py-3 px-4 flex items-center gap-3">
                                                                    <span className="material-symbols-outlined text-slate-400 text-xl">{icon}</span>
                                                                    <span className="text-sm font-medium">{name}</span>
                                                                </td>
                                                                {[0, 1, 2, 3].map(j => (
                                                                    <td key={j} className="py-3 px-4 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            defaultChecked
                                                                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 bg-slate-100 dark:bg-slate-800 dark:border-slate-600"
                                                                        />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 text-slate-400">
                                                <span className="material-symbols-outlined text-5xl mb-4 block">group</span>
                                                <p className="font-medium">12 users assigned to {roles[activeRole].name}</p>
                                                <p className="text-sm mt-1">User list management coming soon</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
