'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface ProductResult {
    productName: string;
    titles: string[];
    content: string;
    tags: string[];
}

// 进度步骤配置
const PROGRESS_STEPS = [
    { id: 1, label: '上传图片', icon: '📷', key: 'upload' },
    { id: 2, label: '识别产品', icon: '🔍', key: 'analyzing' },
    { id: 3, label: 'AI 创作', icon: '✨', key: 'generating' },
    { id: 4, label: '完成', icon: '🎉', key: 'completed' },
] as const;

// AI 创作子阶段
const AI_PHASES = ['分析图片', '识别产品', '生成标题', '撰写文案', '推荐标签'];

type StepKey = 'idle' | 'upload' | 'analyzing' | 'generating' | 'completed';

export default function ProductCreatePage() {
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<ProductResult | null>(null);
    const [selectedTitle, setSelectedTitle] = useState('');
    const [productHint, setProductHint] = useState('');
    const [currentStep, setCurrentStep] = useState<StepKey>('idle');
    const [aiPhase, setAiPhase] = useState(0);
    const [copyFeedback, setCopyFeedback] = useState('');
    const resultRef = useRef<HTMLDivElement>(null);

    // 获取当前步骤索引
    const getStepIndex = () => {
        switch (currentStep) {
            case 'idle': return 0;
            case 'upload': return 1;
            case 'analyzing': return 1;
            case 'generating': return 3;
            case 'completed': return 4;
            default: return 0;
        }
    };

    // AI 阶段动画
    useEffect(() => {
        if (isGenerating && currentStep === 'generating') {
            const interval = setInterval(() => {
                setAiPhase(prev => (prev + 1) % AI_PHASES.length);
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [isGenerating, currentStep]);

    // 滚动到结果
    useEffect(() => {
        if (result && resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [result]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('请上传 JPEG、PNG 或 WebP 格式的图片');
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('图片文件过大，请上传小于10MB的图片');
            return;
        }

        setIsUploading(true);
        setCurrentStep('upload');

        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
            setIsUploading(false);
            toast.success('图片上传成功！');
        };
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setImagePreview('');
        setResult(null);
        setCurrentStep('idle');
        setProductHint('');
    };

    const generateContent = async () => {
        if (!imagePreview) {
            toast.error('请先上传产品图片');
            return;
        }

        setIsGenerating(true);
        setResult(null);
        setAiPhase(0);

        // 阶段1: 分析中
        setCurrentStep('analyzing');
        await new Promise(resolve => setTimeout(resolve, 800));

        // 阶段2: 生成中
        setCurrentStep('generating');

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
                setCurrentStep('completed');
                toast.success('文案生成成功！');
            } else {
                toast.error(data.error || '生成失败');
                setCurrentStep('upload');
            }
        } catch (error) {
            console.error('生成失败:', error);
            toast.error('生成失败，请重试');
            setCurrentStep('upload');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async (text: string, message: string = '已复制！') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyFeedback(message);
            toast.success('🎉 已复制！去发帖吧 🚀', {
                icon: '📋',
                duration: 2000,
            });
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch {
            toast.error('复制失败');
        }
    };

    const getFullContent = () => {
        if (!result) return '';
        const title = selectedTitle || result.titles[0] || '';
        const tags = result.tags.map(t => `#${t}`).join(' ');
        return `${title}\n\n${result.content}\n\n${tags}`;
    };

    const stepIndex = getStepIndex();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-8">
            <Toaster position="top-center" />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900 transition-colors">
                            ←
                        </Link>
                        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-xl">📦</span> 我有产品
                        </h1>
                    </div>
                    <span className="text-xs text-gray-400">
                        v{new Date().toISOString().slice(0, 16).replace('T', ' ')}
                    </span>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-[60px] z-40 py-4">
                <div className="max-w-lg mx-auto px-4">
                    <div className="flex items-center justify-between">
                        {PROGRESS_STEPS.map((step, index) => {
                            const isActive = stepIndex === step.id;
                            const isCompleted = stepIndex > step.id;
                            const isPending = stepIndex < step.id;

                            return (
                                <div key={step.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${isCompleted
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                : isActive
                                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 animate-pulse'
                                                    : 'bg-gray-100 text-gray-400'
                                                }`}
                                        >
                                            {isCompleted ? '✓' : step.icon}
                                        </div>
                                        <span
                                            className={`text-xs mt-1 font-medium transition-colors ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                                                }`}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                    {index < PROGRESS_STEPS.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${stepIndex > step.id ? 'bg-green-400' : 'bg-gray-200'
                                                }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
                {/* Upload Section - Compact when image uploaded */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {!imagePreview ? (
                        <div className="p-6">
                            <div className="flex items-start gap-3 mb-4">
                                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-bold">1</span>
                                <div>
                                    <h2 className="font-bold text-gray-800">上传产品图片</h2>
                                    <p className="text-sm text-gray-500">AI将自动识别产品并生成种草文案</p>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors relative">
                                <div className="text-5xl mb-3">📷</div>
                                <p className="text-gray-600 mb-2 font-medium">点击或拖拽上传产品图片</p>
                                <p className="text-xs text-gray-400">支持 JPG、PNG、WebP 格式，最大 10MB</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isUploading}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 flex-shrink-0">
                                    <Image
                                        src={imagePreview}
                                        alt="产品图片"
                                        fill
                                        className="rounded-lg object-cover"
                                        unoptimized
                                    />
                                    <button
                                        onClick={clearImage}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                        {result ? `已识别: ${result.productName || '产品'}` : '图片已上传'}
                                    </p>
                                    <p className="text-xs text-gray-500">点击右上角 × 可更换图片</p>
                                </div>
                                {!result && (
                                    <span className="text-green-500 text-xl">✓</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Hint & Generate Button */}
                {imagePreview && !result && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-bold">2</span>
                            <div className="flex-1">
                                <h2 className="font-bold text-gray-800 mb-1">补充产品信息（可选）</h2>
                                <p className="text-sm text-gray-500">帮助AI更准确地识别产品</p>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={productHint}
                            onChange={(e) => setProductHint(e.target.value)}
                            placeholder="例如：玻尿酸面膜、无线蓝牙耳机..."
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900"
                        />

                        <button
                            onClick={generateContent}
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center animate-pulse">
                                            <span className="text-sm">✨</span>
                                        </div>
                                        <span className="font-bold text-blue-600">AI 正在创作...</span>
                                    </div>

                                    {/* Inline sub-phase indicators */}
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                        {AI_PHASES.map((phase, index) => (
                                            <span key={index} className="flex items-center">
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full transition-all ${index === aiPhase
                                                            ? 'bg-blue-500 text-white font-medium'
                                                            : index < aiPhase
                                                                ? 'bg-green-100 text-green-600'
                                                                : 'bg-gray-100 text-gray-400'
                                                        }`}
                                                >
                                                    {phase}
                                                </span>
                                                {index < AI_PHASES.length - 1 && (
                                                    <span className="text-gray-300 mx-0.5 text-xs">→</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                            style={{ width: `${((aiPhase + 1) / AI_PHASES.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span>🚀</span>
                                    生成爆款文案
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Result Section */}
                {result && (
                    <div ref={resultRef} className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
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
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-h-60 overflow-y-auto">
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                                    {result.content}
                                </pre>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">推荐标签（点击可复制）</label>
                            <div className="flex flex-wrap gap-2">
                                {result.tags.map((tag, i) => (
                                    <button
                                        key={i}
                                        onClick={() => copyToClipboard(`#${tag}`, `#${tag} 已复制`)}
                                        className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full hover:bg-blue-100 transition-colors cursor-pointer active:scale-95"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Copy All Button */}
                        <div className="pt-2 space-y-3">
                            <button
                                onClick={() => copyToClipboard(getFullContent())}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span>✨</span>
                                一键复制全部内容
                            </button>

                            {/* Copy Feedback */}
                            {copyFeedback && (
                                <div className="text-center text-sm text-green-600 font-medium animate-bounce">
                                    {copyFeedback}
                                </div>
                            )}

                            <p className="text-center text-xs text-gray-400">
                                💡 提示：复制后直接打开小红书粘贴即可
                            </p>
                        </div>

                        {/* Regenerate Button */}
                        <button
                            onClick={generateContent}
                            disabled={isGenerating}
                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🔄</span>
                            重新生成
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
