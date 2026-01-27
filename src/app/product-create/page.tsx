'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import ProductImageGenerator from './ProductImageGenerator';
import { playSuccessTone, playStartTone, playPhaseTone, warmupAudio } from '@/lib/ui/sound';

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
            case 'analyzing': return 2;
            case 'generating': return 3;
            case 'completed': return 4;
            default: return 0;
        }
    };

    // AI 阶段动画 + 音效
    useEffect(() => {
        if (isGenerating && currentStep === 'generating') {
            const interval = setInterval(() => {
                setAiPhase(prev => {
                    const next = (prev + 1) % AI_PHASES.length;
                    // 播放阶段切换音效
                    playPhaseTone(next);
                    return next;
                });
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

        await warmupAudio();
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
            playSuccessTone();
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

        await warmupAudio();
        playStartTone(); // 播放启动音效
        setIsGenerating(true);
        setResult(null);
        setAiPhase(0);
        playPhaseTone(0); // 播放第一阶段音效

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
                playSuccessTone();
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
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 pb-8">
            <Toaster position="top-center" />

            {/* 小红书风格 Header */}
            <header className="glass-card sticky top-0 z-50 border-b border-red-100/50">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[#FF2442] hover:bg-white transition-all shadow-sm"
                        >
                            ←
                        </Link>
                        <div className="flex items-center gap-2">
                            {/* 小红薯 Logo风格图标 */}
                            <div className="w-8 h-8 rounded-lg bg-[#FF2442] flex items-center justify-center shadow-lg shadow-red-200">
                                <span className="text-white text-base font-bold">薯</span>
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-gray-900">我有产品</h1>
                                <p className="text-[10px] text-[#FF2442] -mt-0.5">小红薯创作助手</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white bg-gradient-to-r from-[#FF2442] to-[#FF6B6B] px-2 py-0.5 rounded-full font-medium">
                            AI 驱动
                        </span>
                    </div>
                </div>
            </header>


            {/* 四步进度条 */}
            <div className="bg-white sticky top-[56px] z-40 shadow-sm border-b border-gray-100">
                <div className="max-w-lg mx-auto px-4 py-5">
                    <div className="flex items-center justify-between">
                        {PROGRESS_STEPS.map((step, index) => {
                            const isActive = stepIndex === step.id;
                            const isCompleted = stepIndex > step.id;

                            return (
                                <div key={step.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        {/* 圆形图标 */}
                                        <div
                                            className={`
                                                w-12 h-12 rounded-full flex items-center justify-center text-xl
                                                transition-all duration-300 font-bold
                                                ${isCompleted
                                                    ? 'bg-[#10B981] text-white shadow-lg shadow-green-200'
                                                    : isActive
                                                        ? 'bg-[#FF2442] text-white shadow-lg shadow-red-200 ring-4 ring-red-100'
                                                        : 'bg-gray-100 text-gray-400'
                                                }
                                            `}
                                        >
                                            {isCompleted ? '✓' : step.icon}
                                        </div>
                                        {/* 名称 */}
                                        <span
                                            className={`
                                                text-xs mt-2 font-bold
                                                ${isCompleted ? 'text-[#10B981]' : isActive ? 'text-[#FF2442]' : 'text-gray-400'}
                                            `}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                    {/* 连接线 */}
                                    {index < PROGRESS_STEPS.length - 1 && (
                                        <div className="flex-1 h-1 mx-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                                                style={{ width: stepIndex > step.id ? '100%' : '0%' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
                {/* Upload Section */}
                <div className="premium-card overflow-hidden animate-slide-up">
                    {!imagePreview ? (
                        <div className="p-6">
                            <div className="flex items-start gap-3 mb-5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF2442] to-[#FF6B6B] text-white text-sm flex items-center justify-center font-bold shadow-lg shadow-red-200">
                                    1
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 text-lg">上传产品图片</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">AI将自动识别产品并生成种草文案</p>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF2442] via-[#FF6B6B] to-[#FFB4C2] rounded-2xl opacity-50 group-hover:opacity-80 blur transition-opacity duration-300" />
                                <div className="relative rounded-2xl border-2 border-dashed border-red-200 bg-gradient-to-br from-white via-red-50/30 to-pink-50/50 p-10 text-center transition-all hover:border-[#FF6B6B] hover:bg-red-50/50">
                                    <div className="mx-auto mb-5 w-20 h-20 rounded-2xl bg-gradient-to-br from-red-100 to-pink-100 shadow-inner flex items-center justify-center">
                                        <span className="text-4xl animate-float">📷</span>
                                    </div>
                                    <p className="text-gray-800 mb-2 font-semibold text-lg">点击或拖拽上传</p>
                                    <p className="text-sm text-gray-500">支持 JPG、PNG、WebP，最大 10MB</p>
                                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-[#FF2442] shadow-sm border border-red-100">
                                        <span className="inline-block h-2 w-2 rounded-full bg-[#FF2442] animate-pulse" />
                                        小红薯专属 AI
                                    </div>
                                </div>
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
                        <div className="p-5">
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden shadow-lg">
                                    <Image
                                        src={imagePreview}
                                        alt="产品图片"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <button
                                        onClick={clearImage}
                                        className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:scale-110 transition-transform shadow-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">
                                        {result ? `已识别: ${result.productName || '产品'}` : '图片已上传'}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-0.5">点击右上角 × 可更换图片</p>
                                </div>
                                {!result && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Hint & Generate Button */}
                {imagePreview && !result && (
                    <div className="premium-card p-6 space-y-5 animate-slide-up stagger-1">
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF2442] to-[#FF6B6B] text-white text-sm flex items-center justify-center font-bold shadow-lg shadow-red-200">
                                2
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-gray-900 text-lg">补充产品信息（可选）</h2>
                                <p className="text-sm text-gray-500 mt-0.5">帮助AI更准确地识别产品</p>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={productHint}
                            onChange={(e) => setProductHint(e.target.value)}
                            placeholder="例如：玻尿酸面膜、无线蓝牙耳机..."
                            className="w-full px-5 py-4 bg-red-50/50 rounded-xl border border-red-100 focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                        />

                        {/* Generate Button */}
                        {!isGenerating ? (
                            <button
                                onClick={generateContent}
                                className="product-generate-btn w-full rounded-2xl py-4 text-lg font-bold flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl">🚀</span>
                                <span>生成爆款文案</span>
                            </button>
                        ) : (
                            /* AI Processing Animation - 小红薯风格 */
                            <div className="rounded-2xl bg-gradient-to-br from-[#FF2442] via-[#FF6B6B] to-[#FFB4C2] p-6 text-white animate-gradient shadow-xl shadow-red-200">
                                <div className="text-center space-y-4">
                                    {/* Title */}
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-2xl animate-bounce-gentle">✨</span>
                                        <span className="font-bold text-lg">小红薯 AI 正在创作...</span>
                                    </div>

                                    {/* Phase Indicators */}
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                        {AI_PHASES.map((phase, index) => (
                                            <span key={index} className="flex items-center">
                                                <span
                                                    className={`
                                                        text-xs px-3 py-1.5 rounded-full transition-all duration-300
                                                        ${index === aiPhase
                                                            ? 'bg-white text-[#FF2442] font-bold shadow-lg scale-105'
                                                            : index < aiPhase
                                                                ? 'bg-white/30 text-white'
                                                                : 'bg-white/10 text-white/60'
                                                        }
                                                    `}
                                                >
                                                    {index < aiPhase && '✓ '}{phase}
                                                </span>
                                                {index < AI_PHASES.length - 1 && (
                                                    <span className="text-white/40 mx-1">›</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-500 progress-bar-glow"
                                            style={{ width: `${((aiPhase + 1) / AI_PHASES.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Result Section */}
                {result && (
                    <div ref={resultRef} className="premium-card p-6 space-y-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                <span className="text-xl">📝</span> 生成结果
                            </h2>
                            {result.productName && (
                                <span className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1.5 rounded-full font-medium">
                                    识别: {result.productName}
                                </span>
                            )}
                        </div>

                        {/* Title Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                选择标题
                            </label>
                            <div className="space-y-2">
                                {result.titles.map((title, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedTitle(title)}
                                        className={`
                                            p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                            ${selectedTitle === title
                                                ? 'border-purple-400 bg-purple-50 shadow-md'
                                                : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-900 font-medium">{title}</span>
                                            {selectedTitle === title && (
                                                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs flex items-center justify-center">
                                                    ✓
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-semibold text-gray-700">文案内容</label>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{result.content.length} 字</span>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-100 max-h-60 overflow-y-auto">
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                                    {result.content}
                                </pre>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">推荐标签（点击可复制）</label>
                            <div className="flex flex-wrap gap-2">
                                {result.tags.map((tag, i) => (
                                    <button
                                        key={i}
                                        onClick={() => copyToClipboard(`#${tag}`, `#${tag} 已复制`)}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 text-sm rounded-full hover:from-purple-100 hover:to-pink-100 transition-all cursor-pointer active:scale-95 font-medium border border-purple-100"
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
                                className="product-generate-btn w-full rounded-2xl py-4 text-lg font-bold flex items-center justify-center gap-3"
                            >
                                <span className="text-xl">✨</span>
                                一键复制全部内容
                            </button>

                            {/* Copy Feedback */}
                            {copyFeedback && (
                                <div className="text-center text-sm text-green-600 font-semibold animate-bounce-gentle">
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
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            <span>🔄</span>
                            重新生成
                        </button>
                    </div>
                )}

                {/* AI Product Image Generator */}
                {result && imagePreview && (
                    <div className="animate-slide-up stagger-2">
                        <ProductImageGenerator
                            productImage={imagePreview}
                            productName={result.productName}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
