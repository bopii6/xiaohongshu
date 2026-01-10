'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // 登录成功，跳转到首页或之前的页面
                const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/';
                router.push(redirectTo);
                router.refresh();
            } else {
                setError(data.error || '登录失败');
            }
        } catch {
            setError('网络错误，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FFF5F5] via-white to-[#FFF0F5] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#FF2442]">RedNote AI</h1>
                    <p className="text-gray-500 mt-2">小红书爆款内容创作助手</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-center text-gray-800 mb-6">账号登录</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                账号
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                                placeholder="请输入账号"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                                placeholder="请输入密码"
                                required
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold py-3 px-4 rounded-xl hover:from-pink-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    登录中...
                                </span>
                            ) : '登 录'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-xs mt-6">
                    © 2026 RedNote AI · 小红书创作助手
                </p>
            </div>
        </div>
    );
}
