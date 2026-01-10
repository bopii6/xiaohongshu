'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    username: string;
    name: string;
    createdAt: string;
    enabled: boolean;
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            } else if (res.status === 401) {
                setIsAuthenticated(false);
            }
        } catch {
            setError('获取用户列表失败');
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUsers();
        }
    }, [isAuthenticated, fetchUsers]);

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        // 设置管理员 cookie
        document.cookie = `admin_token=${adminPassword}; path=/; max-age=${60 * 60 * 24}`;

        // 验证
        const res = await fetch('/api/admin/users');
        if (res.ok) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('管理员密码错误');
            document.cookie = 'admin_token=; path=/; max-age=0';
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUsername,
                    password: newPassword,
                    name: newName || newUsername,
                }),
            });

            if (res.ok) {
                setSuccess('用户添加成功！');
                setNewUsername('');
                setNewPassword('');
                setNewName('');
                fetchUsers();
            } else {
                const data = await res.json();
                setError(data.error || '添加失败');
            }
        } catch {
            setError('添加失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        if (!confirm(`确定删除用户 "${username}" 吗？`)) return;

        try {
            const res = await fetch(`/api/admin/users?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setSuccess('用户已删除');
                fetchUsers();
            } else {
                setError('删除失败');
            }
        } catch {
            setError('删除失败');
        }
    };

    const handleLogout = () => {
        document.cookie = 'admin_token=; path=/; max-age=0';
        setIsAuthenticated(false);
        router.push('/');
    };

    // 管理员登录界面
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">🔐 管理员登录</h1>

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">管理员密码</label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="请输入管理员密码"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl">{error}</div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-all"
                        >
                            进入管理后台
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 管理后台界面
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">👑 用户管理后台</h1>
                    <button
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        退出管理
                    </button>
                </div>

                {/* 添加用户表单 */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">➕ 添加新用户</h2>

                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">账号 *</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 outline-none"
                                    placeholder="用户登录账号"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">密码 *</label>
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 outline-none"
                                    placeholder="用户登录密码"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">备注名称</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 outline-none"
                                    placeholder="可选，方便识别"
                                />
                            </div>
                        </div>

                        {error && <div className="bg-red-50 text-red-500 text-sm px-4 py-2 rounded-lg">{error}</div>}
                        {success && <div className="bg-green-50 text-green-600 text-sm px-4 py-2 rounded-lg">{success}</div>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-500 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                            {isLoading ? '添加中...' : '添加用户'}
                        </button>
                    </form>
                </div>

                {/* 用户列表 */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">👥 用户列表 ({users.length})</h2>

                    {users.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">暂无用户，请添加</p>
                    ) : (
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                >
                                    <div>
                                        <p className="font-medium text-gray-800">{user.name}</p>
                                        <p className="text-sm text-gray-500">账号: {user.username}</p>
                                        <p className="text-xs text-gray-400">
                                            创建于: {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                        className="text-red-500 hover:text-red-700 text-sm px-3 py-1 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        删除
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
