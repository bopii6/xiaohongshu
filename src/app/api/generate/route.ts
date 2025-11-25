import { NextRequest, NextResponse } from 'next/server';

interface GeneratePayload {
  userType: 'business' | 'ip';
  productName: string;
  productCategory: string;
  features: string;
  targetAudience: string;
  style: 'casual' | 'professional' | 'cute' | 'cool';
}

const styleConfig = {
  casual: {
    greeting: '姐妹们',
    vibe: '轻松分享',
    highlight: '体验感真的超出预期',
    closing: '冲就完了',
    emojis: ['🥰', '✨', '🛒'],
  },
  professional: {
    greeting: '朋友们',
    vibe: '理性分析',
    highlight: '指标表现都能量化说明',
    closing: '值得纳入你的清单',
    emojis: ['📊', '🎯', '📈'],
  },
  cute: {
    greeting: '小仙女们',
    vibe: '软萌细腻',
    highlight: '每一个细节都好贴心',
    closing: '快来和我一起心动',
    emojis: ['💕', '🌸', '🎀'],
  },
  cool: {
    greeting: '伙计们',
    vibe: '酷炫有范',
    highlight: '气场直接拉满',
    closing: '这波必须安排',
    emojis: ['🔥', '⚡', '🚀'],
  },
} as const;

const typeTemplates = {
  business: [
    (name: string) => `🔥 ${name} | 亲测好用，闭眼入！`,
    (name: string) => `🌸 ${name} 真实体验：优点远超预期`,
    (name: string, category: string) => `💡 ${category || '好物'}必备：${name}`,
    (name: string) => `🛍️ ${name} 到底值不值得买？我的答案是：冲`,
  ],
  ip: [
    (name: string) => `✨ ${name} | 亲身实践后的心得分享`,
    (name: string, category: string) => `🎯 ${name} 帮我打开了${category || '一个全新领域'}`,
    (name: string) => `📒 ${name} 长期使用感受：值得收藏`,
    (name: string) => `🌈 用 ${name} 优化生活的几个小技巧`,
  ],
};

function pickTitle(payload: GeneratePayload) {
  const options = typeTemplates[payload.userType] || typeTemplates.business;
  const factory = options[Math.floor(Math.random() * options.length)];
  return factory(payload.productName || '这款产品', payload.productCategory);
}

function buildIntro(payload: GeneratePayload) {
  const { productName, productCategory, userType, style } = payload;
  const config = styleConfig[style] || styleConfig.casual;
  const category = productCategory || '这个品类';

  if (userType === 'business') {
    return `${config.greeting}，今天来聊聊大家最近疯狂安利的「${productName}」，我把它当成${category}赛道的关键单品来拆解，以下是真实上手后的第一印象${config.emojis[0]}`;
  }

  return `${config.greeting}，最近我一直在琢磨「${productName}」能不能帮我把内容做得更有质感，这里是我以创作者角度整理的体验感受${config.emojis[0]}`;
}

function extractFeatureList(features: string) {
  const list = features
    .split(/[\n,，。；;、]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (list.length) {
    return list;
  }

  return [
    '质感在线，拿到手就能感受到诚意',
    '实用度很高，马上就能融入日常',
    '细节经得起推敲，越用越顺手',
  ];
}

function buildHighlights(payload: GeneratePayload) {
  const { userType, productCategory, targetAudience } = payload;
  const baseList = extractFeatureList(payload.features || '');

  const extras =
    userType === 'business'
      ? [`${productCategory || '该类别'}常被问到的问题都能一句话答复`, targetAudience ? `特别适合${targetAudience}` : '适配大部分主流消费人群']
      : [`灵感来源于我与粉丝的互动，能直接回答大家最关心的问题`, targetAudience ? `${targetAudience}真心值得尝试` : '对同频的伙伴很友好'];

  return [...baseList, ...extras.slice(0, 2)];
}

function buildClosing(payload: GeneratePayload) {
  const { productName, productCategory, style, userType } = payload;
  const config = styleConfig[style] || styleConfig.casual;
  const category = productCategory || '这个主题';

  if (userType === 'business') {
    return `总结一下：想解释清楚“为什么值得买”，就把卖点聚焦到上面几条。这款${productName}真的帮我省了很多口舌，下一波内容就准备把它放在核心位置，${config.closing}${config.emojis[2]}`;
  }

  return `它像是给生活补了一个洞，让${category}逻辑更顺。我会继续围绕${productName}输出实战经验，也欢迎留言告诉我你们的使用感受，${config.closing}${config.emojis[2]}`;
}

function buildTags(payload: GeneratePayload) {
  const base = ['#好物推荐', '#小红书爆款', '#真实测评'];
  const categoryTag = payload.productCategory ? `#${payload.productCategory}` : undefined;
  const audienceTag = payload.targetAudience
    ? `#${payload.targetAudience.replace(/[\s,，。?？!！~、]/g, '')}`
    : undefined;

  const styleTags: Record<GeneratePayload['style'], string[]> = {
    casual: ['#日常分享', '#姐妹都在用'],
    professional: ['#专业拆解', '#效率提升'],
    cute: ['#甜妹风', '#可可爱爱'],
    cool: ['#酷飒必备', '#潮流种草'],
  };

  const typeTags =
    payload.userType === 'business'
      ? ['#产品卖点', '#电商好物']
      : ['#IP打造', '#内容灵感'];

  const tags = new Set([
    ...base,
    ...(categoryTag ? [categoryTag] : []),
    ...(audienceTag ? [audienceTag] : []),
    ...styleTags[payload.style || 'casual'],
    ...typeTags,
  ]);

  return Array.from(tags);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as GeneratePayload;

    await new Promise((resolve) => setTimeout(resolve, 800));

    const generatedContent = {
      title: pickTitle(payload),
      intro: buildIntro(payload),
      highlights: buildHighlights(payload),
      closing: buildClosing(payload),
      tags: buildTags(payload),
    };

    return NextResponse.json({ success: true, data: generatedContent });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { success: false, error: '生成失败，请重试' },
      { status: 500 }
    );
  }
}
