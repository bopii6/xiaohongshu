'use client';

import Link from 'next/link';

export default function TrendingCreatePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-8">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
                    <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900">
                        ←
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">🔥</span> 爆款创作
                    </h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                    <div className="text-6xl mb-4">🚧</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">功能开发中</h2>
                    <p className="text-gray-500 mb-6">
                        搜索热门笔记，一键生成同款爆文功能即将上线
                    </p>
                    <div className="bg-orange-50 rounded-xl p-4 text-left">
                        <h3 className="font-medium text-orange-800 mb-2">即将支持：</h3>
                        <ul className="text-sm text-orange-700 space-y-1">
                            <li>• 搜索小红书热门笔记</li>
                            <li>• 分析爆款元素</li>
                            <li>• AI生成全新内容</li>
                            <li>• 一键发布到小红书</li>
                        </ul>
                    </div>
                    <Link
                        href="/"
                        className="inline-block mt-6 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                    >
                        返回首页
                    </Link>
                </div>
            </main>
        </div>
    );
}
