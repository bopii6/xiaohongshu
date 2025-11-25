// 小红书专用提示词模板
import { RewriteType, XiaohongshuStyle } from './config';

// 小红书内容改写提示词
export const XIAOHONGSHU_PROMPTS = {
  // 系统基础提示词
  SYSTEM: `你是一位专业的小红书内容创作专家，擅长创作符合小红书平台特色的高质量文案。你的任务是根据用户需求，对内容进行专业化改写。

要求：
1. 保持小红书平台特色：亲切、真实、有趣
2. 合理使用emoji表情符号，增加亲和力
3. 语言要接地气，有生活气息
4. 结构清晰，层次分明
5. 适当加入网络流行语，提升传播度
6. 确保内容积极正面，有价值输出`,

  // 内容润色
  POLISH: (originalContent: string) => `请对以下小红书文案进行润色优化，保持原意的同时让表达更加生动有趣：

原文内容：
${originalContent}

请提供：
1. 润色后的完整文案
2. 3-5个吸引人的标题建议
3. 相关的话题标签
4. 优化建议`,

  // 内容扩写
  EXPAND: (originalContent: string) => `请将以下小红书文案进行扩写丰富，增加更多细节和个人体验：

原文内容：
${originalContent}

扩写要求：
1. 增加更多使用细节和个人感受
2. 补充产品特点和使用场景
3. 加入对比体验或推荐理由
4. 保持小红书风格，自然有趣
5. 控制在300-500字之间

请提供：
1. 扩写后的完整文案
2. 3-5个爆款标题建议
3. 相关话题标签
4. 内容亮点总结`,

  // 内容精简
  SHORTEN: (originalContent: string) => `请将以下小红书文案进行精简，保留核心信息，删除冗余内容：

原文内容：
${originalContent}

精简要求：
1. 保留最重要的信息点
2. 删除重复和不必要的描述
3. 确保语言简洁有力
4. 控制在100-200字之间
5. 保持小红书风格

请提供：
1. 精简后的文案
2. 3个精炼标题
3. 核心要点标签`,

  // 风格转换
  STYLE: (originalContent: string, style: XiaohongshuStyle) => {
    const styleDescriptions = {
      'zhongcao': '种草文案 - 突出产品卖点，激发购买欲望',
      'ganhuo': '干货分享 - 突出实用性和专业性',
      'shenghuo': '生活记录 - 突出真实感和生活气息',
      'pingce': '测评体验 - 突出客观性和使用感受',
      'jujia': '家居好物 - 突出实用性和设计感',
      'meizhuang': '美妆护肤 - 突出效果和肤感',
      'fushi': '服装穿搭 - 突出搭配和效果',
      'meishi': '美食探店 - 突出口味和环境'
    };

    return `请将以下小红书文案转换为${styleDescriptions[style]}风格：

原文内容：
${originalContent}

风格要求：
${styleDescriptions[style]}

请提供：
1. 改写后的文案
2. 3-5个符合风格的标题
3. 相关话题标签
4. 风格特色说明`;
  },

  // SEO优化
  SEO: (originalContent: string) => `请对以下小红书文案进行SEO优化，提升搜索排名：

原文内容：
${originalContent}

优化要求：
1. 合理植入热门关键词
2. 优化标题和开头部分
3. 增加相关话题标签
4. 提升内容可搜索性
5. 保持内容质量

请提供：
1. SEO优化后的文案
2. 3-5个搜索友好标题
3. 优化的话题标签（包含热门标签）
4. SEO优化建议`,

  // 情感增强
  EMOTION: (originalContent: string) => `请对以下小红书文案进行情感增强，提升感染力和共鸣感：

原文内容：
${originalContent}

情感增强要求：
1. 增加情感共鸣点
2. 加入个人真实感受
3. 使用更有温度的表达
4. 提升内容的感染力
5. 增强读者互动性

请提供：
1. 情感增强后的文案
2. 3-5个情感化标题
3. 互动性话题标签
4. 情感亮点总结`
};

// 综合改写提示词（结合多种需求）
export function getRewritePrompt(
  content: string,
  type: RewriteType,
  style?: XiaohongshuStyle
): string {
  const typePrompts = {
    'polish': XIAOHONGSHU_PROMPTS.POLISH(content),
    'expand': XIAOHONGSHU_PROMPTS.EXPAND(content),
    'shorten': XIAOHONGSHU_PROMPTS.SHORTEN(content),
    'style': style ? XIAOHONGSHU_PROMPTS.STYLE(content, style) : XIAOHONGSHU_PROMPTS.POLISH(content),
    'seo': XIAOHONGSHU_PROMPTS.SEO(content),
    'emotion': XIAOHONGSHU_PROMPTS.EMOTION(content)
  };

  return `${XIAOHONGSHU_PROMPTS.SYSTEM}\n\n${typePrompts[type]}`;
}

// 标题生成专用提示词
export function getTitlePrompt(content: string): string {
  return `${XIAOHONGSHU_PROMPTS.SYSTEM}

请为以下小红书内容生成5个吸引人的标题：

内容：
${content}

标题要求：
1. 长度控制在15-25字
2. 包含emoji表情
3. 有吸引力，激发点击欲望
4. 符合小红书标题风格
5. 包含关键词

请直接返回5个标题，每行一个。`;
}

// 标签生成专用提示词
export function getTagsPrompt(content: string): string {
  return `${XIAOHONGSHU_PROMPTS.SYSTEM}

请为以下小红书内容生成5-8个相关话题标签：

内容：
${content}

标签要求：
1. 包含核心关键词
2. 结合热点话题
3. 标签长度适中
4. 提高曝光度
5. 符合内容调性

请直接返回标签列表，用空格分隔。`;
}

// 内容建议生成提示词
export function getSuggestionsPrompt(content: string): string {
  return `${XIAOHONGSHU_PROMPTS.SYSTEM}

请为以下小红书内容提供3-5条优化建议：

内容：
${content}

建议要求：
1. 针对内容质量的改进建议
2. 小红书平台优化建议
3. 用户互动提升建议
4. 排版和格式优化建议
5. 传播度提升建议

请用简洁明了的语言提供具体建议。`;
}