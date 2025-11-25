import { NextRequest, NextResponse } from 'next/server';

interface RewritePayload {
  originalTitle: string;
  originalContent: string;
  productInfo: string;
  targetAudience: string;
  style: 'similar' | 'creative' | 'professional' | 'casual';
}

const rewriteStyles = {
  similar: {
    titlePatterns: [
      (title: string) => `✨ ${title} | 真实体验分享`,
      (title: string) => `🔥 ${title} ，这款真的绝了！`,
      (title: string) => `💕 ${title} | 让我惊艳的好物`,
      (title: string) => `🌟 ${title} 开箱！超预期`,
    ],
    contentTone: '保持原风格，优化表达',
    keywords: ['真实体验', '使用感受', '真心推荐', '无限回购']
  },
  creative: {
    titlePatterns: [
      (title: string) => `💫 ${title} | 打破常规的惊喜体验`,
      (title: string) => `🎨 ${title} ，重新定义品质生活`,
      (title: string) => `🦄 ${title} | 独家揭秘，内行才知道`,
      (title: string) => `🚀 ${title} ，突破想象的完美`,
    ],
    contentTone: '创意十足，吸引眼球',
    keywords: ['黑科技', '独家', '颠覆认知', '意想不到']
  },
  professional: {
    titlePatterns: [
      (title: string) => `📊 ${title} | 专业评测与深度分析`,
      (title: string) => `🎯 ${title} ，专业选择指南`,
      (title: string) => `📈 ${title} | 数据说话的真实反馈`,
      (title: string) => `🔍 ${title} ，专业角度深度解析`,
    ],
    contentTone: '专业权威，理性分析',
    keywords: ['专业测评', '数据分析', '权威推荐', '专家建议']
  },
  casual: {
    titlePatterns: [
      (title: string) => `🥰 ${title} | 姐妹们必须知道！`,
      (title: string) => `🛍️ ${title} ，买它买它买它！`,
      (title: string) => `💖 ${title} | 真的太好用了叭`,
      (title: string) => `🎉 ${title} ，快乐源泉get！`,
    ],
    contentTone: '轻松有趣，接地气',
    keywords: ['姐妹们', '真的', '超赞', '绝绝子']
  }
};

function extractKeywords(content: string): string[] {
  const patterns = [
    /#(\w+)/g,
    /【([^】]+)】/g,
    /（([^）]+)）/g,
    /\[([^\]]+)\]/g
  ];

  const keywords = new Set<string>();
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const keyword = match.replace(/[#[\]（）【】]/g, '');
        if (keyword.length > 1 && keyword.length < 10) {
          keywords.add(keyword);
        }
      });
    }
  });

  return Array.from(keywords);
}

function generateRewriteTitles(originalTitle: string, style: keyof typeof rewriteStyles): string[] {
  const patterns = rewriteStyles[style].titlePatterns;
  return patterns.map(pattern => pattern(originalTitle));
}

function rewriteContent(
  originalContent: string,
  productInfo: string,
  targetAudience: string,
  style: keyof typeof rewriteStyles
): {
  content: string;
  keyPoints: string[];
  suggestions: string[];
} {
  const styleConfig = rewriteStyles[style];
  const keywords = extractKeywords(originalContent);

  // 段落改写逻辑
  const sentences = originalContent.split(/[\n。！？]/).filter(s => s.trim().length > 0);
  const rewrittenSentences = sentences.map(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) return '';

    // 根据风格调整语气
    switch (style) {
      case 'creative':
        return `✨ ${trimmed}，这种体验真的很特别！`;
      case 'professional':
        return `📋 经过分析，${trimmed}。`;
      case 'casual':
        return `🥰 ${trimmed}，姐妹们你们懂的吧！`;
      default:
        return `💖 ${trimmed}`;
    }
  });

  // 构建新内容
  let newContent = `🌟 经过深度分析，我为大家整理了这份超实用的内容！\n\n`;

  if (targetAudience) {
    newContent += `🎯 特别适合${targetAudience}的朋友们\n\n`;
  }

  newContent += rewrittenSentences.join('\n\n') + '\n\n';

  if (productInfo) {
    newContent += `💎 产品亮点：${productInfo}\n\n`;
  }

  newContent += `🔥 ${styleConfig.keywords.join(' · ')}\n\n`;
  newContent += `✨ 记得点赞收藏，我会持续分享更多干货！`;

  // 生成关键要点
  const keyPoints = [
    ...keywords.slice(0, 3),
    ...styleConfig.keywords.slice(0, 2),
    targetAudience ? targetAudience.replace(/\s/g, '') : '好物推荐'
  ].filter((point, index, arr) => arr.indexOf(point) === index);

  // 生成优化建议
  const suggestions = [
    '标题更加吸引人，使用emoji增加视觉冲击',
    '内容结构更清晰，分段落展示',
    '增加了与读者互动的元素',
    '加入了更多情感化表达',
    '优化了标签选择，提升搜索曝光',
    '内容更有针对性，符合目标受众需求'
  ];

  return {
    content: newContent,
    keyPoints: keyPoints.slice(0, 6),
    suggestions: suggestions.slice(0, 4)
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: RewritePayload = await request.json();
    const { originalTitle, originalContent, productInfo, targetAudience, style } = payload;

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 生成改写结果
    const newTitles = generateRewriteTitles(originalTitle, style);
    const { content: newContent, keyPoints, suggestions } = rewriteContent(
      originalContent,
      productInfo,
      targetAudience,
      style
    );

    const result = {
      originalTitle,
      newTitles,
      originalContent,
      newContent,
      keyPoints,
      suggestions
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Rewrite error:', error);
    return NextResponse.json(
      { success: false, error: '改写失败，请重试' },
      { status: 500 }
    );
  }
}