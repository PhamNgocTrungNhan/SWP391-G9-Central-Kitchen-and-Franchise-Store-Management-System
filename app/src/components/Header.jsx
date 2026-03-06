export default function Header({ title }) {
    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-[#1a2332]">
            <div className="flex items-center gap-4">
                <div className="size-6 text-primary">
                    <span className="material-symbols-outlined text-2xl">restaurant</span>
                </div>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">{title || 'Central Kitchen Analytics'}</h2>
            </div>
            <div className="flex flex-1 justify-end gap-6 items-center">
                <label className="flex flex-col min-w-40 h-10 max-w-64">
                    <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#131b2b]">
                        <div className="text-slate-400 flex border-none items-center justify-center pl-4 rounded-l-lg border-r-0">
                            <span className="material-symbols-outlined text-xl">search</span>
                        </div>
                        <input
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-slate-400 px-4 rounded-l-none border-l-0 pl-2 text-sm font-normal leading-normal"
                            placeholder="Search..."
                        />
                    </div>
                </label>
                <div className="flex items-center gap-4">
                    <button className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8"
                        style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAgOsp5UCvSMplsflzAok51lMl8PeJ2yDmlQzUOrqEpqGX7wxrq8jCkzTClXppjIbyBEpD3W-4MjYVepoZTT40r58GLKGwJnCuvOXrG4sgw6s-_nfvp-_0iJNH6g0w0U6I2Tj1ba7SpdNHznoPRVJw_1hzbCJtWXS5eNUiHVl9SFRbu8rPzth4kGD3WcTmK-sfuUpGE9M8byLj0hVzPkQG9ujl0sPj8-Xf0JKbIRaHJA-U2tjfqZXXYS5i95y79qwcVYmue1ObNN70")` }}
                    />
                </div>
            </div>
        </header>
    )
}
