import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="font-bold text-xl text-slate-900 dark:text-white">
                            Autumn Mooncake
                        </div>

                        <nav className="hidden md:flex items-center gap-8">
                            <a href="#about" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                Giới thiệu
                            </a>
                            <a href="#products" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                Sản phẩm
                            </a>
                            <a href="#ingredients" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                Nguyên liệu
                            </a>
                            <a href="#contact" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                Liên hệ
                            </a>
                        </nav>

                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                        >
                            Đăng nhập
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/backgroundhero.jpg"
                        alt="Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="max-w-4xl">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                            Bánh Trung Thu<br />
                            Truyền Thống Việt Nam
                        </h1>
                        <p className="text-lg sm:text-xl text-white mb-8 leading-relaxed drop-shadow-md">
                            Hương vị thuần khiết từ công thức gia truyền, được chế biến từ những nguyên liệu tươi ngon nhất.
                            Mang đến cho gia đình bạn một mùa Trung Thu trọn vẹn.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-3 text-base bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors shadow-lg"
                            >
                                Đặt hàng ngay
                            </button>
                            <button
                                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-3 text-base border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                            >
                                Xem sản phẩm
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 px-4 sm:px-6 bg-slate-100 dark:bg-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                                Về chúng tôi
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                Với hơn 20 năm kinh nghiệm trong nghề làm bánh Trung Thu, chúng tôi tự hào mang đến
                                những sản phẩm chất lượng cao, đảm bảo vệ sinh an toàn thực phẩm.
                            </p>
                            <p className="text-slate-600 dark:text-slate-400">
                                Mỗi chiếc bánh đều được làm thủ công tỉ mỉ, từ khâu chọn nguyên liệu đến quy trình
                                sản xuất, đều tuân thủ nghiêm ngặt các tiêu chuẩn chất lượng.
                            </p>
                        </div>
                        <img
                            src="/vechungtoi.jpg"
                            alt="Về chúng tôi"
                            className="rounded-2xl h-96 w-full object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <section id="products" className="py-20 px-4 sm:px-6 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Sản phẩm của chúng tôi</h2>
                        <p className="text-slate-600 dark:text-slate-400">Đa dạng chủng loại, phù hợp mọi khẩu vị</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: 'Bánh Dẻo Truyền Thống',
                                desc: 'Vỏ bánh mềm mịn, nhân đậu xanh thơm ngon, trứng muối béo ngậy',
                                price: '180.000đ/hộp 4 bánh',
                                image: '/banh1.jpg'
                            },
                            {
                                name: 'Bánh Nướng Thập Cẩm',
                                desc: 'Vỏ bánh giòn tan, nhân thập cẩm đậm đà theo công thức gia truyền',
                                price: '200.000đ/hộp 4 bánh',
                                image: '/banh2.jpg'
                            },
                            {
                                name: 'Bánh Cao Cấp',
                                desc: 'Nhân sen hạt dẻ, trứng muối đặc biệt, dành cho khách hàng sành điệu',
                                price: '250.000đ/hộp 4 bánh',
                                image: '/banh3.webp'
                            },
                        ].map((product) => (
                            <div key={product.name} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-64 object-cover"
                                />
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{product.name}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{product.desc}</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{product.price}</p>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                                    >
                                        Đặt hàng
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Ingredients Section */}
            <section id="ingredients" className="py-20 px-4 sm:px-6 bg-amber-50 dark:bg-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Nguyên liệu chất lượng</h2>
                        <p className="text-slate-600 dark:text-slate-400">Cam kết 100% nguyên liệu tươi ngon, an toàn</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { name: 'Đậu xanh nguyên chất', desc: 'Đậu xanh Việt Nam, không tạp chất' },
                            { name: 'Trứng muối Giang Tô', desc: 'Trứng vịt muối cao cấp, béo ngậy' },
                            { name: 'Bột mì Mỹ', desc: 'Bột mì nhập khẩu, đạt chuẩn FDA' },
                            { name: 'Đường phèn Bình Định', desc: 'Đường phèn truyền thống, vị ngọt tự nhiên' },
                        ].map((ingredient) => (
                            <div key={ingredient.name} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{ingredient.name}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{ingredient.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-20 px-4 sm:px-6 bg-slate-900 dark:bg-black text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">Liên hệ đặt hàng</h2>
                    <p className="text-lg text-slate-300 mb-8">
                        Hotline: 1900 xxxx | Email: order@banhtrungth2026.vn
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <div className="text-center">
                            <h3 className="font-bold text-white mb-2">Giao hàng toàn quốc</h3>
                            <p className="text-sm text-slate-400">Miễn phí ship đơn từ 500k</p>
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-white mb-2">Đổi trả trong 7 ngày</h3>
                            <p className="text-sm text-slate-400">Nếu có vấn đề về chất lượng</p>
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-white mb-2">Ưu đãi đặc biệt</h3>
                            <p className="text-sm text-slate-400">Giảm 10% cho đơn từ 1 triệu</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
                    >
                        Đăng nhập để đặt hàng
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Autumn Mooncake</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Chất lượng là hàng đầu
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Sản phẩm</h4>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                <li>Bánh Dẻo</li>
                                <li>Bánh Nướng</li>
                                <li>Bánh Cao Cấp</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Về chúng tôi</h4>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                <li>Giới thiệu</li>
                                <li>Nguyên liệu</li>
                                <li>Quy trình sản xuất</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Liên hệ</h4>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                <li>Hotline: 1900 xxxx</li>
                                <li>Email: order@banhtrungth2026.vn</li>
                                <li>Địa chỉ: TP.HCM</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
                        © 2026 Autumn Mooncake. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
