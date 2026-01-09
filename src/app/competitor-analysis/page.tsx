'use client';

import Link from 'next/link';

export default function CompetitorAnalysisPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 pb-8">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
                    <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900">
                        ←
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">📊</span> 分析同行
                    </h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                    <div className="text-6xl mb-4">🚧</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">功能开发中</h2>
                    <p className="text-gray-500 mb-6">
                        同行深度分析功能即将上线
                    </p>
                    <div className="bg-teal-50 rounded-xl p-4 text-left">
                        <h3 className="font-medium text-teal-800 mb-2">即将支持：</h3>
                        <ul className="text-sm text-teal-700 space-y-1">
                            <li>• 输入同行主页链接</li>
                            <li>• 获取账号权重信息</li>
                            <li>• 分析内容策略和风格</li>
                            <li>• 生成专业分析报告</li>
                        </ul>
                    </div>
                    <Link
                        href="/"
                        className="inline-block mt-6 px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
                    >
                        返回首页
                    </Link>
                </div>
            </main>
        </div>
    );
}
