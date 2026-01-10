'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type StyleType = 'casual' | 'professional' | 'cute' | 'cool';

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  tags: string[];
  useCount: number;
  emoji: string;
  targetType: 'business' | 'ip';
  defaultStyle: StyleType;
}

const templates: Template[] = [
  {
    id: '1',
    title: '护肤种草模板',
    category: '美妆护肤',
    description: '适合分享护肤新品或爆款，重点突出肤感与功效细节。',
    content: `💧 [产品名称] | 惊艳到我的补水好物

姐妹们！这次一定要把这个[产品名称]安利给你们！用了[使用时长]之后，我的肌肤状态真的肉眼可见地变好。

🌟 亮点速览：
1. 主要功效：[功效描述]
2. 适合肤质：[肤质]
3. 使用感受：[质地/吸收情况]

🔍 我的真实体验：
- 第一次使用就感觉[体验]
- 坚持[使用频次]，皮肤出现了[改变]
- 和[其他产品]搭配简直绝了

📌 小贴士：建议在[场景]使用，效果更稳定。#护肤分享 #好物推荐 #[产品分类]`,
    tags: ['护肤', '种草', '好物分享'],
    useCount: 1234,
    emoji: '💄',
    targetType: 'business',
    defaultStyle: 'casual',
  },
  {
    id: '2',
    title: '穿搭模板',
    category: '服饰穿搭',
    description: '适合每日穿搭、风格示范或新品搭配分享，突出整体质感。',
    content: `👗 [穿搭主题] | 今日份出门穿搭分享

今天的穿搭关键词是「[风格关键词]」，整体颜色是[主色调]，超级显气质！

上衣：[品牌+款式] —— [亮点描述]
下装：[品牌+款式] —— [亮点描述]
鞋子：[品牌+款式] —— [实穿感受]
配饰：[配饰信息] —— [细节]

📝 穿搭心得：
1. 为什么这样搭：[原因]
2. 适合场景：[场景]
3. 适合人群：[身高/体型参考]

#OOTD #穿搭分享 #[风格标签]`,
    tags: ['穿搭', 'OOTD', '时尚'],
    useCount: 856,
    emoji: '👗',
    targetType: 'ip',
    defaultStyle: 'cute',
  },
  {
    id: '3',
    title: '数码测评模板',
    category: '数码科技',
    description: '适用于数码产品、智能设备的体验分享，强调功能与场景。',
    content: `📱 [产品名称] | 深度体验测评

从[购买渠道]入手这款产品已经[使用时长]，来和大家掏心掏肺聊聊它到底值不值得买。

✅ 优点：
1. [优点 1]
2. [优点 2]
3. [优点 3]

⚠️ 不足：
1. [不足 1]
2. [不足 2]

📌 适合人群：[人群]
🎯 推荐指数：⭐⭐⭐⭐☆

#数码测评 #[产品分类] #真实体验`,
    tags: ['数码', '测评', '科技'],
    useCount: 623,
    emoji: '📱',
    targetType: 'business',
    defaultStyle: 'professional',
  },
  {
    id: '4',
    title: '美食探店模板',
    category: '美食饮品',
    description: '记录探店过程、菜品亮点与氛围体验，适合分享城市美食。',
    content: `🍜 [店名] | 人均 [价格] 元的隐藏宝藏

这家店真的值得写一篇长文！先奉上关键信息：
📍 地址：[详细地址]
💰 人均：[价格]
🕒 营业时间：[时间]

✅ 必点菜：
1. [菜品 1] —— [味道描述]
2. [菜品 2] —— [味道描述]
3. [菜品 3] —— [味道描述]

氛围：[环境描述]
服务：[服务感受]
适合场景：[约会 / 聚餐 / 朋友局 等]

#美食探店 #[城市美食] #[菜系]`,
    tags: ['美食', '探店', '吃货'],
    useCount: 2156,
    emoji: '🍜',
    targetType: 'ip',
    defaultStyle: 'casual',
  },
  {
    id: '5',
    title: '学习方法模板',
    category: '学习成长',
    description: '分享学习技巧、效率工具或备考心得，逻辑清晰可复现。',
    content: `📚 [学习主题] | 我的高效学习法

关于[学习主题]，我总结了 3 个真正可执行的方法：

1. 方法一：[步骤 + 用时]
2. 方法二：[步骤 + 工具]
3. 方法三：[步骤 + 注意事项]

⭐️ 实际效果：
- 坚持 [时间] 后的变化
- 遇到的困难
- 如何复盘与调整

#学习方法 #自我提升 #[具体目标]`,
    tags: ['学习', '方法', '成长'],
    useCount: 1789,
    emoji: '📚',
    targetType: 'ip',
    defaultStyle: 'professional',
  },
  {
    id: '6',
    title: '健身打卡模板',
    category: '健身运动',
    description: '适合训练打卡、动作拆解、减脂增肌记录，强调变化和坚持。',
    content: `🏋️ [训练主题] | 今日打卡

今天的训练重点是「[训练部位/目标]」，整个流程如下：

热身：[内容]
主训练：
- 动作 1：[组数 x 次数]（要点提示）
- 动作 2：[组数 x 次数]
- 动作 3：[组数 x 次数]

放松拉伸：[内容]

🔥 训练感受：
- 体验：[描述]
- 心态：[状态]
- 数据：[热量 / 心率 / 体重变化]

#健身打卡 #动作分享 #[目标标签]`,
    tags: ['健身', '打卡', '塑形'],
    useCount: 1492,
    emoji: '💪',
    targetType: 'ip',
    defaultStyle: 'cool',
  },
];

const categories = ['全部', '美妆护肤', '服饰穿搭', '数码科技', '美食饮品', '学习成长', '健身运动'];

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === '全部' || template.category === selectedCategory;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      template.title.toLowerCase().includes(term) || template.description.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (template: Template) => {
    if (typeof window === 'undefined') return;
    const preset = {
      productName: template.title.replace(/模板$/, ''),
      productCategory: template.category,
      features: `${template.description}；灵感关键词：${template.tags.join('、')}`,
      targetAudience:
        template.targetType === 'business' ? '想快速种草的潜在用户' : '正在寻找灵感的粉丝',
      style: template.defaultStyle,
    };
    window.localStorage.setItem('draftFormData', JSON.stringify(preset));
    router.push(`/create?type=${template.targetType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-20 md:pb-0">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-pink-600">📋 内容模板库</h1>
            <div className="flex items-center gap-4">
              <Link href="/ai-rewrite" className="text-gray-700 hover:text-pink-600 text-sm">
                对标改写
              </Link>
              <Link href="/" className="text-gray-700 hover:text-pink-600">
                ← 返回首页
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <input
                type="text"
                placeholder="搜索模板..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full transition-colors ${selectedCategory === category
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{template.emoji}</span>
                <span className="text-sm text-gray-500">{template.useCount} 次使用</span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{template.title}</h3>

              <div className="mb-3">
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {template.category}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4">{template.description}</p>

              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-500">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="text-2xl mr-2">{selectedTemplate.emoji}</span>
                  {selectedTemplate.title}
                </h2>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                  {selectedTemplate.category}
                </span>
              </div>

              <p className="text-gray-600 mb-6">{selectedTemplate.description}</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">模板内容</h3>
                <pre className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTemplate.content}</pre>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    handleUseTemplate(selectedTemplate);
                  }}
                  className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
                >
                  ⚡ 一键带入生成
                </button>
                <button
                  onClick={() => {
                    const text = `模板：${selectedTemplate.title}\n\n${selectedTemplate.content}`;
                    navigator.clipboard.writeText(text);
                    alert('模板内容已复制！');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  📤 复制模板
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-2xl">🏠</span>
            <span className="text-xs">首页</span>
          </Link>
          <Link href="/templates" className="flex flex-col items-center p-2 text-pink-600">
            <span className="text-2xl">📋</span>
            <span className="text-xs">模板</span>
          </Link>
          <Link href="/history" className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-2xl">📝</span>
            <span className="text-xs">历史</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
