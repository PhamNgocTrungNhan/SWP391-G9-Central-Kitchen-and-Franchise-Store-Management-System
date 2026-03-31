
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeJwtPayload, saveUserRole } from '../utils/auth';

const demoAccounts = [
    {
        id: 'admin',
        label: 'ADMIN demo',
        username: 'admin_demo',
        password: 'Admin@123',
        role: 'ADMIN',
        storeId: 1,
        redirectTo: '/payments',
    },
    {
        id: 'store',
        label: 'STORE_STAFF demo',
        username: 'store_demo',
        password: 'Store@123',
        role: 'STORE_STAFF',
        storeId: 101,
        redirectTo: '/payments',
    },
];

function encodeBase64Url(value) {
    return btoa(value)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function createDemoToken(account) {
    const header = encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = encodeBase64Url(JSON.stringify({
        sub: account.username,
        role: account.role,
        storeId: account.storeId,
        name: account.label,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    }));

    return `${header}.${payload}.`;
}

export default function LoginPage() {
    const navigate = useNavigate();
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isAnimating, setIsAnimating] = useState(true);

    // Animation khi component mount
    useState(() => {
        setTimeout(() => setIsAnimating(false), 100);
    }, []);

    const extractRawToken = (value) => {
        const tokenValue = String(value || '').trim();
        if (!tokenValue) return '';
        return tokenValue.replace(/^Bearer\s+/i, '').trim();
    };

    const applyDemoAccount = (account) => {
        const token = createDemoToken(account);

        localStorage.setItem('auth_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('user_role', account.role);
        localStorage.setItem('store_id', String(account.storeId));
        localStorage.setItem('user', JSON.stringify({
            username: account.username,
            role: account.role,
            storeId: account.storeId,
        }));

        setStatus(`Đăng nhập demo ${account.role} thành công. Đang chuyển đến màn thanh toán...`);
        setError('');
        setTimeout(() => navigate(account.redirectTo, { replace: true }), 250);
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
            const matchedDemo = demoAccounts.find(
                (account) => account.username === username.trim() && account.password === password,
            );

            if (matchedDemo) {
                applyDemoAccount(matchedDemo);
                return;
            }

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
                        <div className="font-bold text-xl text-white">
                            Autumn Mooncake
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Header - Xóa icon, chỉ giữ tên */}
                        <div className="p-8 pb-6 text-center bg-gradient-to-b from-amber-50 to-white dark:from-slate-800 dark:to-slate-900">
                            <h1 className="text-slate-900 dark:text-white text-3xl font-bold mb-2">Autumn Mooncake</h1>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Management System</p>
                        </div>

                        {/* Form */}
                        <form className="p-8 pt-6 flex flex-col gap-5" onSubmit={handleLogin}>
                            {/* Username */}
                            <label className="flex flex-col w-full">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mb-2">Tên đăng nhập</p>
                                <input
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                    placeholder="Nhập tên đăng nhập"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </label>

                            {/* Password */}
                            <label className="flex flex-col w-full">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mb-2">Mật khẩu</p>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
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
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                                    <span className="text-slate-600 dark:text-slate-400">Ghi nhớ</span>
                                </label>
                                <a href="#" className="text-amber-600 hover:text-amber-700 font-medium">Quên mật khẩu?</a>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-lg mt-2 disabled:opacity-60"
                                disabled={loading}
                            >
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </button>

                            {/* Status Messages */}
                            {status && <div className="text-emerald-600 text-sm text-center bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-lg">{status}</div>}
                            {error && <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">{error}</div>}
                        </form>

                        <div className="px-8 pb-8">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                                <div className="grid gap-3">
                                    {demoAccounts.map((account) => (
                                        <div key={account.id} className="rounded-xl border border-amber-200 bg-white/80 p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="text-sm text-slate-700">
                                                    <p className="font-semibold text-slate-900">{account.label}</p>
                                                    <p className="mt-1">Username: <span className="font-mono">{account.username}</span></p>
                                                    <p>Password: <span className="font-mono">{account.password}</span></p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => applyDemoAccount(account)}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">login</span>
                                                    Vào bằng {account.role}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Cần hỗ trợ? Liên hệ quản trị viên</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
