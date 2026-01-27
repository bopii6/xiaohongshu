'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { playSuccessTone, playTickTone, warmupAudio } from '@/lib/ui/sound';

// 风格配置
const IMAGE_STYLES = [
    { id: 'elegant', name: '精美背景图', description: '极简、大理石等高级感背景', icon: '✨' },
    { id: 'holiday', name: '节日主题图', description: '春节、情人节等节日氛围', icon: '🎉' },
    { id: 'seasonal', name: '季节主题图', description: '春夏秋冬季节氛围', icon: '🌸' },
    { id: 'scene', name: '使用场景图', description: '办公室、家居等场景', icon: '🏠' },
    { id: 'contrast', name: '对比效果图', description: '高级对比展示效果', icon: '📊' },
] as const;

type StyleId = typeof IMAGE_STYLES[number]['id'];

interface GeneratedImage {
    styleId: string;
    styleName: string;
    imageUrl: string;
    error?: string;
}

interface ProductImageGeneratorProps {
    productImage: string;
    productName?: string;
}

export default function ProductImageGenerator({ productImage, productName }: ProductImageGeneratorProps) {
    const [selectedStyles, setSelectedStyles] = useState<Set<StyleId>>(
        new Set() // 默认不选中任何风格，需要用户手动选择
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [failedCount, setFailedCount] = useState(0);
    const [previewImage, setPreviewImage] = useState<{ url: string, name: string } | null>(null);

    const toggleStyle = (styleId: StyleId) => {
        const newSelected = new Set(selectedStyles);
        if (newSelected.has(styleId)) {
            newSelected.delete(styleId);
        } else {
            newSelected.add(styleId);
            playTickTone(); // 选中时播放提示音
        }
        setSelectedStyles(newSelected);
    };

    const selectAll = () => {
        setSelectedStyles(new Set(IMAGE_STYLES.map(s => s.id)));
    };

    const deselectAll = () => {
        setSelectedStyles(new Set());
    };

    const buildImageFileName = (styleName: string) => {
        const safeName = styleName && styleName.trim().length > 0 ? styleName.trim() : '图片';
        return `商品图_${safeName}_${Date.now()}.png`;
    };

    // 下载单张图片（移动端支持系统分享，便于保存到相册）
    const downloadImage = async (imageUrl: string, styleName: string, preferShare: boolean = true) => {
        let objectUrl: string | null = null;
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error('Image fetch failed');
            }
            const blob = await response.blob();
            const fileName = buildImageFileName(styleName);

            if (preferShare && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                const file = new File([blob], fileName, { type: blob.type || 'image/png' });
                const shareData = { files: [file], title: fileName };
                const canShareFiles = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;
                if (canShareFiles) {
                    await navigator.share(shareData);
                    toast.success('已打开系统分享，可保存到相册');
                    return;
                }
            }

            objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('图片已下载');
        } catch {
            toast.error('下载失败，请重试');
        } finally {
            if (objectUrl) {
                window.URL.revokeObjectURL(objectUrl);
            }
        }
    };

    // 批量下载所有图片
    const downloadAllImages = async () => {
        if (generatedImages.length === 0) return;

        toast.promise(
            (async () => {
                let successCount = 0;
                for (let i = 0; i < generatedImages.length; i++) {
                    const img = generatedImages[i];
                    if (img.imageUrl) {
                        try {
                            await downloadImage(img.imageUrl, img.styleName, false);
                            successCount++;
                            // 稍微延迟一下，避免浏览器拦截
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (e) {
                            console.error('Download failed', e);
                        }
                    }
                }
                return successCount;
            })(),
            {
                loading: '正在准备批量下载...',
                success: (count) => `成功开始下载 ${count} 张图片！请留意浏览器弹窗拦截`,
                error: '批量下载遇到问题',
            }
        );
    };

    const generateImages = async () => {
        if (selectedStyles.size === 0) {
            toast.error('请至少选择一种风格');
            return;
        }

        await warmupAudio();
        setIsGenerating(true);
        setGeneratedImages([]);
        setFailedCount(0);
        setShowResults(true);

        try {
            const response = await fetch('/api/product-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: productImage,
                    productName: productName || undefined,
                    styles: Array.from(selectedStyles)
                })
            });

            const data = await response.json();

            if (data.success) {
                setGeneratedImages(data.data.images);
                const failed = data.data.failed?.length || 0;
                setFailedCount(failed);

                if (data.data.successCount > 0) {
                    toast.success(`成功生成 ${data.data.successCount} 张商品图！`);
                    playSuccessTone();
                }
                if (failed > 0) {
                    toast.error(`${failed} 张图片生成失败`);
                }
            } else {
                toast.error(data.error || '生成失败');
            }
        } catch (error) {
            console.error('生成失败:', error);
            toast.error('生成失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="premium-card p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm shadow-lg shadow-purple-200">
                        🎨
                    </span>
                    AI 商品图生成
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">由腾讯混元驱动</span>
            </div>

            {/* Style Selector */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">选择生成风格</label>
                    <div className="flex gap-2">
                        <button
                            onClick={selectAll}
                            className="text-xs text-white bg-[#FF2442] hover:bg-[#E61D3D] px-3 py-1.5 rounded-full font-medium transition-colors shadow-sm"
                        >
                            全选
                        </button>
                        <button
                            onClick={deselectAll}
                            className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full font-medium transition-colors"
                        >
                            取消全选
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {IMAGE_STYLES.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => toggleStyle(style.id)}
                            className={`
                                p-4 rounded-xl border-2 text-left transition-all duration-200 group
                                ${selectedStyles.has(style.id)
                                    ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md'
                                    : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{style.icon}</span>
                                    <span className="text-sm font-semibold text-gray-900">{style.name}</span>
                                </div>
                                {selectedStyles.has(style.id) && (
                                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs flex items-center justify-center">
                                        ✓
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">{style.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button */}
            <button
                onClick={generateImages}
                disabled={isGenerating || selectedStyles.size === 0}
                className="product-generate-btn w-full rounded-2xl py-4 text-lg font-bold transition-all flex items-center justify-center gap-3"
            >
                {isGenerating ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>正在生成 {selectedStyles.size} 张图片...</span>
                    </>
                ) : (
                    <>
                        <span className="text-xl">🖼️</span>
                        <span>一键生成商品图 ({selectedStyles.size})</span>
                    </>
                )}
            </button>

            {/* Lightbox Preview */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <img
                            src={previewImage.url}
                            alt={previewImage.name}
                            className="w-auto h-auto max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />
                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={() => downloadImage(previewImage.url, previewImage.name)}
                                className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <span>⬇️</span> 下载图片
                            </button>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="bg-white/20 text-white px-6 py-2.5 rounded-full font-semibold backdrop-blur-md hover:bg-white/30 transition-all"
                            >
                                关闭
                            </button>
                        </div>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-12 right-0 text-white/80 hover:text-white text-4xl leading-none"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}

            {/* Results */}
            {showResults && (
                <div className="space-y-4 animate-slide-up">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700">
                            生成结果 {generatedImages.length > 0 && `(${generatedImages.length}张)`}
                        </label>
                    </div>

                    {/* 批量下载按钮 - 全宽显眼位置 */}
                    {generatedImages.length > 0 && !isGenerating && (
                        <button
                            onClick={downloadAllImages}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4"
                        >
                            <span className="text-xl">📦</span>
                            <span>一键打包下载全部图片</span>
                        </button>
                    )}

                    {isGenerating && generatedImages.length === 0 && (
                        <div className="text-center py-10 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
                            <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-700 font-medium">AI 正在创作精美商品图...</p>
                            <p className="text-sm text-gray-500 mt-2">预计需要 30-60 秒</p>
                        </div>
                    )}

                    {generatedImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {generatedImages.map((img, index) => (
                                <div key={index} className="relative group animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                    <div
                                        className="rounded-xl overflow-hidden bg-gray-100 shadow-md transition-shadow relative cursor-zoom-in"
                                        style={{ width: '100%', height: '170px' }}
                                        onClick={() => setPreviewImage({ url: img.imageUrl, name: img.styleName })}
                                    >
                                        {img.imageUrl ? (
                                            <img
                                                src={img.imageUrl}
                                                alt={img.styleName}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                                                生成失败
                                            </div>
                                        )}
                                    </div>

                                    {/* 底部信息栏：风格名 + 下载按钮 */}
                                    <div className="flex items-center justify-between mt-2 px-1">
                                        <p className="text-xs text-gray-600 font-medium truncate flex-1">{img.styleName || '风格图'}</p>
                                        {img.imageUrl && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    downloadImage(img.imageUrl, img.styleName);
                                                }}
                                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-full font-bold shadow-md transition-all active:scale-95 flex items-center gap-1"
                                                title="下载此图片"
                                            >
                                                <span>⬇️</span> 下载
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {failedCount > 0 && !isGenerating && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                            <span>⚠️</span>
                            <span><strong>{failedCount} 张图片生成失败</strong> - 请重试或减少风格数量</span>
                        </div>
                    )}

                    {/* Regenerate Button */}
                    {generatedImages.length > 0 && !isGenerating && (
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={generateImages}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <span>🔄</span>
                                重新生成
                            </button>
                            <button
                                onClick={downloadAllImages}
                                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span>📦</span>
                                一键全部下载
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
