/* eslint-disable @next/next/no-img-element */
﻿'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HistoryItem {
  id: string;
  type: 'business' | 'ip';
  formData: {
    productName: string;
    productCategory: string;
    features: string;
    targetAudience: string;
    style: 'casual' | 'professional' | 'cute' | 'cool';
  };
  content: {
    title: string;
    intro: string;
    highlights: string[];
    closing: string;
    tags: string[];
  };
  media: string[];
  createdAt: string;
}

const styleLabelMap = {
  casual: '轻松日常',
  professional: '专业权威',
  cute: '可爱甜美',
  cool: '潮流酷炫',
} as const;

const composeContent = (item: HistoryItem) => {
  const highlightText = item.content.highlights
    .filter((value) => value.trim().length > 0)
    .map((value, idx) => `${idx + 1}. ${value.trim()}`)
    .join('\n');

  return `${item.content.title}\n\n${item.content.intro}\n\n${highlightText}\n\n${item.content.closing}\n\n${item.content.tags.join(' ')}`;
};

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'business' | 'ip'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/history');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '加载失败');
      }
      setHistoryItems(result.data);
    } catch (err) {
      console.error('加载历史失败', err);
      setError('加载历史记录失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = historyItems.filter((item) => filterType === 'all' || item.type === filterType);

  const deleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '删除失败');
      }
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('删除失败', err);
      alert('删除失败，请稍后再试。');
    }
  };

  const clearAllHistory = async () => {
    if (!confirm('确定要清空所有历史记录吗？')) return;
    try {
      const response = await fetch('/api/history', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '清空失败');
      }
      setHistoryItems([]);
      setSelectedItem(null);
    } catch (err) {
      console.error('清空失败', err);
      alert('清空失败，请稍后再试。');
    }
  };

  const copyToClipboard = async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(composeContent(item));
      alert('内容已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动选择文本。');
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-20 md:pb-0">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-pink-600">📝 历史记录</h1>
            <div className="flex items-center gap-4">
              <Link href="/rewrite" className="text-gray-700 hover:text-pink-600 text-sm">
                对标改写
              </Link>
              {historyItems.length > 0 && (
                <button onClick={clearAllHistory} className="text-red-600 hover:text-red-700 text-sm">
                  清空全部
                </button>
              )}
              <Link href="/" className="text-gray-700 hover:text-pink-600">
                ← 返回首页
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-full transition-colors ${
                filterType === 'all' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部 ({historyItems.length})
            </button>
            <button
              onClick={() => setFilterType('business')}
              className={`px-4 py-2 rounded-full transition-colors ${
                filterType === 'business' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🛍️ 卖货商家 ({historyItems.filter((item) => item.type === 'business').length})
            </button>
            <button
              onClick={() => setFilterType('ip')}
              className={`px-4 py-2 rounded-full transition-colors ${
                filterType === 'ip' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✨ 个人 IP ({historyItems.filter((item) => item.type === 'ip').length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">正在加载历史记录...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchHistory}
              className="bg-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🗒️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">暂无符合条件的历史记录</h3>
            <p className="text-gray-600 mb-6">去创建页面生成内容后，就能在这里查看啦。</p>
            <Link
              href="/create"
              className="inline-block bg-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
            >
              去生成内容
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.type === 'business' ? '🛍️' : '✨'}</span>
                    <span className="text-sm text-gray-500">{item.type === 'business' ? '卖货商家' : '个人 IP'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(item)} className="text-blue-600 hover:text-blue-700" title="复制内容">
                      复制
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:text-red-700" title="删除">
                      删除
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{item.content.title}</h3>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>主题：</strong>
                    {item.formData.productName || '未填写'}
                  </p>
                  {item.formData.productCategory && (
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>分类：</strong>
                      {item.formData.productCategory}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-line">
                    {[item.content.intro, item.content.highlights[0], item.content.closing].filter(Boolean).join('\n\n')}
                  </p>
                </div>

                {item.media.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {item.media.slice(0, 3).map((media, index) => (
                      <img key={index} src={media} alt={`media-${index}`} className="w-16 h-16 object-cover rounded-lg border" />
                    ))}
                    {item.media.length > 3 && (
                      <span className="text-xs text-gray-500 self-center">+{item.media.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mb-4">
                  {item.content.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-purple-600">
                      {tag}
                    </span>
                  ))}
                  {item.content.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{item.content.tags.length - 3}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                  <button onClick={() => setSelectedItem(item)} className="text-pink-600 hover:text-pink-700 text-sm font-medium">
                    查看详情 →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="text-2xl mr-2">{selectedItem.type === 'business' ? '🛍️' : '✨'}</span>
                {selectedItem.content.title}
              </h2>
              <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">基本信息</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <strong>主题：</strong>
                  {selectedItem.formData.productName || '未填写'}
                </div>
                {selectedItem.formData.productCategory && (
                  <div>
                    <strong>分类：</strong>
                    {selectedItem.formData.productCategory}
                  </div>
                )}
                {selectedItem.formData.targetAudience && (
                  <div>
                    <strong>目标受众：</strong>
                    {selectedItem.formData.targetAudience}
                  </div>
                )}
                <div>
                  <strong>内容风格：</strong>
                  {styleLabelMap[selectedItem.formData.style]}
                </div>
              </div>
            </div>

            {selectedItem.media.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">素材预览</h3>
                <div className="grid grid-cols-3 gap-3">
                  {selectedItem.media.map((media, index) => (
                    <img key={index} src={media} alt={`media-${index}`} className="w-full h-32 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-pink-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">开场引子</h3>
              <p className="text-gray-900 whitespace-pre-line mb-4">{selectedItem.content.intro}</p>

              <h3 className="text-sm font-medium text-gray-700 mb-3">亮点拆解</h3>
              <ul className="list-decimal list-inside text-gray-900 space-y-1 mb-4">
                {selectedItem.content.highlights.map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>

              <h3 className="text-sm font-medium text-gray-700 mb-3">结尾号召</h3>
              <p className="text-gray-900 whitespace-pre-line mb-4">{selectedItem.content.closing}</p>

              <h3 className="text-sm font-medium text-gray-700 mb-3">标签</h3>
              <div className="flex flex-wrap gap-2">
                {selectedItem.content.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => copyToClipboard(selectedItem)}
                className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
              >
                📋 复制完整内容
              </button>
              <button
                onClick={() => deleteItem(selectedItem.id)}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                删除记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
