'use client';

import Link from 'next/link';

export default function VideoExtractPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 pb-8">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
                    <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900">
                        ←
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">🎬</span> 视频提取文案
                    </h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                    <div className="text-6xl mb-4">🚧</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">功能开发中</h2>
                    <p className="text-gray-500 mb-6">
                        视频字幕提取功能即将上线
                    </p>
                    <div className="bg-indigo-50 rounded-xl p-4 text-left">
                        <h3 className="font-medium text-indigo-800 mb-2">即将支持：</h3>
                        <ul className="text-sm text-indigo-700 space-y-1">
                            <li>• 支持抖音、快手、小红书视频链接</li>
                            <li>• 自动提取视频字幕</li>
                            <li>• 几秒钟获取完整文案</li>
                            <li>• 一键复制使用</li>
                        </ul>
                    </div>
                    <Link
                        href="/"
                        className="inline-block mt-6 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
                    >
                        返回首页
                    </Link>
                </div>
            </main>
        </div>
    );
}
