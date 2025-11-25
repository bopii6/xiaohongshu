import { NextRequest, NextResponse } from 'next/server';

interface FetchContentResult {
  success: boolean;
  content?: string;
  method?: string;
  error?: string;
}

interface ParsedNoteStats {
  likes: number;
  comments: number;
  shares: number;
}

interface ParsedNoteData {
  title: string;
  content: string;
  author: string;
  tags: string[];
  images: string[];
  stats: ParsedNoteStats;
  extractionMethod?: string;
  debugInfo?: string;
  requiresLogin?: boolean;
  needsManualInput?: boolean;
  hasTitle?: boolean;
  noContent?: boolean;
  contentFound?: boolean;
  parseError?: boolean;
}

type ParseResult =
  | { success: true; data: ParsedNoteData }
  | { success: false; error: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

// 从混合文本中提取小红书链接
function extractXiaohongshuUrl(input: string): string | null {
  // 匹配小红书链接的正则表达式
  const urlPatterns = [
    /https?:\/\/www\.xiaohongshu\.com\/explore\/[a-f0-9]+/i,
    /https?:\/\/www\.xiaohongshu\.com\/discovery\/item\/[a-f0-9]+/i,
    /https?:\/\/xhslink\.com\/[a-zA-Z0-9\/]+/i,
    /www\.xiaohongshu\.com\/explore\/[a-f0-9]+/i,
    /www\.xiaohongshu\.com\/discovery\/item\/[a-f0-9]+/i,
    /xhslink\.com\/[a-zA-Z0-9\/]+/i
  ];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) {
      let url = match[0];
      // 如果没有协议前缀，添加 https://
      if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
      }
      return url;
    }
  }

  return null;
}

// 多种高级User-Agent池
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
];

// 随机获取User-Agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 方法1: 使用Jina AI代理（最稳定）
async function tryJinaAI(url: string): Promise<FetchContentResult> {
  try {
    const jinaUrls = [
      `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`,
      `https://r.jina.ai/http://cc.bingj.com/cache.aspx?d=503-2721-1849&w=${encodeURIComponent(url)}`,
      `https://r.jina.ai/http://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`,
      `https://r.jina.ai/http://r.jina.ai/http://cc.bingj.com/cache.aspx?d=503-2721-1849&u=${encodeURIComponent(url)}`,
      `https://r.jina.ai/http://r.jina.ai/http://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`
    ];

    for (const jinaUrl of jinaUrls) {
      try {
        const response = await fetch(jinaUrl, {
          method: 'GET',
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/plain, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://r.jina.ai/',
            'Origin': 'https://r.jina.ai'
          }
        });

        if (response.ok) {
          const text = await response.text();
          console.log('Jina AI 成功获取内容长度:', text.length);

          if (text && text.length > 50) {
            // 检查是否获取到了有效内容而不是登录页面
            if (!isLoginPage(text)) {
              return { success: true, content: text, method: 'Jina AI' };
            } else {
              console.log('Jina AI 获取到的是登录页面，继续尝试下一个URL');
            }
          }
        }
      } catch (error: unknown) {
        console.log(`Jina AI URL ${jinaUrl} 失败:`, getErrorMessage(error));
        continue;
      }
    }
  } catch (error: unknown) {
    console.log('Jina AI 方法整体失败:', getErrorMessage(error));
  }

  return { success: false, error: 'Jina AI method failed' };
}

// 方法2: 多User-Agent直接请求
async function tryDirectRequest(url: string): Promise<FetchContentResult> {
  const headersConfigs: Record<string, string>[] = [
    {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    },
    {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  ];

  for (const headers of headersConfigs) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (response.ok) {
        const html = await response.text();
        console.log('直接请求成功获取HTML长度:', html.length);

        if (html && html.length > 100) {
          return { success: true, content: html, method: 'Direct Request' };
        }
      }
    } catch (error: unknown) {
      console.log('直接请求配置失败:', getErrorMessage(error));
      continue;
    }
  }

  return { success: false, error: '所有直接请求尝试都失败' };
}

// 方法3: 使用Textise代理
async function tryTextiseProxy(url: string): Promise<FetchContentResult> {
  try {
    const textiseUrl = `https://r.jina.ai/http://r.jina.ai/http://cc.bingj.com/cache.aspx?d=503-2721-1849&u=${encodeURIComponent(url)}`;

    const response = await fetch(textiseUrl, {
      method: 'GET',
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    if (response.ok) {
      const text = await response.text();
      console.log('Textise代理成功获取内容长度:', text.length);

      if (text && text.length > 50) {
        return { success: true, content: text, method: 'Textise Proxy' };
      }
    }
  } catch (error: unknown) {
    console.log('Textise代理失败:', getErrorMessage(error));
  }

  return { success: false, error: 'Textise proxy failed' };
}

// 方法4: 使用R.jina.ai的新API
async function tryRJinaAPI(url: string): Promise<FetchContentResult> {
  try {
    const apiUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://r.jina.ai/',
        'Origin': 'https://r.jina.ai'
      }
    });

    if (response.ok) {
      const text = await response.text();
      console.log('R.jina.ai成功获取内容长度:', text.length);

      if (text && text.length > 50) {
        return { success: true, content: text, method: 'R.jina.ai API' };
      }
    }
  } catch (error: unknown) {
    console.log('R.jina.ai失败:', getErrorMessage(error));
  }

  return { success: false, error: 'R.jina.ai failed' };
}

// 方法5: 使用多个代理服务
async function tryMultipleProxies(url: string): Promise<FetchContentResult> {
  const proxyServices = [
    {
      name: 'Proxy1',
      url: `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`
    },
    {
      name: 'Proxy2',
      url: `https://r.jina.ai/http://cc.bingj.com/cache.aspx?d=508-3421-1987&u=${encodeURIComponent(url)}`
    },
    {
      name: 'Proxy3',
      url: `https://r.jina.ai/http://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`
    }
  ];

  for (const proxy of proxyServices) {
    try {
      console.log(`尝试代理服务: ${proxy.name}`);

      const response = await fetch(proxy.url, {
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/plain, */*; q=0.01',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const text = await response.text();
        console.log(`${proxy.name}成功获取内容长度:`, text.length);

        if (text && text.length > 50 && !text.includes('404') && !text.includes('Not Found')) {
          return { success: true, content: text, method: `${proxy.name} Success` };
        }
      }
    } catch (error: unknown) {
      console.log(`${proxy.name}失败:`, getErrorMessage(error));
      continue;
    }
  }

  return { success: false, error: '所有代理服务都失败' };
}

// 方法6: 专门处理xhslink分享链接
async function tryXhslinkRedirect(url: string): Promise<FetchContentResult> {
  try {
    // 如果是xhslink.com链接，尝试解析其内容
    if (url.includes('xhslink.com')) {
      console.log('检测到xhslink分享链接，尝试解析');

      // 尝试多种代理方式解析xhslink
      const proxyUrls = [
        `https://r.jina.ai/http://${url}`,
        `https://r.jina.ai/http://cc.bingj.com/cache.aspx?d=503-2721-1849&u=${encodeURIComponent(url)}`,
        `https://r.jina.ai/http://r.jina.ai/http://${url}`
      ];

      for (const proxyUrl of proxyUrls) {
        try {
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'User-Agent': getRandomUserAgent(),
              'Accept': 'text/plain, */*; q=0.01',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (response.ok) {
            const text = await response.text();
            console.log('Xhslink 代理成功获取内容长度:', text.length);

            if (text && text.length > 50 && !isLoginPage(text)) {
              return { success: true, content: text, method: 'Xhslink Proxy' };
            }
          }
        } catch (error: unknown) {
          console.log(`Xhslink代理失败:`, getErrorMessage(error));
          continue;
        }
      }

      // 如果代理方式失败，尝试直接访问xhslink
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          redirect: 'follow' // 允许重定向
        });

        if (response.ok) {
          const html = await response.text();
          console.log('Xhslink直接访问成功获取HTML长度:', html.length);

          if (html && html.length > 100 && !isLoginPage(html)) {
            return { success: true, content: html, method: 'Xhslink Direct' };
          }
        }
      } catch (error: unknown) {
        console.log('Xhslink直接访问失败:', getErrorMessage(error));
      }
    }

    return { success: false, error: 'Xhslink method failed' };
  } catch (error: unknown) {
    console.log('Xhslink方法整体失败:', getErrorMessage(error));
    return { success: false, error: 'Xhslink method failed' };
  }
}

// 检测是否为登录页面或错误页面
function isLoginPage(html: string): boolean {
  const loginIndicators = [
    /登录/i,
    /login/i,
    /sign.?in/i,
    /验证/i,
    /验证码/i,
    /手机号/i,
    /密码/i,
    /微信登录/i,
    /账号登录/i
  ];

  return loginIndicators.some(pattern => pattern.test(html));
}

// 检测是否包含有效的笔记内容
function hasValidContent(html: string): boolean {
  const contentIndicators = [
    /class="[^"]*content[^"]*"/i,
    /class="[^"]*desc[^"]*"/i,
    /class="[^"]*note[^"]*"/i,
    /data-ecom/,
    /<img[^>]+src="[^"]*[^"]*xiaohongshu[^"]*"/i
  ];

  return contentIndicators.some(pattern => pattern.test(html));
}

// 解析HTML内容提取小红书笔记信息
function parseXiaohongshuContent(html: string, extractedTitle: string): ParsedNoteData {
  try {
    // 首先检查是否被重定向到登录页面
    if (isLoginPage(html)) {
      return {
        title: extractedTitle || '检测到登录页面',
        content: `❌ 小红书要求登录才能查看此笔记内容\n\n🔄 系统检测到访问被重定向到登录页面，这通常是因为：\n\n1. 笔记设置了隐私权限\n2. 小红书加强了反爬虫措施\n3. 需要登录验证才能查看\n\n✨ 我们已经提取到了笔记标题："${extractedTitle || '无标题'}"\n\n📝 请手动复制粘贴笔记的正文内容到下方输入框，然后开始智能改写。\n\n💡 技术提示：建议直接在小红书App内查看并复制笔记内容，然后粘贴到改写工具中。`,
        author: '需要登录查看',
        tags: extractedTitle ? extractTags(extractedTitle) : [],
        images: [],
        stats: { likes: 0, comments: 0, shares: 0 },
        requiresLogin: true
      };
    }

    // 检查是否包含有效内容
    if (!hasValidContent(html)) {
      return {
        title: extractedTitle || '未检测到笔记内容',
        content: `⚠️ 未检测到有效的笔记内容\n\n🔍 系统成功访问了页面，但没有找到预期的笔记内容，这可能是因为：\n\n1. 链接格式不正确\n2. 笔记已被删除或隐藏\n3. 页面结构发生了变化\n\n✨ 我们已经提取到了笔记标题："${extractedTitle || '无标题'}"\n\n📝 请手动复制粘贴笔记的正文内容到下方输入框，然后开始智能改写。`,
        author: '小红书用户',
        tags: extractedTitle ? extractTags(extractedTitle) : [],
        images: [],
        stats: { likes: 0, comments: 0, shares: 0 },
        noContent: true
      };
    }

    // 提取标题
    let title = extractedTitle;
    if (!title) {
      const titlePatterns = [
        /<title[^>]*>([^<]+)<\/title>/i,
        /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i,
        /<meta[^>]+name="title"[^>]+content="([^"]+)"/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /<div[^>]+class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i
      ];

      for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          title = match[1].replace(/ - 小红书$/, '').trim();
          if (title.length > 5 && !title.includes('登录') && !title.includes('登录页')) {
            break;
          }
        }
      }
    }

    // 提取内容 - 使用更精确的 selectors
    let content = '';

    // 尝试更精确的内容提取模式
    const contentPatterns = [
      /<div[^>]+class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+class="[^"]*note[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+data-ecom[^>]*>([\s\S]*?)<\/div>/i,
      /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
      /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
      /<p[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/p>/i
    ];

    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const cleanContent = match[1].replace(/<[^>]*>/g, '').trim();
        if (cleanContent.length > 20 && !cleanContent.includes('登录') && !cleanContent.includes('小红书')) {
          content = cleanContent;
          break;
        }
      }
    }

    // 如果没找到内容，尝试提取所有文本但排除导航和页脚
    if (!content || content.length < 20) {
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (textContent.length > 100 && !textContent.includes('登录') && !textContent.includes('小红书登录')) {
        content = textContent.substring(0, 800) + '...';
      }
    }

    // 如果仍然没有内容，生成提示
    if (!content || content.length < 10) {
      content = `🔍 内容解析遇到技术障碍\n\n系统成功访问了页面，但未能提取到笔记正文内容。\n\n📝 建议您：\n1. 手动在小红书App内打开笔记\n2. 长按复制笔记内容\n3. 粘贴到下方输入框进行改写\n\n💡 当前已提取标题："${title || extractedTitle || '无标题'}"`;
    }

    // 提取作者信息
    let author = '小红书用户';
    const authorPatterns = [
      /<span[^>]+class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i,
      /<div[^>]+class="[^"]*user[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<a[^>]+class="[^"]*username[^"]*"[^>]*>([^<]+)<\/a>/i
    ];

    for (const pattern of authorPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const cleanAuthor = match[1].trim();
        if (cleanAuthor.length > 1 && cleanAuthor.length < 20) {
          author = cleanAuthor;
          break;
        }
      }
    }

    // 提取标签和话题
    const tags = extractTags(content + ' ' + title);

    return {
      title: title || extractedTitle || '小红书笔记',
      content: content,
      author: author,
      tags: tags,
      images: [],
      stats: { likes: 0, comments: 0, shares: 0 },
      contentFound: content.length > 50
    };

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('解析HTML内容失败:', error);
    return {
      title: extractedTitle || '小红书笔记',
      content: `🔧 内容解析失败\n\n抱歉，在解析笔记内容时遇到了技术问题：${message}\n\n📝 请手动复制粘贴笔记的正文内容到下方输入框，然后开始智能改写。`,
      author: '解析失败',
      tags: extractedTitle ? extractTags(extractedTitle) : [],
      images: [],
      stats: { likes: 0, comments: 0, shares: 0 },
      parseError: true
    };
  }
}

// 主要的解析函数
async function parseXiaohongshuUrl(input: string): Promise<ParseResult> {
  try {
    console.log('🚀 开始高级解析小红书链接:', input);

    // 从输入中提取真实的小红书链接
    const actualUrl = extractXiaohongshuUrl(input);
    if (!actualUrl) {
      return {
        success: true,
        data: {
          title: '无法提取有效链接',
          content: `无法从输入内容中识别有效的小红书链接。\n\n支持的小红书链接格式：\n• https://www.xiaohongshu.com/explore/xxxxx\n• https://www.xiaohongshu.com/discovery/item/xxxxx\n• https://xhslink.com/xxxxx\n\n请检查链接格式是否正确，或者手动复制粘贴笔记的标题和内容。`,
          author: '无法获取',
          tags: [],
          images: [],
          stats: { likes: 0, comments: 0, shares: 0 }
        }
      };
    }

    console.log('✅ 提取到的链接:', actualUrl);

    // 尝试从原始输入中提取标题
    let extractedTitle = '';
    const titleMatch = input.match(/^([^【\s][^【]*?)\s*(?:http|www\.)/);
    if (titleMatch) {
      extractedTitle = titleMatch[1].trim();
      console.log('✅ 提取到的标题:', extractedTitle);
    }

    // 🎯 尝试多种高级解析方法
    const methods = [
      { name: 'Xhslink Redirect', func: tryXhslinkRedirect },
      { name: 'Jina AI', func: tryJinaAI },
      { name: 'R.jina.ai API', func: tryRJinaAPI },
      { name: 'Textise Proxy', func: tryTextiseProxy },
      { name: 'Multiple Proxies', func: tryMultipleProxies },
      { name: 'Direct Request', func: tryDirectRequest }
    ];

    let lastError = '';

    for (const method of methods) {
      try {
        console.log(`🔄 尝试方法: ${method.name}`);

        const result = await method.func(actualUrl);

        if (result.success && result.content) {
          console.log(`🎉 ${method.name} 成功! 内容长度: ${result.content.length}`);

          // 解析获取到的内容
          const parsedData = parseXiaohongshuContent(result.content, extractedTitle);

          return {
            success: true,
            data: {
              ...parsedData,
              extractionMethod: method.name
            }
          };
        } else {
          console.log(`❌ ${method.name} 失败:`, result.error);
          lastError = result.error ?? lastError;
        }
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.log(`💥 ${method.name} 异常:`, message);
        lastError = message;
      }

      // 每次方法失败后等待一下
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 😢 如果所有方法都失败了
    console.log('💔 所有解析方法都失败了，返回智能降级方案');

    // 智能降级：基于标题生成模拟内容提示
    const fallbackContent = extractedTitle ?
      `📝 智能改写助手已准备就绪\n\n✨ 成功提取笔记标题："${extractedTitle}"\n\n🚀 请将此笔记的完整内容复制粘贴到下方输入框中，系统将为您：\n• 重新创作吸引人的标题\n• 优化正文表达方式\n• 生成相关的话题标签\n• 提供改写建议和优化方案\n\n💡 专业提示：建议在小红书App内查看完整笔记，然后长按复制内容到这里。\n\n🎯 改写风格支持：相似风格、创意改写、专业版、口语化等多种选择。` :
      `🔍 笔记链接解析系统\n\n❌ 自动解析遇到技术挑战，这通常是由于：\n\n1️⃣ 小红书平台加强了反爬虫保护\n2️⃣ 笔记设置了隐私权限限制\n3️⃣ 网络环境或连接不稳定\n\n🎯 解决方案：\n• 手动在小红书App内查看笔记\n• 长按复制完整笔记内容\n• 粘贴到下方输入框开始智能改写\n\n✨ 改写功能完全可用，支持多种风格和专业的文案优化！`;

    return {
      success: true,
      data: {
        title: extractedTitle || '小红书笔记标题',
        content: fallbackContent,
        author: extractedTitle ? '已提取标题' : '需要手动输入',
        tags: extractedTitle ? extractTags(extractedTitle) : [],
        images: [],
        stats: { likes: 0, comments: 0, shares: 0 },
        extractionMethod: 'Smart Fallback - Manual Input Required',
        debugInfo: lastError,
        needsManualInput: true,
        hasTitle: !!extractedTitle
      }
    };

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('💥 解析过程中发生严重错误:', error);
    return {
      success: false,
      error: `解析系统遇到技术问题: ${message}。请稍后重试或联系技术支持。`
    };
  }
}

// 从内容中提取可能的标签
function extractTags(content: string): string[] {
  const hashtags = content.match(/#[\w\u4e00-\u9fa5]+/g) || [];
  return hashtags.slice(0, 5); // 最多返回5个标签
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: '请提供小红书链接' },
        { status: 400 }
      );
    }

    // 验证是否是小红书链接
    if (!url.includes('xiaohongshu.com') && !url.includes('xhslink.com')) {
      return NextResponse.json(
        { success: false, error: '请提供有效的小红书链接' },
        { status: 400 }
      );
    }

    const result = await parseXiaohongshuUrl(url);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error: unknown) {
    console.error('解析小红书链接失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
