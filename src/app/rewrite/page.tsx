'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type RewriteStyle = 'similar' | 'creative' | 'professional' | 'casual';

interface RewriteResult {
  originalTitle: string;
  newTitles: string[];
  originalContent: string;
  newContent: string;
  keyPoints: string[];
  model: string;
}

type RewriteStreamPayload =
  | { type: 'content'; data: string }
  | { type: 'result'; data: RewriteResult }
  | { type: 'error'; data: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '未知错误';
}

export default function RewritePage() {
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [rewriteStyle, setRewriteStyle] = useState<RewriteStyle>('similar');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [isContentParsed, setIsContentParsed] = useState(false);
  const [, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState('glm-4.5-flash');
  const [streamingContent, setStreamingContent] = useState('');

  const livePreview = !result ? streamingContent : '';
  const displayContent = result?.newContent || '';
  const displayTitles = result?.newTitles || [];
  const showResultPanel = Boolean(result);

  const styleOptions = [
    { value: 'similar', label: '相似风格', description: '保持原文风格，优化表达' },
    { value: 'creative', label: '创意改写', description: '增加创意元素，提升吸引力' },
    { value: 'professional', label: '专业版', description: '突出专业性和权威性' },
    { value: 'casual', label: '口语化', description: '更加亲切自然，接地气' }
  ];

  const modelOptions = [
    {
      value: 'glm-4-flash',
      label: '清华智谱 GLM-4 Flash',
      description: '免费极速版，适合快写'
    },
    {
      value: 'glm-4.5-flash',
      label: '清华智谱 GLM-4.5 Flash',
      description: '免费稳定版，结构更好'
    }
  ];

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('请上传 JPEG、PNG 或 WebP 格式的图片');
      return;
    }

    // 验证文件大小 (10MB限制)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('图片文件过大，请上传小于10MB的图片');
      return;
    }

    setUploadedImage(file);
    setIsOcrProcessing(true);
    setIsContentParsed(false);

    // 创建图片预览
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const preview = event.target?.result;
      if (typeof preview === 'string') {
        setImagePreview(preview);
      }
    };
    reader.readAsDataURL(file);

    // 上传图片进行OCR识别
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/ocr-upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'OCR识别失败');
      }

      const extractedText = data.data.text;

      // 尝试分割标题和内容
      const lines = extractedText.split('\n').filter((line: string) => line.trim());
      let title = '';
      let content = extractedText;

      if (lines.length > 1) {
        // 第一行作为标题，其余作为内容
        title = lines[0].trim();
        content = lines.slice(1).join('\n').trim();
      } else if (lines.length === 1) {
        // 只有一行，作为标题，内容为空
        title = lines[0].trim();
        content = '';
      }

      setOriginalTitle(title);
      setOriginalContent(content);
      setIsContentParsed(true);

    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('OCR识别失败:', error);
      alert(message || 'OCR识别失败，请重试');
      setImagePreview('');
      setUploadedImage(null);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setImagePreview('');
    setIsContentParsed(false);
    setOriginalTitle('');
    setOriginalContent('');
  };

  const analyzeAndRewrite = async () => {
    if (!originalTitle.trim() || !originalContent.trim()) {
      alert('请填写原标题和正文内容');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setStreamingContent('');

    try {
      const response = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalTitle,
          originalContent,
          style: rewriteStyle,
          model: selectedModel
        })
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || '改写失败');
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
          const payload = JSON.parse(line) as RewriteStreamPayload;
          if (payload.type === 'content') {
            setStreamingContent(prev => prev + payload.data);
          } else if (payload.type === 'result') {
            setResult(payload.data);
            setSelectedTitle(payload.data.newTitles[0] || '');
            setStreamingContent('');
          } else if (payload.type === 'error') {
            throw new Error(payload.data);
          }
        }
      }

      if (buffer.trim()) {
        const payload = JSON.parse(buffer) as RewriteStreamPayload;
        if (payload.type === 'result') {
          setResult(payload.data);
          setSelectedTitle(payload.data.newTitles[0] || '');
          setStreamingContent('');
        } else if (payload.type === 'error') {
          throw new Error(payload.data);
        }
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('改写失败:', error);
      alert(message || '改写失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async (content: string, showSuccessAlert = true) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for insecure contexts (e.g. HTTP on local network)
        const textArea = document.createElement("textarea");
        textArea.value = content;

        // Ensure textarea is not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          alert('复制失败，请手动复制');
          document.body.removeChild(textArea);
          return false;
        }

        document.body.removeChild(textArea);
      }

      if (showSuccessAlert) {
        alert('内容已复制到剪贴板！');
      }
      return true;
    } catch (err) {
      console.error('Async: Could not copy text: ', err);
      alert('复制失败，请手动复制');
      return false;
    }
  };

  const getCompleteContent = () => {
    if (!result) return '';
    const title = selectedTitle || result.newTitles?.[0] || originalTitle || '';
    const keyPoints = result.keyPoints || [];
    return `${title}\n\n${result.newContent}\n\n${keyPoints.map(point => `#${point}`).join(' ')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Link href="/" className="text-pink-600 mr-4 hover:underline">
              ← 返回
            </Link>
            <h1 className="text-xl font-bold text-gray-900">
              🔄 爆款&quot;洗稿&quot;/仿写
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左侧：输入原始内容 */}
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">📸 小红书笔记内容提取</h2>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">使用说明：</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 截图小红书笔记页面或保存图片</li>
                  <li>• 上传图片进行OCR文字识别</li>
                  <li>• 自动提取标题和正文内容</li>
                  <li>• AI智能改写优化文案</li>
                </ul>
              </div>

              {/* 图片上传区域 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传小红书笔记图片 *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  {!imagePreview ? (
                    <div>
                      <div className="text-4xl mb-4">📷</div>
                      <p className="text-gray-600 mb-2">点击上传或拖拽图片到此处</p>
                      <p className="text-xs text-gray-500">支持 JPG、PNG、WebP 格式，最大 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isOcrProcessing}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Image
                        src={imagePreview}
                        alt="预览图片"
                        width={512}
                        height={512}
                        unoptimized
                        className="mx-auto max-h-64 rounded-lg shadow-sm object-contain"
                      />
                      <button
                        onClick={clearImage}
                        disabled={isOcrProcessing}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                      >
                        ×
                      </button>
                      {isOcrProcessing && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                          <div className="text-center">
                            <div className="text-2xl mb-2">🔄</div>
                            <p className="text-sm text-gray-600">正在识别文字...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!imagePreview && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={isOcrProcessing}
                    />
                  )}
                  {!imagePreview && (
                    <label
                      htmlFor="image-upload"
                      className={`inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors ${isOcrProcessing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      选择图片
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modelOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedModel(option.value)}
                    className={`text-left border rounded-lg p-3 transition-colors ${selectedModel === option.value ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-200'
                      }`}
                  >
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>

              {isContentParsed && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm">
                    ✅ 笔记内容提取成功！请在下方确认或修改内容后开始改写
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  改写风格
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRewriteStyle(option.value as RewriteStyle)}
                      className={`p-3 rounded-lg border text-left transition-colors ${rewriteStyle === option.value
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {isContentParsed && (
                <button
                  onClick={analyzeAndRewrite}
                  disabled={isAnalyzing || !originalTitle.trim() || !originalContent.trim()}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? '🔄 正在分析改写...' : '🚀 开始改写'}
                </button>
              )}

              {isAnalyzing && (
                <div className="mt-3 flex items-center text-pink-600 text-sm">
                  <span className="text-2xl animate-bounce origin-bottom">✍️</span>
                  <span className="ml-2">AI 正在写作（预计 10~15 秒完成），请稍候…</span>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：改写结果 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">改写结果</h2>

            {isAnalyzing && livePreview && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">实时生成中…</span>
                  <span className="text-xs text-gray-400">模型输出将实时显示</span>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg whitespace-pre-wrap">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {livePreview}
                  </pre>
                </div>
              </div>
            )}

            {showResultPanel ? (
              <div className="space-y-6">
                {/* 新标题选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新标题（点击选择）
                  </label>
                  <div className="space-y-2">
                    {displayTitles.map((title, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedTitle(title)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedTitle === title
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{title}</span>
                          {selectedTitle === title && (
                            <span className="text-pink-600">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 新内容 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    改写内容
                  </label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {displayContent}
                    </pre>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => copyToClipboard(getCompleteContent())}
                    disabled={!result}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📋 复制完整内容
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedTitle)}
                    disabled={!result}
                    className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📝 仅复制标题
                  </button>
                  <button
                    onClick={async () => {
                      const content = getCompleteContent();
                      if (content) {
                        const success = await copyToClipboard(content, false);
                        if (success) {
                          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          if (isMobile) {
                            window.location.href = 'xhsdiscover://post';
                          } else {
                            window.open('https://creator.xiaohongshu.com/publish/publish', '_blank');
                          }
                        }
                      }
                    }}
                    disabled={!result}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🚀 去发布
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">{isAnalyzing ? '✍️' : '🔗'}</div>
                <p className="text-gray-500">
                  {isAnalyzing
                    ? '模型正在生成内容，请稍等片刻…'
                    : '粘贴小红书笔记链接并解析内容后，即可获得改写版本'}
                </p>
                {!isAnalyzing && !isContentParsed && (
                  <div className="mt-4 text-sm text-gray-400">
                    <p>💡 提示：请在左侧输入小红书笔记链接开始使用</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
