export default function Header({ title }) {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-[#e7dcd0] bg-[#fffbf6]/95 px-6 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-[#1a2332]">
      <div className="flex items-center gap-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-2xl">restaurant</span>
        </div>
        <h2 className="font-display text-lg font-bold leading-tight tracking-tight text-kitchen-ink dark:text-white">
          {title || 'Điều hành bếp trung tâm'}
        </h2>
      </div>
      <div className="flex flex-1 items-center justify-end gap-6">
        <label className="flex h-10 min-w-40 max-w-64 flex-col">
          <div className="flex h-full w-full flex-1 items-stretch rounded-xl border border-[#d7cdbd] bg-[#fffaf1] dark:border-slate-700 dark:bg-[#131b2b]">
            <div className="flex items-center justify-center rounded-l-xl border-r-0 pl-3 text-[#9a8a72] dark:text-slate-400">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input
              className="form-input h-full w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl rounded-l-none border-0 border-l-0 bg-transparent px-3 pl-2 text-sm font-normal leading-normal text-kitchen-ink placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-white"
              placeholder="Tìm kiếm lô, SKU, cửa hàng…"
            />
          </div>
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-kitchen-steel transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div
            className="size-8 aspect-square rounded-full bg-cover bg-center bg-no-repeat ring-2 ring-primary/15"
            style={{
              backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAgOsp5UCvSMplsflzAok51lMl8PeJ2yDmlQzUOrqEpqGX7wxrq8jCkzTClXppjIbyBEpD3W-4MjYVepoZTT40r58GLKGwJnCuvOXrG4sgw6s-_nfvp-_0iJNH6g0w0U6I2Tj1ba7SpdNHznoPRVJw_1hzbCJtWXS5eNUiHVl9SFRbu8rPzth4kGD3WcTmK-sfuUpGE9M8byLj0hVzPkQG9ujl0sPj8-Xf0JKbIRaHJA-U2tjfqZXXYS5i95y79qwcVYmue1ObNN70")`,
            }}
          />
        </div>
      </div>
    </header>
  )
}
