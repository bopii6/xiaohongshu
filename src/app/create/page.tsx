/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type UserType = 'business' | 'ip';
type StyleType = 'casual' | 'professional' | 'cute' | 'cool';

interface GeneratedContent {
  title: string;
  intro: string;
  highlights: string[];
  closing: string;
  tags: string[];
}

interface FormValues {
  productName: string;
  productCategory: string;
  features: string;
  targetAudience: string;
  style: StyleType;
}

interface MediaItem {
  id: string;
  url: string;
  name: string;
  size: number;
}

const defaultFormValues: FormValues = {
  productName: '',
  productCategory: '',
  features: '',
  targetAudience: '',
  style: 'casual',
};

const MIN_MEDIA = 3;
const MAX_MEDIA = 6;

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const userType: UserType = typeParam === 'ip' ? 'ip' : 'business';

  const [formData, setFormData] = useState<FormValues>(defaultFormValues);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [prefillMessage, setPrefillMessage] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (typeParam && typeParam !== 'business' && typeParam !== 'ip') {
      router.push('/');
    }
  }, [typeParam, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedDraft = window.localStorage.getItem('draftFormData');
    if (storedDraft) {
      try {
        const parsed = JSON.parse(storedDraft) as Partial<FormValues>;
        setFormData((prev) => ({ ...prev, ...parsed }));
        setPrefillMessage('已根据模板填入基础信息，可继续补充后生成。');
      } catch {
        // ignore
      } finally {
        window.localStorage.removeItem('draftFormData');
      }
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMediaChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const allowed = MAX_MEDIA - mediaItems.length;
    if (allowed <= 0) {
      alert(`最多上传 ${MAX_MEDIA} 张图片`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, allowed);
    try {
      const payloads = await Promise.all(
        selectedFiles.map(async (file) => ({
          id: generateId(),
          url: await readFileAsDataUrl(file),
          name: file.name,
          size: file.size,
        }))
      );
      setMediaItems((prev) => [...prev, ...payloads]);
      event.target.value = '';
    } catch (error) {
      console.error('读取图片失败', error);
      alert('素材读取失败，请重试。');
    }
  };

  const removeMediaItem = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const generateContent = async () => {
    if (!formData.productName || !formData.features) {
      alert('请先填写产品 / 内容主题以及核心亮点。');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType,
          ...formData,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '生成失败');
      }

      setGeneratedContent(result.data);
    } catch (error) {
      console.error('生成失败', error);
      alert('生成失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateContentField = (field: keyof GeneratedContent, value: string) => {
    setGeneratedContent((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateHighlight = (index: number, value: string) => {
    setGeneratedContent((prev) => {
      if (!prev) return prev;
      const highlights = [...prev.highlights];
      highlights[index] = value;
      return { ...prev, highlights };
    });
  };

  const removeHighlight = (index: number) => {
    setGeneratedContent((prev) => {
      if (!prev) return prev;
      const highlights = prev.highlights.filter((_, idx) => idx !== index);
      return { ...prev, highlights };
    });
  };

  const addHighlight = () => {
    setGeneratedContent((prev) => {
      if (!prev) return prev;
      return { ...prev, highlights: [...prev.highlights, '新增亮点描述'] };
    });
  };

  const buildFullContent = (content: GeneratedContent) => {
    const highlightText = content.highlights
      .filter((item) => item.trim().length > 0)
      .map((item, idx) => `${idx + 1}. ${item.trim()}`)
      .join('\n');

    return `${content.title}\n\n${content.intro}\n\n${highlightText}\n\n${content.closing}\n\n${content.tags.join(' ')}`;
  };

  const copyToClipboard = async () => {
    if (!generatedContent) return;
    const fullContent = buildFullContent(generatedContent);

    try {
      await navigator.clipboard.writeText(fullContent);
      alert('内容已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动选择文本复制。');
    }
  };

  const saveToHistory = async () => {
    if (!generatedContent) return;
    if (mediaItems.length < MIN_MEDIA) {
      alert(`请至少上传 ${MIN_MEDIA} 张素材图片。`);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: userType,
          formData,
          content: generatedContent,
          media: mediaItems.map((item) => item.url),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '保存失败');
      }

      alert('已保存到云端历史记录，可在任意设备查看。');
    } catch (error) {
      console.error('保存历史失败', error);
      alert('保存失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-20 md:pb-0">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Link href="/" className="text-pink-600 mr-4 hover:underline">
              ← 返回
            </Link>
            <h1 className="text-xl font-bold text-gray-900">
              {userType === 'business' ? '🛍️ 商品推广内容生成' : '✨ 个人 IP 内容生成'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">填写基本信息</h2>

            {prefillMessage && (
              <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-700">
                {prefillMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {userType === 'business' ? '产品名称' : '内容主题'} *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder={userType === 'business' ? '例如：玻尿酸修护面膜' : '例如：如何提高工作效率'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {userType === 'business' ? '产品分类' : '内容领域'}
                </label>
                <select
                  name="productCategory"
                  value={formData.productCategory}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="">请选择</option>
                  <option value="美妆护肤">美妆护肤</option>
                  <option value="服饰穿搭">服饰穿搭</option>
                  <option value="数码科技">数码科技</option>
                  <option value="家居生活">家居生活</option>
                  <option value="母婴亲子">母婴亲子</option>
                  <option value="学习成长">学习成长</option>
                  <option value="职场发展">职场发展</option>
                  <option value="健身运动">健身运动</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {userType === 'business' ? '产品特点 / 卖点' : '内容要点'} *
                </label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder={
                    userType === 'business'
                      ? '用逗号或换行分隔，例如：补水保湿、淡化细纹、无酒精、敏感肌可用'
                      : '用逗号或换行分隔，例如：时间管理技巧、常见误区、实用工具推荐'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标受众</label>
                <input
                  type="text"
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="例如：20-30 岁上班族、宝妈、健身新手等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">内容风格</label>
                <select
                  name="style"
                  value={formData.style}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="casual">轻松日常</option>
                  <option value="professional">专业权威</option>
                  <option value="cute">可爱甜美</option>
                  <option value="cool">潮流酷炫</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">素材上传</label>
                <span className="text-xs text-gray-500">
                  至少 {MIN_MEDIA} 张，最多 {MAX_MEDIA} 张
                </span>
              </div>
              <div className="border border-dashed border-gray-300 rounded-xl p-4">
                <input
                  id="media-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleMediaChange}
                />
                <label
                  htmlFor="media-upload"
                  className="flex flex-col items-center justify-center cursor-pointer text-gray-500 text-sm"
                >
                  <span className="text-3xl mb-2">📷</span>
                  点击上传或拖拽图片，支持批量添加
                </label>

                {mediaItems.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {mediaItems.map((item) => (
                      <div key={item.id} className="relative">
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeMediaItem(item.id)}
                          className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full w-6 h-6 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {mediaItems.length < MIN_MEDIA && (
                <p className="mt-2 text-xs text-red-500">发布前请至少上传 {MIN_MEDIA} 张图片。</p>
              )}
            </div>

            <button
              onClick={generateContent}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'AI 正在生成...' : '🚀 生成小红书内容'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">内容编辑与输出</h2>

            {generatedContent ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                  <input
                    type="text"
                    value={generatedContent.title}
                    onChange={(e) => updateContentField('title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">开场引子</label>
                  <textarea
                    value={generatedContent.intro}
                    onChange={(e) => updateContentField('intro', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">亮点拆解</label>
                    <button
                      type="button"
                      onClick={addHighlight}
                      className="text-sm text-pink-600 hover:underline"
                    >
                      + 添加亮点
                    </button>
                  </div>
                  <div className="space-y-3">
                    {generatedContent.highlights.map((highlight, index) => (
                      <div key={index} className="flex gap-2">
                        <textarea
                          value={highlight}
                          onChange={(e) => updateHighlight(index, e.target.value)}
                          rows={2}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                        {generatedContent.highlights.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeHighlight(index)}
                            className="text-red-500 text-sm"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">结尾号召</label>
                  <textarea
                    value={generatedContent.closing}
                    onChange={(e) => updateContentField('closing', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标签建议</label>
                  <div className="flex flex-wrap gap-2">
                    {generatedContent.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容预览</label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-line">
                    {buildFullContent(generatedContent)}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={async () => {
                      if (!generatedContent) return;
                      const fullContent = buildFullContent(generatedContent);
                      try {
                        await navigator.clipboard.writeText(fullContent);
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.location.href = 'xhsdiscover://publish/publish';
                          setTimeout(() => {
                            alert('内容已复制！如果未自动跳转，请手动打开小红书 App 点击 + 号发布。');
                          }, 1500);
                        } else {
                          window.open('https://creator.xiaohongshu.com/publish/publish', '_blank');
                          alert('内容已复制！请在打开的网页中粘贴发布。');
                        }
                      } catch {
                        alert('复制失败，请手动复制。');
                      }
                    }}
                    className="w-full bg-[#FF2442] text-white py-3 rounded-lg font-bold hover:bg-[#e01e3a] transition-colors shadow-md flex items-center justify-center"
                  >
                    <span className="mr-2">🚀</span> 一键去小红书发布
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                    >
                      📋 仅复制
                    </button>
                    <button
                      onClick={saveToHistory}
                      disabled={isSaving}
                      className="flex-1 bg-green-50 text-green-600 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium border border-green-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? '保存中...' : '💾 保存记录'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🪄</div>
                <p className="text-gray-500">填写左侧信息并上传素材后，点击按钮即可生成可编辑的内容。</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
