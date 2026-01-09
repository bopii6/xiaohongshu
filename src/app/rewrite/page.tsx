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
  { value: 'similar', label: '鐩镐技椋庢牸', emoji: '馃攧' },
  { value: 'creative', label: '鍒涙剰鏀瑰啓', emoji: '鉁? },
  { value: 'professional', label: '涓撲笟鐗?, emoji: '馃搳' },
  { value: 'casual', label: '鍙ｈ鍖?, emoji: '馃挰' }
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
  const appVersion =
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    'dev';

  // 浠庡垎浜枃鏈腑鏅鸿兘鎻愬彇淇℃伅
  const extractFromShareText = (text: string) => {
    // 鎻愬彇銆愩€戜腑鐨勬爣棰?    const bracketMatch = text.match(/銆?[^銆慮+)銆?);
    let title = '';
    if (bracketMatch) {
      // 鏍煎紡閫氬父鏄? 鏍囬 - 浣滆€?| 灏忕孩涔?      const parts = bracketMatch[1].split(/\s*[-|]\s*/);
      title = parts[0]?.trim() || '';
    }

    // 鎻愬彇浣滆€咃紙鍦?- 鍜?| 涔嬮棿锛?    const authorMatch = text.match(/銆怺^銆慮*\s*-\s*([^|]+)\s*\|/);
    const author = authorMatch?.[1]?.trim() || '';

    return { title, author };
  };

  // 瑙ｆ瀽閾炬帴
  const parseLink = async () => {
    if (!linkInput.trim()) {
      setError('璇风矘璐村皬绾功绗旇閾炬帴');
      return;
    }

    // 楠岃瘉鏄惁鍖呭惈灏忕孩涔﹂摼鎺?    if (!linkInput.includes('xiaohongshu.com') && !linkInput.includes('xhslink.com')) {
      setError('璇风矘璐存湁鏁堢殑灏忕孩涔﹂摼鎺?);
      return;
    }

    setIsParsing(true);
    setError('');
    setParsedNote(null);
    setResult(null);

    try {
      // 鍏堜粠鍒嗕韩鏂囨湰涓彁鍙栦俊鎭?      const extracted = extractFromShareText(linkInput);

      const response = await fetch('/api/parse-xiaohongshu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput })
      });

      const data = await response.json();

      if (data.success && data.data) {
        // 浼樺厛浣跨敤浠庡垎浜枃鏈彁鍙栫殑鏍囬锛屽叾娆＄敤API杩斿洖鐨?        const title = extracted.title || data.data.title || '灏忕孩涔︾瑪璁?;
        const author = extracted.author || data.data.author || '';
        const content = data.data.content || '';
        const images = data.data.images || [];
        const videoUrl = data.data.videoUrl || '';
        const noteType = data.data.noteType || (videoUrl ? 'video' : 'note');
        const sourceUrl = data.data.sourceUrl || '';

        // 妫€鏌ユ槸鍚﹁幏鍙栧埌鏈夋晥鍐呭
        if (content && content.length > 30 && !content.includes('鏈娴嬪埌') && !content.includes('瑙ｆ瀽閬囧埌')) {
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
          // 濡傛灉鍐呭瑙ｆ瀽澶辫触浣嗘湁鏍囬锛屽皾璇曠敤AI鐢熸垚鍐呭鍙傝€?          if (title) {
            setError(`閾炬帴瑙ｆ瀽鍙楅檺锛屼絾宸叉彁鍙栨爣棰橈細"${title}"銆俓n\n鐢变簬灏忕孩涔︾殑鍙嶇埇淇濇姢锛屾棤娉曡嚜鍔ㄨ幏鍙栨鏂囧唴瀹广€俓n璇峰厛鍦ㄥ皬绾功APP涓鍒舵鏂囧悗鍐嶆灏濊瘯銆俙);
          } else {
            setError('灏忕孩涔﹂檺鍒朵簡澶栭儴璁块棶锛屾棤娉曡В鏋愭绗旇銆傝灏濊瘯鍏朵粬绗旇閾炬帴銆?);
          }
        }
      } else {
        setError(data.error || '瑙ｆ瀽澶辫触锛岃妫€鏌ラ摼鎺ユ槸鍚︽纭?);
      }
    } catch (err) {
      console.error('瑙ｆ瀽澶辫触:', err);
      setError('缃戠粶閿欒锛岃閲嶈瘯');
    } finally {
      setIsParsing(false);
    }
  };

  // AI鏀瑰啓
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
        throw new Error('鏀瑰啓澶辫触');
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
              setError(payload.data || '鏀瑰啓澶辫触锛岃閲嶈瘯');
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
            setError(payload.data || '鏀瑰啓澶辫触锛岃閲嶈瘯');
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
      console.error('鏀瑰啓澶辫触:', err);
      setError('鏀瑰啓澶辫触锛岃閲嶈瘯');
    } finally {
      rewriteInFlightRef.current = false;
      setIsRewriting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('宸插鍒?);
    } catch { alert('澶嶅埗澶辫触'); }
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

  const getProxyImageUrl = (url: string) => {
    const params = new URLSearchParams({ url });
    if (parsedNote?.sourceUrl) {
      params.set('referer', parsedNote.sourceUrl);
    }
    return `/api/xhs/image?${params.toString()}`;
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
          <Link href="/" className="text-gray-600 mr-4 text-lg hover:text-gray-900">鈫?/Link>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">馃敆</span> 瀵规爣鍥炬枃
          </h1>
          <span className="ml-auto text-[10px] text-gray-400">v{appVersion}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Step 1: Link Input */}
        {!parsedNote && !result && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">1</span>
              绮樿创灏忕孩涔﹂摼鎺?            </h2>

            <p className="text-xs text-gray-500 mb-3">
              鍦ㄥ皬绾功APP涓偣鍑?鍒嗕韩"鈫?澶嶅埗閾炬帴"锛岀劧鍚庣矘璐村埌涓嬫柟
            </p>

            <textarea
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={`绮樿创鍒嗕韩鍐呭锛屼緥濡傦細
14銆愭€庝箞娌′汉璇磋繖涓?- 姗樺搱鍝?| 灏忕孩涔︺€戰煒?https://www.xiaohongshu.com/...`}
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
                  瑙ｆ瀽涓?..
                </span>
              ) : '馃攳 瑙ｆ瀽绗旇'}
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
                  <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">鉁?/span>
                  鍘熺瑪璁板唴瀹?                </h2>
                <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700">
                  閲嶆柊瑙ｆ瀽
                </button>
              </div>

              {/* Images Preview */}
              {parsedNote.images && parsedNote.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  {parsedNote.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={getProxyImageUrl(img)}
                        alt={`鍥剧墖${i + 1}`}
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
                  <label className="text-xs text-gray-500">鏍囬</label>
                  <div className="p-2 bg-gray-50 rounded-lg text-sm text-gray-800 mt-1 font-medium">
                    {parsedNote.title}
                  </div>
                </div>
                {parsedNote.author && (
                  <div className="text-xs text-gray-500">
                    浣滆€咃細{parsedNote.author}
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500">鍐呭棰勮</label>
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
                閫夋嫨鏀瑰啓椋庢牸
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
                {isRewriting ? '鉁?AI鏀瑰啓涓?..' : '馃殌 寮€濮嬫敼鍐?}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isRewriting && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 border-4 border-gray-100 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-800 font-medium">AI姝ｅ湪鏀瑰啓涓?..</p>
            <p className="text-gray-500 text-xs mt-1">棰勮10-15绉掑畬鎴?/p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="text-xl">馃帀</span> 鏀瑰啓瀹屾垚
              </h2>
              <button onClick={reset} className="text-sm text-green-600 hover:text-green-700 font-medium">
                鏀瑰啓鍏朵粬绗旇
              </button>
            </div>

            {/* New Titles */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">閫夋嫨鏂版爣棰?/label>
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
                      {selectedTitle === title && <span className="text-green-500">鉁?/span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Content */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">鏀瑰啓鍐呭</label>
                <span className="text-xs text-gray-400">{result.newContent.length} 瀛?/span>
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">鎺ㄨ崘鏍囩</label>
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
                馃搵 澶嶅埗鍏ㄩ儴
              </button>
              <PublishButton content={getFullContent()} publishData={getPublishPayload() || undefined} className="flex-1" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


