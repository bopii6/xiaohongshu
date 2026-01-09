'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublishButton from '@/components/PublishButton';
import LoadingCard from '@/components/LoadingCard';

interface ProductResult {
    productName: string;
    titles: string[];
    content: string;
    tags: string[];
}

export default function ProductCreatePage() {
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<ProductResult | null>(null);
    const [selectedTitle, setSelectedTitle] = useState('');
    const [productHint, setProductHint] = useState('');

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('请上传 JPEG、PNG 或 WebP 格式的图片');
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('图片文件过大，请上传小于10MB的图片');
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setImagePreview('');
        setResult(null);
    };

    const generateContent = async () => {
        if (!imagePreview) {
            alert('请先上传产品图片');
            return;
        }

        setIsGenerating(true);
        setResult(null);

        try {
            const response = await fetch('/api/product-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: imagePreview,
                    productHint: productHint.trim() || undefined
                })
            });

            const data = await response.json();
            if (data.success) {
                setResult(data.data);
                setSelectedTitle(data.data.titles[0] || '');
            } else {
                alert(data.error || '生成失败');
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
            alert('复制失败');
        }
    };

    const getFullContent = () => {
        if (!result) return '';
        const title = selectedTitle || result.titles[0] || '';
        const tags = result.tags.map(t => `#${t}`).join(' ');
        return `${title}\n\n${result.content}\n\n${tags}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-8">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
                    <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900 transition-colors">
                        ←
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">📦</span> 我有产品
                    </h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Info Banner */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">✨</span>
                        <div className="text-sm text-gray-600">
                            <p className="font-medium text-gray-800 mb-1">一张图，生成爆款文案</p>
                            <p>上传产品图片，AI自动识别并生成种草标题和文案。</p>
                        </div>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold mb-3 text-gray-800">
                        上传产品图片
                    </label>

                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors relative">
                        {!imagePreview ? (
                            <>
                                <div className="text-4xl mb-3">📷</div>
                                <p className="text-gray-600 mb-2">点击或拖拽上传产品图片</p>
                                <p className="text-xs text-gray-400">支持 JPG、PNG、WebP 格式</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isUploading}
                                />
                            </>
                        ) : (
                            <div className="relative">
                                <Image
                                    src={imagePreview}
                                    alt="产品图片"
                                    width={300}
                                    height={300}
                                    className="mx-auto max-h-64 rounded-lg shadow-sm object-contain"
                                    unoptimized
                                />
                                <button
                                    onClick={clearImage}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>

                    {imagePreview && (
                        <>
                            {/* Optional Product Hint */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    产品名称（可选，帮助AI更准确识别）
                                </label>
                                <input
                                    type="text"
                                    value={productHint}
                                    onChange={(e) => setProductHint(e.target.value)}
                                    placeholder="例如：玻尿酸面膜、无线蓝牙耳机..."
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900"
                                />
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={generateContent}
                                disabled={isGenerating}
                                className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? '✨ 生成中...' : '🚀 生成爆款文案'}
                            </button>
                        </>
                    )}
                </div>

                {/* Loading State */}
                {isGenerating && (
                    <LoadingCard
                        message="AI正在分析产品..."
                        subMessage="识别产品特点并生成种草文案"
                    />
                )}

                {/* Result Section */}
                {result && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="text-lg">📝</span> 生成结果
                            </h2>
                            {result.productName && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                                    识别: {result.productName}
                                </span>
                            )}
                        </div>

                        {/* Title Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                选择标题
                            </label>
                            <div className="space-y-2">
                                {result.titles.map((title, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedTitle(title)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedTitle === title
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-900">{title}</span>
                                            {selectedTitle === title && (
                                                <span className="text-blue-500 text-sm">✓</span>
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
                                        className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full"
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
