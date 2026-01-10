'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type RewriteStyle = 'similar' | 'creative' | 'professional' | 'casual';

interface ParsedNote {
  title: string;
  content: string;
  author: string;
  sourceUrl?: string;
}

interface RewriteResult {
  newTitles: string[];
  newContent: string;
  keyPoints: string[];
}

// 进度状态
type ProgressStep =
  | 'idle'
  | 'parsing'
  | 'analyzing-structure' // New state for visual delay
  | 'parsed'
  | 'selecting-style'
  | 'rewriting-init'
  | 'rewriting-analyzing'
  | 'rewriting-generating'
  | 'rewriting-polishing'
  | 'completed';

const styleOptions = [
  { value: 'similar', label: '相似风格', emoji: '🔄', desc: '保持原有风格特点' },
  { value: 'creative', label: '创意改写', emoji: '✨', desc: '更加吸引眼球' },
  { value: 'professional', label: '专业版', emoji: '📊', desc: '干货分享风格' },
  { value: 'casual', label: '轻松口语', emoji: '💬', desc: '像朋友聊天一样' }
];

// 进度步骤配置
const progressSteps = [
  { key: 'input', label: '输入链接', icon: '🔗' },
  { key: 'parse', label: '解析内容', icon: '📋' },
  { key: 'style', label: '选择风格', icon: '🎨' },
  { key: 'rewrite', label: 'AI 改写', icon: '✨' },
  { key: 'done', label: '完成', icon: '🎉' }
];

function getStepIndex(status: ProgressStep): number {
  switch (status) {
    case 'idle': return 0;
    case 'parsing':
    case 'analyzing-structure': return 1;
    case 'parsed':
    case 'selecting-style': return 2;
    case 'rewriting-init':
    case 'rewriting-analyzing':
    case 'rewriting-generating':
    case 'rewriting-polishing': return 3;
    case 'completed': return 4;
    default: return 0;
  }
}

function getRewritePhaseText(status: ProgressStep): string {
  switch (status) {
    case 'rewriting-init': return '正在初始化 AI...';
    case 'rewriting-analyzing': return '正在分析原文结构...';
    case 'rewriting-generating': return '正在生成新内容...';
    case 'rewriting-polishing': return '正在润色优化...';
    default: return 'AI 改写中...';
  }
}

function getParsePhaseText(status: ProgressStep): string {
  switch (status) {
    case 'parsing': return '正在连接小红书...';
    case 'analyzing-structure': return '正在分析笔记结构...';
    default: return '解析中...';
  }
}

export default function RewritePage() {
  const [linkInput, setLinkInput] = useState('');
  const [rewriteStyle, setRewriteStyle] = useState<RewriteStyle>('similar');
  const [parsedNote, setParsedNote] = useState<ParsedNote | null>(null);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [error, setError] = useState('');
  const [progressStatus, setProgressStatus] = useState<ProgressStep>('idle');
  const [editedContent, setEditedContent] = useState('');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const rewriteInFlightRef = useRef(false);
  const rewriteAbortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || process.env.NEXT_PUBLIC_BUILD_TIME || 'dev';

  // Auto-scroll to result carefully
  useEffect(() => {
    if (result && resultRef.current) {
      // Smooth scroll but maybe not all the way to top if unwanted
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // Initialize edited content
  useEffect(() => {
    if (result?.newContent) {
      setEditedContent(result.newContent);
    }
  }, [result?.newContent]);

  // Simulate progress phases during rewriting
  useEffect(() => {
    if (progressStatus === 'rewriting-init') {
      const timer = setTimeout(() => setProgressStatus('rewriting-analyzing'), 1500);
      return () => clearTimeout(timer);
    }
    if (progressStatus === 'rewriting-analyzing') {
      const timer = setTimeout(() => setProgressStatus('rewriting-generating'), 2500);
      return () => clearTimeout(timer);
    }
    if (progressStatus === 'rewriting-generating') {
      const timer = setTimeout(() => setProgressStatus('rewriting-polishing'), 4000);
      return () => clearTimeout(timer);
    }
  }, [progressStatus]);

  const extractFromShareText = (text: string) => {
    const bracketMatch = text.match(/【([^】]+)】/);
    let title = '';
    if (bracketMatch) {
      const parts = bracketMatch[1].split(/\s*[-|]\s*/);
      title = parts[0]?.trim() || '';
    }
    const authorMatch = text.match(/【[^】]*\s*-\s*([^|]+)\s*\|/);
    const author = authorMatch?.[1]?.trim() || '';
    return { title, author };
  };

  const parseLink = async () => {
    if (!linkInput.trim()) {
      setError('请粘贴小红书笔记链接');
      return;
    }

    if (!linkInput.includes('xiaohongshu.com') && !linkInput.includes('xhslink.com')) {
      setError('请粘贴有效的小红书链接');
      return;
    }

    setProgressStatus('parsing');
    setError('');
    setParsedNote(null);
    setResult(null);

    try {
      // 1. Artificial delay for "Connecting"
      await new Promise(r => setTimeout(r, 800));

      const extracted = extractFromShareText(linkInput);
      const response = await fetch('/api/parse-xiaohongshu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput })
      });

      const data = await response.json();

      if (data.success && data.data) {
        // 2. Show analysis state
        setProgressStatus('analyzing-structure');
        await new Promise(r => setTimeout(r, 1500));

        const title = extracted.title || data.data.title || '小红书笔记';
        const author = extracted.author || data.data.author || '';
        const content = data.data.content || '';
        const sourceUrl = data.data.sourceUrl || '';

        if (content && content.length > 30 && !content.includes('未检测到') && !content.includes('解析遇到')) {
          setParsedNote({ title, content, author, sourceUrl });
          setProgressStatus('parsed');
          // Short delay before showing style selection
          setTimeout(() => setProgressStatus('selecting-style'), 300);
        } else {
          setError('小红书限制了外部访问，无法解析此笔记。请尝试其他链接。');
          setProgressStatus('idle');
        }
      } else {
        setError(data.error || '解析失败，请检查链接是否正确');
        setProgressStatus('idle');
      }
    } catch (err) {
      console.error('解析失败:', err);
      setError('网络错误，请重试');
      setProgressStatus('idle');
    }
  };

  const rewriteContent = async () => {
    if (!parsedNote || rewriteInFlightRef.current) return;
    rewriteInFlightRef.current = true;

    setProgressStatus('rewriting-init');
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
              setProgressStatus('completed');
            }
          } catch { /* ignore */ }
        }

        if (streamFailed) {
          setProgressStatus('selecting-style');
          try { await reader.cancel(); } catch { /* ignore */ }
          break;
        }
      }

      if (!streamFailed && buffer.trim()) {
        try {
          const payload = JSON.parse(buffer);
          if (payload.type === 'error') {
            setError(payload.data || '改写失败，请重试');
            setProgressStatus('selecting-style');
            return;
          }
          if (payload.type === 'result') {
            setResult({
              newTitles: payload.data.newTitles || [],
              newContent: payload.data.newContent || '',
              keyPoints: payload.data.keyPoints || []
            });
            setSelectedTitle(payload.data.newTitles?.[0] || '');
            setProgressStatus('completed');
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('改写失败:', err);
      setError('改写失败，请重试');
      setProgressStatus('selecting-style');
    } finally {
      rewriteInFlightRef.current = false;
    }
  };

  const copyToClipboard = async (text: string, message = '已复制到剪贴板') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(message);
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch { alert('复制失败'); }
  };

  const getFullContent = () => {
    if (!result) return '';
    const title = selectedTitle || result.newTitles[0] || '';
    const content = isEditingContent ? editedContent : result.newContent;
    const tags = result.keyPoints.map(t => `#${t}`).join(' ');
    return `${title}\n\n${content}\n\n${tags}`;
  };



  const reset = () => {
    rewriteAbortRef.current?.abort();
    rewriteAbortRef.current = null;
    rewriteInFlightRef.current = false;
    setLinkInput('');
    setParsedNote(null);
    setResult(null);
    setError('');
    setEditedContent('');
    setIsEditingContent(false);
    setProgressStatus('idle');
  };

  const currentStepIndex = getStepIndex(progressStatus);
  const isRewriting = progressStatus.startsWith('rewriting');
  const isParsing = progressStatus === 'parsing' || progressStatus === 'analyzing-structure';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
              <span className="text-gray-600">←</span>
            </Link>
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              对标图文
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {parsedNote && (
              <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors">
                重新开始
              </button>
            )}
            <span className="text-[10px] text-gray-400">v{appVersion}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Visual Progress Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 sticky top-16 z-40 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between">
            {progressSteps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-lg transition-all duration-300 ${i < currentStepIndex
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : i === currentStepIndex
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-100 scale-110'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                    {i < currentStepIndex ? '✓' : step.icon}
                  </div>
                  {/* Step Label */}
                  <span className={`text-[10px] md:text-xs mt-2 font-medium transition-colors ${i <= currentStepIndex ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                    {step.label}
                  </span>
                </div>
                {/* Connector Line */}
                {i < progressSteps.length - 1 && (
                  <div className="flex-1 h-1 mx-1 rounded-full overflow-hidden bg-gray-100">
                    <div
                      className={`h-full bg-emerald-500 transition-all duration-500 ${i < currentStepIndex ? 'w-full' : 'w-0'
                        }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Current Step Description & Status */}
          {(isRewriting || isParsing) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-emerald-600 font-medium text-sm">
                  {isParsing ? getParsePhaseText(progressStatus) : getRewritePhaseText(progressStatus)}
                </span>
              </div>

              {isRewriting && (
                <div className="flex justify-center gap-2 mt-3">
                  {['初始化', '分析', '生成', '润色'].map((phase, i) => {
                    const phaseStatus = progressStatus.replace('rewriting-', '');
                    const phaseIndex = ['init', 'analyzing', 'generating', 'polishing'].indexOf(phaseStatus);
                    return (
                      <div
                        key={phase}
                        className={`px-2 py-0.5 rounded-full text-[10px] transition-all ${i < phaseIndex
                          ? 'bg-emerald-100 text-emerald-600'
                          : i === phaseIndex
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : 'bg-gray-100 text-gray-400'
                          }`}
                      >
                        {phase}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 1: Link Input (Compact Mode when Parsed) */}
        {!parsedNote && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 animate-slide-up">
            <div className="p-4 border-b border-gray-50 bg-gradient-to-r from-emerald-50 to-teal-50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">1</span>
                粘贴小红书链接
              </h2>
            </div>
            <div className="p-4">
              <textarea
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="从小红书 APP 分享笔记，复制链接后粘贴到这里..."
                rows={3}
                disabled={isParsing}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 resize-none text-sm disabled:opacity-50"
              />
              <button
                onClick={parseLink}
                disabled={isParsing || !linkInput.trim()}
                className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200/50 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                {isParsing ? '解析中...' : '🔍 解析笔记'}
              </button>
            </div>
          </div>
        )}

        {/* Compact Link Display when Parsed */}
        {parsedNote && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-2 text-sm text-gray-600 overflow-hidden">
              <span className="text-emerald-500 text-lg">🔗</span>
              <span className="truncate max-w-[200px] md:max-w-sm">{linkInput}</span>
            </div>
            <button onClick={reset} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 whitespace-nowrap px-2 py-1 bg-emerald-50 rounded-lg">
              更换链接
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm whitespace-pre-wrap mb-4 animate-slide-up">
            {error}
          </div>
        )}

        {/* Combined Parsed Content & Style Selection (Compact Layout) */}
        {parsedNote && !result && (
          <div className="animate-slide-up space-y-4">
            {/* Content Preview (More Compact) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-3 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">✓</span>
                  原笔记
                </h2>
                <span className="text-xs text-gray-400">{parsedNote.content.length} 字</span>
              </div>
              <div className="p-3">
                <div className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">{parsedNote.title}</div>
                <div className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                  {parsedNote.content}
                </div>
              </div>
            </div>

            {/* Style Selection (Compact Grid) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-3 border-b border-gray-50 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">2</span>
                <h2 className="font-semibold text-gray-700 text-sm">选择改写风格</h2>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRewriteStyle(opt.value as RewriteStyle)}
                      disabled={isRewriting}
                      className={`p-2.5 rounded-xl border text-left transition-all ${rewriteStyle === opt.value
                        ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        } disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lg">{opt.emoji}</span>
                        <span className="font-medium text-gray-900 text-sm">{opt.label}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 pl-[26px]">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={rewriteContent}
                  disabled={isRewriting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200/50 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {isRewriting ? 'AI 改写中...' : '🚀 开始改写'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {result && (
          <div ref={resultRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-gray-50 bg-gradient-to-r from-emerald-100 to-teal-100">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  改写完成
                </h2>
                <button
                  onClick={() => { setResult(null); setProgressStatus('selecting-style'); setIsEditingContent(false); }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  重新选择风格
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* New Titles */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">选择标题</label>
                <div className="space-y-2">
                  {result.newTitles.map((title, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTitle(title)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${selectedTitle === title
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-gray-100 hover:border-gray-200'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">{title}</span>
                        {selectedTitle === title && <span className="text-emerald-500 text-lg">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* New Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">改写内容</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{(isEditingContent ? editedContent : result.newContent).length} 字</span>
                    <button
                      onClick={() => setIsEditingContent(!isEditingContent)}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      {isEditingContent ? '完成编辑' : '编辑内容'}
                    </button>
                  </div>
                </div>
                {isEditingContent ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-800 leading-relaxed min-h-[200px] focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none resize-y"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl max-h-60 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {result.newContent}
                    </pre>
                  </div>
                )}
              </div>

              {/* Tags */}
              {result.keyPoints.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">推荐标签</label>
                  <div className="flex flex-wrap gap-2">
                    {result.keyPoints.map((tag, i) => (
                      <button
                        key={i}
                        onClick={() => copyToClipboard(`#${tag}`, `标签 #${tag} 已复制`)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-sm rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy Success Toast */}
              {copyFeedback && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-slide-up z-50 backdrop-blur-md border border-white/10">
                  <span className="text-xl">🎉</span>
                  <span className="font-medium">{copyFeedback}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    copyToClipboard(getFullContent(), '全部内容已复制！去发帖吧 🚀');
                    // Optional: fire confetti if we had a library, but simple toast is good for now
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200/50 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span className="text-xl group-hover:animate-bounce">📋</span>
                  <span className="text-lg">一键复制全部内容</span>
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span>💡 提示：复制后直接打开小红书粘贴即可</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
