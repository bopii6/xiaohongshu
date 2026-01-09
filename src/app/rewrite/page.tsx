'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublishButton from '@/components/PublishButton';

type RewriteStyle = 'similar' | 'creative' | 'professional' | 'casual';

interface ParsedNote {
  title: string;
  content: string;
  author: string;
  images: string[];
  videoUrl?: string;
  noteType?: string;
  sourceUrl?: string;
}

interface RewriteResult {
  newTitles: string[];
  newContent: string;
  keyPoints: string[];
}

const styleOptions = [
  { value: 'similar', label: '相似风格', emoji: '🔄' },
  { value: 'creative', label: '创意改写', emoji: '✨' },
  { value: 'professional', label: '专业版', emoji: '📊' },
  { value: 'casual', label: '口语化', emoji: '💬' }
];

export default function RewritePage() {
  const [linkInput, setLinkInput] = useState('');
  const [rewriteStyle, setRewriteStyle] = useState<RewriteStyle>('similar');
  const [isParsing, setIsParsing] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [parsedNote, setParsedNote] = useState<ParsedNote | null>(null);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [error, setError] = useState('');
  const rewriteInFlightRef = useRef(false);
  const rewriteAbortRef = useRef<AbortController | null>(null);

  // 从分享文本中智能提取信息
  const extractFromShareText = (text: string) => {
    // 提取【】中的标题
    const bracketMatch = text.match(/【([^】]+)】/);
    let title = '';
    if (bracketMatch) {
      // 格式通常是: 标题 - 作者 | 小红书
      const parts = bracketMatch[1].split(/\s*[-|]\s*/);
      title = parts[0]?.trim() || '';
    }

    // 提取作者（在 - 和 | 之间）
    const authorMatch = text.match(/【[^】]*\s*-\s*([^|]+)\s*\|/);
    const author = authorMatch?.[1]?.trim() || '';

    return { title, author };
  };

  // 解析链接
  const parseLink = async () => {
    if (!linkInput.trim()) {
      setError('请粘贴小红书笔记链接');
      return;
    }

    // 验证是否包含小红书链接
    if (!linkInput.includes('xiaohongshu.com') && !linkInput.includes('xhslink.com')) {
      setError('请粘贴有效的小红书链接');
      return;
    }

    setIsParsing(true);
    setError('');
    setParsedNote(null);
    setResult(null);

    try {
      // 先从分享文本中提取信息
      const extracted = extractFromShareText(linkInput);

      const response = await fetch('/api/parse-xiaohongshu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput })
      });

      const data = await response.json();

      if (data.success && data.data) {
        // 优先使用从分享文本提取的标题，其次用API返回的
        const title = extracted.title || data.data.title || '小红书笔记';
        const author = extracted.author || data.data.author || '';
        const content = data.data.content || '';
        const images = data.data.images || [];
        const videoUrl = data.data.videoUrl || '';
        const noteType = data.data.noteType || (videoUrl ? 'video' : 'note');
        const sourceUrl = data.data.sourceUrl || '';

        // 检查是否获取到有效内容
        if (content && content.length > 30 && !content.includes('未检测到') && !content.includes('解析遇到')) {
          setParsedNote({
            title,
            content,
            author,
            images,
            videoUrl,
            noteType,
            sourceUrl
          });
        } else {
          // 如果内容解析失败但有标题，尝试用AI生成内容参考
          if (title) {
            setError(`链接解析受限，但已提取标题："${title}"。\n\n由于小红书的反爬保护，无法自动获取正文内容。\n请先在小红书APP中复制正文后再次尝试。`);
          } else {
            setError('小红书限制了外部访问，无法解析此笔记。请尝试其他笔记链接。');
          }
        }
      } else {
        setError(data.error || '解析失败，请检查链接是否正确');
      }
    } catch (err) {
      console.error('解析失败:', err);
      setError('网络错误，请重试');
    } finally {
      setIsParsing(false);
    }
  };

  // AI改写
  const rewriteContent = async () => {
    if (!parsedNote || rewriteInFlightRef.current) return;
    rewriteInFlightRef.current = true;

    setIsRewriting(true);
    setError('');
    setResult(null);

    try {
      rewriteAbortRef.current?.abort();
      const controller = new AbortController();
      rewriteAbortRef.current = controller;

      const response = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalTitle: parsedNote.title,
          originalContent: parsedNote.content,
          style: rewriteStyle
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error('改写失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamFailed = false;

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
            if (payload.type === 'error') {
              setError(payload.data || '改写失败，请重试');
              streamFailed = true;
              break;
            }
            if (payload.type === 'result') {
              setResult({
                newTitles: payload.data.newTitles || [],
                newContent: payload.data.newContent || '',
                keyPoints: payload.data.keyPoints || []
              });
              setSelectedTitle(payload.data.newTitles?.[0] || '');
            }
          } catch { /* ignore */ }
        }

        if (streamFailed) {
          try {
            await reader.cancel();
          } catch { /* ignore */ }
          break;
        }
      }

      if (!streamFailed && buffer.trim()) {
        try {
          const payload = JSON.parse(buffer);
          if (payload.type === 'error') {
            setError(payload.data || '改写失败，请重试');
            return;
          }
          if (payload.type === 'result') {
            setResult({
              newTitles: payload.data.newTitles || [],
              newContent: payload.data.newContent || '',
              keyPoints: payload.data.keyPoints || []
            });
            setSelectedTitle(payload.data.newTitles?.[0] || '');
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('改写失败:', err);
      setError('改写失败，请重试');
    } finally {
      rewriteInFlightRef.current = false;
      setIsRewriting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制');
    } catch { alert('复制失败'); }
  };

  const getFullContent = () => {
    if (!result) return '';
    const title = selectedTitle || result.newTitles[0] || '';
    const tags = result.keyPoints.map(t => `#${t}`).join(' ');
    return `${title}\n\n${result.newContent}\n\n${tags}`;
  };

  const getPublishPayload = () => {
    if (!parsedNote) return null;
    const title = selectedTitle || result?.newTitles?.[0] || parsedNote.title;
    const content = result?.newContent || parsedNote.content;
    const tags = result?.keyPoints || [];
    return {
      title,
      content,
      tags,
      images: parsedNote.images,
      videoUrl: parsedNote.videoUrl,
      noteType: parsedNote.noteType,
      sourceUrl: parsedNote.sourceUrl
    };
  };

  const reset = () => {
    rewriteAbortRef.current?.abort();
    rewriteAbortRef.current = null;
    rewriteInFlightRef.current = false;
    setIsRewriting(false);
    setLinkInput('');
    setParsedNote(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 pb-8">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
          <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900">←</Link>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">🔗</span> 对标图文
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Step 1: Link Input */}
        {!parsedNote && !result && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">1</span>
              粘贴小红书链接
            </h2>

            <p className="text-xs text-gray-500 mb-3">
              在小红书APP中点击"分享"→"复制链接"，然后粘贴到下方
            </p>

            <textarea
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={`粘贴分享内容，例如：
14【怎么没人说这个 - 橘哈哈 | 小红书】😆 https://www.xiaohongshu.com/...`}
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />

            {error && (
              <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-xl text-sm whitespace-pre-wrap">
                {error}
              </div>
            )}

            <button
              onClick={parseLink}
              disabled={isParsing || !linkInput.trim()}
              className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isParsing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  解析中...
                </span>
              ) : '🔍 解析笔记'}
            </button>
          </div>
        )}

        {/* Step 2: Parsed Content & Style Selection */}
        {parsedNote && !result && (
          <div className="space-y-4">
            {/* Parsed Note Preview */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">✓</span>
                  原笔记内容
                </h2>
                <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700">
                  重新解析
                </button>
              </div>

              {/* Images Preview */}
              {parsedNote.images && parsedNote.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  {parsedNote.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={img}
                        alt={`图片${i + 1}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">标题</label>
                  <div className="p-2 bg-gray-50 rounded-lg text-sm text-gray-800 mt-1 font-medium">
                    {parsedNote.title}
                  </div>
                </div>
                {parsedNote.author && (
                  <div className="text-xs text-gray-500">
                    作者：{parsedNote.author}
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500">内容预览</label>
                  <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-600 mt-1 max-h-24 overflow-y-auto">
                    {parsedNote.content.slice(0, 200)}...
                  </div>
                </div>
              </div>
            </div>

            {/* Style Selection */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">2</span>
                选择改写风格
              </h2>

              <div className="grid grid-cols-4 gap-2">
                {styleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRewriteStyle(opt.value as RewriteStyle)}
                    className={`p-3 rounded-xl border text-center transition-all ${rewriteStyle === opt.value
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="text-xl">{opt.emoji}</div>
                    <div className="text-xs text-gray-700 mt-1">{opt.label}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={rewriteContent}
                disabled={isRewriting}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isRewriting ? '✨ AI改写中...' : '🚀 开始改写'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isRewriting && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 border-4 border-gray-100 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-800 font-medium">AI正在改写中...</p>
            <p className="text-gray-500 text-xs mt-1">预计10-15秒完成</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="text-xl">🎉</span> 改写完成
              </h2>
              <button onClick={reset} className="text-sm text-green-600 hover:text-green-700 font-medium">
                改写其他笔记
              </button>
            </div>

            {/* New Titles */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">选择新标题</label>
              <div className="space-y-2">
                {result.newTitles.map((title, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedTitle(title)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedTitle === title
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{title}</span>
                      {selectedTitle === title && <span className="text-green-500">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Content */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">改写内容</label>
                <span className="text-xs text-gray-400">{result.newContent.length} 字</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl max-h-60 overflow-y-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {result.newContent}
                </pre>
              </div>
            </div>

            {/* Tags */}
            {result.keyPoints.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">推荐标签</label>
                <div className="flex flex-wrap gap-2">
                  {result.keyPoints.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-green-50 text-green-600 text-sm rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => copyToClipboard(getFullContent())}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                📋 复制全部
              </button>
              <PublishButton content={getFullContent()} publishData={getPublishPayload() || undefined} className="flex-1" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
