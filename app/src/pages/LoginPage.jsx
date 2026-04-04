import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/apiConfig';
import { decodeJwtPayload, saveUserRole } from '../utils/auth';

export default function LoginPage() {
    const navigate = useNavigate();
    const apiBase = getApiBaseUrl();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setIsAnimating(false), 100);
        return () => clearTimeout(t);
    }, []);

    const extractRawToken = (value) => {
        const tokenValue = String(value || '').trim();
        if (!tokenValue) return '';
        return tokenValue.replace(/^Bearer\s+/i, '').trim();
    };

    const detectRole = (payload, responseData) => {
        const candidates = [
            responseData?.role,
            responseData?.roleName,
            responseData?.user?.role,
            responseData?.user?.roleName,
            responseData?.user?.role?.roleName,
            payload?.role,
            payload?.roles,
            payload?.Role,
            payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
        ];

        for (const value of candidates) {
            if (Array.isArray(value) && value.length > 0) {
                const saved = saveUserRole(value[0]);
                if (saved) return saved;
            }

            const saved = saveUserRole(value);
            if (saved) return saved;
        }

        return '';
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setStatus('');
        setLoading(true);
        try {
            const response = await fetch(`${apiBase}/Auth/login`, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || 'Invalid username or password');
            }
            const rawToken = extractRawToken(data?.token || data?.accessToken || data?.jwt || data?.jwtToken);
            if (!rawToken) {
                throw new Error('Đăng nhập thành công nhưng không nhận được token từ backend.');
            }

            localStorage.setItem('auth_token', rawToken);
            localStorage.setItem('token', rawToken);
            const payload = decodeJwtPayload(rawToken);
            detectRole(payload, data);

            setStatus('Đăng nhập thành công. Đang chuyển trang...');
            setTimeout(() => navigate('/dashboard'), 400);
        } catch (err) {
            setError(err.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Image with Zoom Animation */}
            <div
                className={`absolute inset-0 z-0 transition-transform duration-1000 ease-out ${isAnimating ? 'scale-150' : 'scale-100'
                    }`}
            >
                <img
                    src="/backgroundhero.jpg"
                    alt="Background"
                    className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-black/50 transition-opacity duration-1000 ${isAnimating ? 'opacity-0' : 'opacity-100'
                    }`}></div>
            </div>

            {/* Header with Fade In */}
            <header className={`relative z-10 bg-white/10 backdrop-blur-sm border-b border-white/20 transition-opacity duration-1000 delay-300 ${isAnimating ? 'opacity-0' : 'opacity-100'
                }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2 font-display text-xl font-bold text-white">
                            <span className="material-symbols-outlined text-[26px] text-white/95">soup_kitchen</span>
                            Central Kitchen
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30"
                        >
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </header>

            {/* Login Form with Slide Up Animation */}
            <div
                className={`relative z-10 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-all duration-1000 delay-500 ${isAnimating ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'
                    }`}
                style={{ minHeight: 'calc(100vh - 64px)' }}
            >
                <div className="w-full max-w-md">
                    <div className="overflow-hidden rounded-2xl border border-[#e0d5c5] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="bg-gradient-to-b from-primary/12 via-[#fffbf6] to-white p-8 pb-6 text-center dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
                            <h1 className="mb-2 font-display text-3xl font-bold text-kitchen-ink dark:text-white">Central Kitchen</h1>
                            <p className="text-sm text-kitchen-steel dark:text-slate-400">Hệ thống bếp trung tâm & franchise</p>
                        </div>

                        {/* Form */}
                        <form className="p-8 pt-6 flex flex-col gap-5" onSubmit={handleLogin}>
                            {/* Username */}
                            <label className="flex flex-col w-full">
                                <p className="mb-2 text-sm font-medium text-kitchen-steel dark:text-slate-300">Tên đăng nhập</p>
                                <input
                                    className="w-full rounded-lg border border-[#d7cdbd] bg-[#fffaf1] px-4 py-3 text-kitchen-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    placeholder="Nhập tên đăng nhập"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </label>

                            {/* Password */}
                            <label className="flex flex-col w-full">
                                <p className="mb-2 text-sm font-medium text-kitchen-steel dark:text-slate-300">Mật khẩu</p>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full rounded-lg border border-[#d7cdbd] bg-[#fffaf1] px-4 py-3 text-kitchen-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        placeholder="Nhập mật khẩu"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-sm"
                                    >
                                        {showPassword ? 'Ẩn' : 'Hiện'}
                                    </button>
                                </div>
                            </label>

                            {/* Remember & Forgot */}
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="h-4 w-4 rounded border-[#c4b8a8] text-primary focus:ring-primary/30" />
                                    <span className="text-kitchen-steel dark:text-slate-400">Ghi nhớ</span>
                                </label>
                                <a href="#" className="font-medium text-accent hover:brightness-90">Quên mật khẩu?</a>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="mt-2 w-full rounded-full bg-primary py-3 font-semibold text-white shadow-lg transition hover:brightness-95 disabled:opacity-60 dark:bg-primary"
                                disabled={loading}
                            >
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </button>

                            {/* Status Messages */}
                            {status && <div className="text-emerald-600 text-sm text-center bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-lg">{status}</div>}
                            {error && <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">{error}</div>}
                        </form>

                        {/* Footer */}
                        <div className="border-t border-[#ebe1d3] bg-[#f8f3ea] p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
                            <p className="text-xs text-kitchen-steel dark:text-slate-400">Cần hỗ trợ? Liên hệ quản trị viên</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
