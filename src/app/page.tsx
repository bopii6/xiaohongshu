'use client';

import Link from 'next/link';

interface FeatureCard {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const features: FeatureCard[] = [
  {
    href: '/ai-rewrite',
    icon: '🔗',
    title: '对标图文',
    description: '一键生成全新标题文案',
    color: 'green',
    bgColor: 'bg-green-50'
  },
  {
    href: '/product-create',
    icon: '📦',
    title: '我有产品',
    description: '一张图生成爆款文案',
    color: 'blue',
    bgColor: 'bg-blue-50'
  },
  {
    href: '/trending-create',
    icon: '🔥',
    title: '爆款创作',
    description: '搜热门一键生成爆文',
    color: 'orange',
    bgColor: 'bg-orange-50'
  },
  {
    href: '/title-lab',
    icon: '🧪',
    title: '爆款标题',
    description: '5秒生成19个标题',
    color: 'yellow',
    bgColor: 'bg-yellow-50'
  },
  {
    href: '/content-lab',
    icon: '✍️',
    title: '爆款文案',
    description: '10秒生成500字文案',
    color: 'pink',
    bgColor: 'bg-pink-50'
  },
  {
    href: '/note-diagnosis',
    icon: '🩺',
    title: '笔记诊断',
    description: '对比同行给出优化方案',
    color: 'purple',
    bgColor: 'bg-purple-50'
  },
  {
    href: '/video-extract',
    icon: '🎬',
    title: '视频提取',
    description: '秒提视频字幕文案',
    color: 'indigo',
    bgColor: 'bg-indigo-50'
  },
  {
    href: '/sensitive-check',
    icon: '🛡️',
    title: '敏感词检测',
    description: '发布前检测违规词',
    color: 'red',
    bgColor: 'bg-red-50'
  },
  {
    href: '/competitor-analysis',
    icon: '📊',
    title: '分析同行',
    description: '深度分析同行策略',
    color: 'teal',
    bgColor: 'bg-teal-50'
  }
];

// Force dynamic rendering to bust Cloudflare cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5F5] via-white to-[#FFF0F5] font-sans">
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] pb-2">
        <div className="pt-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-[#FF2442]">RedNote AI</h1>
          <span className="text-xs text-white bg-gradient-to-r from-pink-500 to-red-500 px-3 py-1 rounded-full font-medium">创作助手</span>
        </div>
      </header>

      <main className="px-4 pb-6">
        {/* Hero - Compact */}
        <div className="text-center py-4">
          <h2 className="text-lg font-bold text-[#333]">今天想创作什么？</h2>
          <p className="text-[#999] text-xs mt-1">9大功能助你打造爆款内容</p>
        </div>

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-3">
          {features.map((card) => (
            <Link key={card.href} href={card.href} className="block group">
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100/50 transition-all active:scale-95 active:bg-gray-50 h-full flex flex-col items-center text-center">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center text-2xl mb-2 shadow-sm`}>
                  {card.icon}
                </div>
                {/* Title */}
                <h3 className="text-sm font-bold text-[#333] mb-1">{card.title}</h3>
                {/* Description */}
                <p className="text-[10px] text-[#999] leading-tight line-clamp-2">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-4 bg-gradient-to-r from-pink-50 to-orange-50 rounded-2xl p-4 border border-pink-100/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-medium text-gray-800">新手推荐</p>
              <p className="text-xs text-gray-500">试试「爆款文案」或「敏感词检测」开始创作</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
