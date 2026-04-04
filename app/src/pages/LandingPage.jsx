import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background-light text-kitchen-ink">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#dfd4c4] bg-[#fbf7ef]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 font-display text-xl font-bold text-kitchen-ink">
              <span className="material-symbols-outlined text-primary text-[28px]">soup_kitchen</span>
              Central Kitchen
            </div>

            <nav className="hidden items-center gap-8 md:flex">
              {[
                ['#about', 'Vận hành'],
                ['#products', 'Năng lực'],
                ['#ingredients', 'Chuỗi cung ứng'],
                ['#contact', 'Liên hệ'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm font-medium text-kitchen-steel transition hover:text-primary"
                >
                  {label}
                </a>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6">
        <div className="absolute inset-0 z-0">
          <img src="/backgroundhero.jpg" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-kitchen-ink/85 via-kitchen-ink/55 to-kitchen-ink/35" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              Bếp trung tâm · Chuỗi nhượng quyền
            </p>
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              Một bếp — đồng bộ toàn hệ thống
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">
              Sản xuất tập trung, kiểm soát lô — BOM, kho, điều phối tới cửa hàng và phản hồi chất lượng trong một luồng dữ liệu thống nhất.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-full bg-white px-8 py-3 text-base font-semibold text-kitchen-ink shadow-lg transition hover:bg-kitchen-tile"
              >
                Vào hệ thống
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-full border-2 border-white/80 px-8 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Xem năng lực
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-[#e5dccf] bg-[#f4ede2] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 font-display text-3xl font-bold text-kitchen-ink">Vận hành bếp trung tâm</h2>
              <p className="mb-4 text-kitchen-steel">
                Chuẩn hóa công thức, lịch sản xuất và phân bổ — giảm lệch tồn giữa bếp và các điểm bán nhượng quyền.
              </p>
              <p className="text-kitchen-steel">
                Dashboard theo dõi lô, hạn dùng, cảnh báo ngưỡng tồn kho và truy vết nguyên liệu giúp đội ngũ ra quyết định nhanh hơn.
              </p>
            </div>
            <img src="/vechungtoi.jpg" alt="Đội ngũ bếp" className="h-96 w-full rounded-[1.5rem] border border-[#dfd4c4] object-cover shadow-[0_20px_50px_rgba(47,106,61,0.12)]" />
          </div>
        </div>
      </section>

      <section id="products" className="bg-[#fbf7ef] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 font-display text-3xl font-bold text-kitchen-ink">Năng lực nổi bật</h2>
            <p className="text-kitchen-steel">Thiết kế cho quy mô chuỗi — từ BOM đến giao nhận</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: 'BOM & định mức',
                desc: 'Ràng buộc nguyên liệu theo món, kiểm soát biến thể và phiên bản công thức.',
                price: 'Đồng bộ đa cửa hàng',
                image: '/banh1.jpg',
              },
              {
                name: 'Lệnh sản xuất & lô',
                desc: 'Theo dõi lô xuất xưởng, hạn sử dụng và trạng thái giao cho franchise.',
                price: 'Truy vết đầu cuối',
                image: '/banh2.jpg',
              },
              {
                name: 'Kho trung tâm',
                desc: 'Nhập — xuất — tồn theo thời gian thực, cảnh báo tồn tối thiểu.',
                price: 'Cảnh báo theo ngưỡng',
                image: '/banh3.webp',
              },
            ].map((item) => (
              <div
                key={item.name}
                className="overflow-hidden rounded-[1.25rem] border border-[#e0d5c5] bg-white shadow-[0_14px_36px_rgba(94,77,52,0.08)] transition hover:shadow-[0_20px_48px_rgba(47,106,61,0.12)]"
              >
                <img src={item.image} alt="" className="h-56 w-full object-cover" />
                <div className="p-6">
                  <h3 className="mb-2 font-display text-xl font-bold text-kitchen-ink">{item.name}</h3>
                  <p className="mb-4 text-sm text-kitchen-steel">{item.desc}</p>
                  <p className="mb-4 text-sm font-semibold text-primary">{item.price}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
                  >
                    Đăng nhập để dùng
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ingredients" className="border-t border-[#e5dccf] bg-[#f0e8db] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 font-display text-3xl font-bold text-kitchen-ink">Chuỗi cung ứng minh bạch</h2>
            <p className="text-kitchen-steel">Nguyên liệu, nhà cung cấp và chất lượng đầu vào</p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {[
              { name: 'Nguồn gốc lô', desc: 'Gắn COA, chứng từ nhập và lịch sử kiểm tra.' },
              { name: 'Đối soát tồn', desc: 'Đồng bộ số liệu bếp — kho — cửa hàng theo phiếu.' },
              { name: 'Kiểm soát chất lượng', desc: 'Checklist và ghi nhận lệch trong quy trình chế biến.' },
              { name: 'Dự báo tiêu thụ', desc: 'Gợi ý sản lượng theo mùa và lịch giao franchise.' },
            ].map((row) => (
              <div key={row.name} className="rounded-[1.1rem] border border-[#dfd4c4] bg-[#fffbf6] p-6 shadow-sm">
                <h3 className="mb-2 font-semibold text-kitchen-ink">{row.name}</h3>
                <p className="text-sm text-kitchen-steel">{row.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-kitchen-ink px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold">Liên hệ vận hành</h2>
          <p className="mb-8 text-lg text-white/75">
            Hotline: 1900 xxxx · Email: ops@centralkitchen.vn
          </p>
          <div className="mb-10 grid gap-6 md:grid-cols-3">
            {[
              ['Giao nhận chuẩn giờ', 'Khung giờ cố định tới các điểm franchise.'],
              ['Hỗ trợ triển khai', 'Onboarding quy trình và phân quyền theo vai trò.'],
              ['Báo cáo tập trung', 'Một nguồn số liệu cho bếp và ban điều hành.'],
            ].map(([t, d]) => (
              <div key={t} className="text-center">
                <h3 className="mb-2 font-semibold text-white">{t}</h3>
                <p className="text-sm text-white/65">{d}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-full bg-primary px-8 py-3 font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            Đăng nhập hệ thống
          </button>
        </div>
      </section>

      <footer className="border-t border-[#dfd4c4] bg-[#fbf7ef] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-3 font-display font-bold text-kitchen-ink">Central Kitchen</h3>
              <p className="text-sm text-kitchen-steel">Bếp trung tâm & quản lý chuỗi nhượng quyền</p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-kitchen-ink">Module</h4>
              <ul className="space-y-2 text-sm text-kitchen-steel">
                <li>BOM / công thức</li>
                <li>Sản xuất & lô</li>
                <li>Kho & điều phối</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-kitchen-ink">Tổ chức</h4>
              <ul className="space-y-2 text-sm text-kitchen-steel">
                <li>Vận hành bếp</li>
                <li>Franchise</li>
                <li>Báo cáo</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-kitchen-ink">Liên hệ</h4>
              <ul className="space-y-2 text-sm text-kitchen-steel">
                <li>Hotline: 1900 xxxx</li>
                <li>ops@centralkitchen.vn</li>
                <li>TP. Hồ Chí Minh</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#e5dccf] pt-8 text-center text-sm text-kitchen-steel">
            © {new Date().getFullYear()} Central Kitchen. Bảo lưu mọi quyền.
          </div>
        </div>
      </footer>
    </div>
  )
}
