'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24 font-sans text-[#333]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h1 className="text-xl font-bold tracking-tight text-[#FF2442]">RedNote</h1>
      </header>

      <main className="pt-24 px-6 max-w-md mx-auto">
        {/* Hero */}
        <div className="mb-10 animate-slide-up">
          <h2 className="text-2xl font-bold mb-2 text-[#333]">👋 欢迎回来</h2>
          <p className="text-[#999] text-sm">今天想创作什么内容？</p>
        </div>

        {/* Entry Cards */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Business Card */}
          <Link href="/create?type=business" className="block group">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all active:scale-95 active:bg-gray-50 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-red-50 rounded-full translate-x-10 -translate-y-10 opacity-50" />

              <div className="relative z-10 flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-3xl shadow-sm">
                  🛍️
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
              <h3 className="relative z-10 text-xl font-bold mb-2 text-[#333]">商家推广</h3>
              <p className="relative z-10 text-[#666] text-sm leading-relaxed">
                专为电商/实体店设计。一键生成种草文案、探店笔记，提升转化率。
              </p>
            </div>
          </Link>

          {/* IP Card */}
          <Link href="/create?type=ip" className="block group">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all active:scale-95 active:bg-gray-50 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-purple-50 rounded-full translate-x-10 -translate-y-10 opacity-50" />

              <div className="relative z-10 flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl shadow-sm">
                  ✨
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
              <h3 className="relative z-10 text-xl font-bold mb-2 text-[#333]">个人 IP</h3>
              <p className="relative z-10 text-[#666] text-sm leading-relaxed">
                打造个人品牌。辅助选题、润色文案，保持高质量持续输出。
              </p>
            </div>
          </Link>

          {/* Title Lab Card */}
          <Link href="/title-lab" className="block group">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all active:scale-95 active:bg-gray-50 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-orange-50 rounded-full translate-x-10 -translate-y-10 opacity-50" />

              <div className="relative z-10 flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl shadow-sm">
                  🧪
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
              <h3 className="relative z-10 text-xl font-bold mb-2 text-[#333]">爆款标题</h3>
              <p className="relative z-10 text-[#666] text-sm leading-relaxed">
                起标题太难？输入话题，一键生成悬念、干货、情绪等 4 类爆款标题。
              </p>
            </div>
          </Link>

          {/* Rewrite Card */}
          <Link href="/rewrite" className="block group">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all active:scale-95 active:bg-gray-50 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 rounded-full translate-x-10 -translate-y-10 opacity-50" />

              <div className="relative z-10 flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-3xl shadow-sm">
                  🔄
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-green-50 group-hover:text-green-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
              <h3 className="relative z-10 text-xl font-bold mb-2 text-[#333]">爆款&quot;洗稿&quot;/仿写</h3>
              <p className="relative z-10 text-[#666] text-sm leading-relaxed">
                跟着爆款发，流量差不了
              </p>
            </div>
          </Link>
        </div>
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] z-50">
        <div className="flex justify-around items-center h-16">
          <Link href="/" className="flex flex-col items-center space-y-1 text-[#333]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" /></svg>
            <span className="text-[10px] font-medium">首页</span>
          </Link>
          <Link href="/templates" className="flex flex-col items-center space-y-1 text-[#999]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            <span className="text-[10px] font-medium">模板</span>
          </Link>
          <Link href="/history" className="flex flex-col items-center space-y-1 text-[#999]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-medium">我的</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
