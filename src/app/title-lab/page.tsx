'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TitleCategories {
    suspense: string[];
    benefit: string[];
    emotion: string[];
    fear: string[];
}

export default function TitleLabPage() {
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [titles, setTitles] = useState<TitleCategories | null>(null);

    const generateTitles = async () => {
        if (!topic.trim()) {
            alert('请输入产品或话题');
            return;
        }

        setIsGenerating(true);
        setTitles(null);

        try {
            const response = await fetch('/api/generate-titles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic }),
            });
            const result = await response.json();

            if (result.success) {
                setTitles(result.data);
            } else {
                alert('生成失败，请重试');
            }
        } catch (error) {
            console.error(error);
            alert('网络错误，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyTitle = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`已复制：${text}`);
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8] pb-20 font-sans text-[#333]">
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center">
                    <Link href="/" className="text-[#333] mr-4 text-lg">
                        ←
                    </Link>
                    <h1 className="text-lg font-bold">🧪 爆款标题实验室</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                {/* Input Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold mb-2 text-[#333]">
                        输入产品 / 话题
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="例如：美白精华、减脂餐..."
                            className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-400 outline-none transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && generateTitles()}
                        />
                        <button
                            onClick={generateTitles}
                            disabled={isGenerating}
                            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isGenerating ? '...' : '生成'}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                {titles && (
                    <div className="space-y-6 animate-slide-up">
                        {/* Suspense */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center">
                                <span className="text-xl mr-2">😲</span> 悬念类 (点击复制)
                            </h3>
                            <div className="space-y-3">
                                {titles.suspense.map((t, i) => (
                                    <div
                                        key={i}
                                        onClick={() => copyTitle(t)}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-orange-50 active:border-orange-200 transition-all cursor-pointer"
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Benefit */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center">
                                <span className="text-xl mr-2">💎</span> 干货类
                            </h3>
                            <div className="space-y-3">
                                {titles.benefit.map((t, i) => (
                                    <div
                                        key={i}
                                        onClick={() => copyTitle(t)}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-orange-50 active:border-orange-200 transition-all cursor-pointer"
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Emotion */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center">
                                <span className="text-xl mr-2">😭</span> 情绪类
                            </h3>
                            <div className="space-y-3">
                                {titles.emotion.map((t, i) => (
                                    <div
                                        key={i}
                                        onClick={() => copyTitle(t)}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-orange-50 active:border-orange-200 transition-all cursor-pointer"
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Fear */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center">
                                <span className="text-xl mr-2">⚠️</span> 恐吓/避雷类
                            </h3>
                            <div className="space-y-3">
                                {titles.fear.map((t, i) => (
                                    <div
                                        key={i}
                                        onClick={() => copyTitle(t)}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-orange-50 active:border-orange-200 transition-all cursor-pointer"
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
