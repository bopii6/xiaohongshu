'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DetectedWord {
    word: string;
    category: string;
    categoryName: string;
    level: 'low' | 'medium' | 'high' | 'critical';
    suggestion?: string;
}

interface CheckResult {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    detectedWords: DetectedWord[];
    highlightedText: string;
}

const riskLevelConfig = {
    low: { label: '安全', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', emoji: '✅' },
    medium: { label: '低风险', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', emoji: '⚠️' },
    high: { label: '高风险', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', emoji: '🚨' },
    critical: { label: '极高风险', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', emoji: '🚫' }
};

export default function SensitiveCheckPage() {
    const [content, setContent] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState<CheckResult | null>(null);

    const checkContent = async () => {
        if (!content.trim()) {
            alert('请输入要检测的内容');
            return;
        }

        setIsChecking(true);
        setResult(null);

        try {
            const response = await fetch('/api/sensitive-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            const data = await response.json();
            if (data.success) {
                setResult(data.data);
            } else {
                alert(data.error || '检测失败');
            }
        } catch (error) {
            console.error('检测失败:', error);
            alert('检测失败，请重试');
        } finally {
            setIsChecking(false);
        }
    };

    const config = result ? riskLevelConfig[result.riskLevel] : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 pb-8">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
                    <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900 transition-colors">
                        ←
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">🛡️</span> 敏感词检测
                    </h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Info Banner */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">💡</span>
                        <div className="text-sm text-gray-600">
                            <p className="font-medium text-gray-800 mb-1">发布前测一测，限流问题早知道</p>
                            <p>检测广告法违规词、医疗禁用词、平台限流词等，帮助你优化文案。</p>
                        </div>
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold mb-3 text-gray-800">
                        输入要检测的内容
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="粘贴你的小红书笔记标题和正文..."
                        rows={8}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400">{content.length} 字</span>
                        <button
                            onClick={() => setContent('')}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            清空
                        </button>
                    </div>

                    <button
                        onClick={checkContent}
                        disabled={isChecking || !content.trim()}
                        className="w-full mt-4 bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isChecking ? '🔍 检测中...' : '🔍 开始检测'}
                    </button>
                </div>

                {/* Result Section */}
                {result && config && (
                    <div className="space-y-4">
                        {/* Risk Level */}
                        <div className={`${config.bg} ${config.border} border rounded-2xl p-6`}>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">{config.emoji}</span>
                                <div>
                                    <div className={`text-xl font-bold ${config.color}`}>{config.label}</div>
                                    <div className="text-sm text-gray-600">
                                        {result.detectedWords.length === 0
                                            ? '未检测到敏感词，可以放心发布'
                                            : `检测到 ${result.detectedWords.length} 个敏感词`
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detected Words */}
                        {result.detectedWords.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">检测到的敏感词</h3>
                                <div className="space-y-3">
                                    {result.detectedWords.map((word, i) => (
                                        <div key={i} className="p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                                                    {word.word}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${word.level === 'critical' ? 'bg-red-100 text-red-700' :
                                                        word.level === 'high' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {word.categoryName}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <span className="text-gray-500">建议替换为：</span>
                                                <span className="text-green-600 ml-1">{word.suggestion || '删除此词'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Highlighted Text Preview */}
                        {result.detectedWords.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-3">文本预览（敏感词已标注）</h3>
                                <div
                                    className="p-4 bg-gray-50 rounded-xl text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: result.highlightedText }}
                                />
                            </div>
                        )}

                        {/* Tips */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-3">📝 优化建议</h3>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>避免使用绝对化用语，如"最好"、"第一"等</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>医疗美容类内容需谨慎，避免功效承诺</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>不要出现其他平台名称，会被限流</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>避免诱导关注、点赞等行为</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
