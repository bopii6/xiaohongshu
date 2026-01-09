'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublishButton from '@/components/PublishButton';
import LoadingCard from '@/components/LoadingCard';

type ContentStyle = 'zhongcao' | 'ceping' | 'fenxiang' | 'jiaocheng';

interface ContentResult {
    content: string;
    tags: string[];
    suggestedTitles: string[];
}

const styleOptions: { value: ContentStyle; label: string; description: string; emoji: string }[] = [
    { value: 'zhongcao', label: '种草安利', description: '真实体验，让人想买', emoji: '🌱' },
    { value: 'ceping', label: '测评分析', description: '深度测评，专业可信', emoji: '🔬' },
    { value: 'fenxiang', label: '经验分享', description: '干货满满，有价值', emoji: '💡' },
    { value: 'jiaocheng', label: '教程攻略', description: '保姆级教学，易上手', emoji: '📖' }
];

export default function ContentLabPage() {
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState<ContentStyle>('zhongcao');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<ContentResult | null>(null);
    const [streamingContent, setStreamingContent] = useState('');
    const [selectedTitle, setSelectedTitle] = useState('');

    const generateContent = async () => {
        if (!topic.trim()) {
            alert('请输入产品或话题');
            return;
        }

        setIsGenerating(true);
        setResult(null);
        setStreamingContent('');

        try {
            const response = await fetch('/api/generate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, style })
            });

            if (!response.ok || !response.body) {
                throw new Error('生成失败');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const payload = JSON.parse(line);
                        if (payload.type === 'content') {
                            setStreamingContent(prev => prev + payload.data);
                        } else if (payload.type === 'result') {
                            setResult(payload.data);
                            setSelectedTitle(payload.data.suggestedTitles[0] || '');
                            setStreamingContent('');
                        }
                    } catch {
                        // Ignore parse errors
                    }
                }
            }

            if (buffer.trim()) {
                try {
                    const payload = JSON.parse(buffer);
                    if (payload.type === 'result') {
                        setResult(payload.data);
                        setSelectedTitle(payload.data.suggestedTitles[0] || '');
                        setStreamingContent('');
                    }
                } catch {
                    // Ignore
                }
            }
        } catch (error) {
            console.error('生成失败:', error);
            alert('生成失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('已复制到剪贴板');
        } catch {
            alert('复制失败，请手动复制');
        }
    };

    const getFullContent = () => {
        if (!result) return '';
        const title = selectedTitle || result.suggestedTitles[0] || '';
        const tags = result.tags.map(t => `#${t}`).join(' ');
        return `${title}\n\n${result.content}\n\n${tags}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-8">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
                    <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900 transition-colors">
                        ←
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">✍️</span> 爆款文案
                    </h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Input Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold mb-3 text-gray-800">
                        输入产品/话题
                    </label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="例如：补水面膜、健身食谱、旅行攻略..."
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                        onKeyDown={(e) => e.key === 'Enter' && generateContent()}
                    />

                    {/* Style Selection */}
                    <label className="block text-sm font-bold mt-5 mb-3 text-gray-800">
                        选择文案风格
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {styleOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setStyle(option.value)}
                                className={`p-4 rounded-xl border text-left transition-all ${style === option.value
                                        ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-200'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{option.emoji}</span>
                                    <span className="font-semibold text-gray-900 text-sm">{option.label}</span>
                                </div>
                                <p className="text-xs text-gray-500">{option.description}</p>
                            </button>
                        ))}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateContent}
                        disabled={isGenerating || !topic.trim()}
                        className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? '✨ 生成中...' : '🚀 生成爆款文案'}
                    </button>
                </div>

                {/* Loading State */}
                {isGenerating && !streamingContent && (
                    <LoadingCard
                        message="AI正在写作中..."
                        subMessage="预计10秒内生成500字爆款文案"
                    />
                )}

                {/* Streaming Preview */}
                {isGenerating && streamingContent && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">实时生成中...</span>
                            <span className="text-xs text-gray-400">{streamingContent.length} 字</span>
                        </div>
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                                {streamingContent}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Result Section */}
                {result && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-lg">📝</span> 生成结果
                        </h2>

                        {/* Title Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                选择标题（点击选择）
                            </label>
                            <div className="space-y-2">
                                {result.suggestedTitles.map((title, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedTitle(title)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedTitle === title
                                                ? 'border-pink-400 bg-pink-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-900">{title}</span>
                                            {selectedTitle === title && (
                                                <span className="text-pink-500 text-sm">✓</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">文案内容</label>
                                <span className="text-xs text-gray-400">{result.content.length} 字</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-h-80 overflow-y-auto">
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                                    {result.content}
                                </pre>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">推荐标签</label>
                            <div className="flex flex-wrap gap-2">
                                {result.tags.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 bg-pink-50 text-pink-600 text-sm rounded-full"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => copyToClipboard(getFullContent())}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                📋 复制全部
                            </button>
                            <PublishButton content={getFullContent()} className="flex-1" />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
