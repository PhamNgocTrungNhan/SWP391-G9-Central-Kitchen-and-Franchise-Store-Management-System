
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const navigate = useNavigate();
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
            if (data?.token) {
                localStorage.setItem('auth_token', data.token);
            }
            setStatus('Signed in successfully. Redirecting...');
            setTimeout(() => navigate('/dashboard'), 400);
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-center relative overflow-x-hidden">
            {/* Decorative Background */}
            <div
                className="absolute inset-0 z-0 opacity-10 dark:opacity-5 pointer-events-none"
                style={{
                    backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBK-qcAWWe3g2LPAOINCMLMJzMo7Qzo2RYoL1WT55DfJ4yVIGtPvY5wx-Ogzw0E-EeKj3RjzTF-0GYK_IwXrz4duWYqZfIlxvmPDDBcgIR3mdFcjJKSyh0fK6KGBiX0nPvsL4wj0OayZbNDMmHUEB0mItp8e4TiXycKwwo8Wd7nPLk1SzwL17Czfcmg0Vo1qxn-lvrK6tf6gZMjD-SmRUvTlzNypxA04PnUZl-I2A2On6AZu4YhPpehkDCwTwJFOo4-ts4RYLVCgQ8')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="relative z-10 flex h-full grow flex-col px-4 sm:px-6 lg:px-8">
                <div className="flex flex-1 justify-center py-10 items-center">
                    <div className="flex flex-col w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="flex flex-col gap-2 p-8 pb-6 border-b border-slate-100 dark:border-slate-800 text-center">
                            <div className="mx-auto w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-2">
                                <span className="material-symbols-outlined text-primary text-3xl">corporate_fare</span>
                            </div>
                            <h1 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">Secure Enterprise Login</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Central Kitchen &amp; Franchise Management</p>
                            <span className="inline-flex items-center justify-center mx-auto px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">API: localhost:5202</span>
                        </div>
                        {/* Form */}
                        <form className="p-8 pt-6 flex flex-col gap-5" onSubmit={handleLogin}>
                            {/* Username */}
                            <label className="flex flex-col w-full">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-1.5">Username or Email</p>
                                <div className="flex w-full items-stretch rounded-lg shadow-sm">
                                    <span className="material-symbols-outlined flex border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 items-center justify-center pl-3 pr-2 rounded-l-lg text-slate-400 dark:text-slate-500">person</span>
                                    <input
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-1 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 text-sm font-normal"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </label>
                            {/* Password */}
                            <label className="flex flex-col w-full">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-1.5">Password</p>
                                <div className="flex w-full items-stretch rounded-lg shadow-sm">
                                    <span className="material-symbols-outlined flex border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 items-center justify-center pl-3 pr-2 rounded-l-lg text-slate-400 dark:text-slate-500">lock</span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden text-slate-900 dark:text-white focus:outline-0 focus:ring-1 focus:ring-primary border-y border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 text-sm font-normal border-x-0"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="text-slate-400 dark:text-slate-500 flex border border-l-0 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 items-center justify-center pr-3 pl-2 rounded-r-lg hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                    >
                                        <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility' : 'visibility_off'}</span>
                                    </button>
                                </div>
                            </label>
                            {/* Branch Selection */}
                            <label className="flex flex-col w-full">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-1.5">Branch / Location</p>
                                <div className="flex w-full items-stretch rounded-lg shadow-sm">
                                    <span className="material-symbols-outlined flex border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 items-center justify-center pl-3 pr-2 rounded-l-lg text-slate-400 dark:text-slate-500">storefront</span>
                                    <select className="form-select flex w-full min-w-0 flex-1 overflow-hidden rounded-r-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-1 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary h-11 px-3 py-0 text-sm font-normal">
                                        <option value="" disabled defaultValue="">Select assigned location...</option>
                                        <option value="hq">Global Headquarters</option>
                                        <option value="ck1">Central Kitchen - North</option>
                                        <option value="ck2">Central Kitchen - South</option>
                                        <option value="f101">Franchise #101 - Downtown</option>
                                        <option value="f102">Franchise #102 - Westside</option>
                                    </select>
                                </div>
                            </label>
                            {/* Options Row */}
                            <div className="flex items-center justify-between w-full mt-1">
                                <label className="flex items-center gap-x-2 cursor-pointer group">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 focus:outline-none transition-colors" />
                                    <span className="text-slate-600 dark:text-slate-400 text-sm font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                                </label>
                                <a href="#" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">Forgot password?</a>
                            </div>
                            {/* Sign In Button */}
                            <div className="flex flex-col gap-3 mt-4">
                                <button
                                    type="submit"
                                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-bold leading-normal tracking-wide transition-colors shadow-md shadow-primary/20 disabled:opacity-60"
                                    disabled={loading}
                                >
                                    <span className="material-symbols-outlined mr-2 text-[20px]">login</span>
                                    <span>{loading ? 'Signing In...' : 'Sign In to System'}</span>
                                </button>
                                {status && <div className="text-emerald-600 text-sm text-center mt-2">{status}</div>}
                                {error && <div className="text-red-500 text-sm text-center mt-1">{error}</div>}
                            </div>
                        </form>
                        {/* Footer */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Need access? Contact your IT Administrator.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
