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
  videoUrl?: string;
  noteType?: string;
  sourceUrl?: string;
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

function normalizeImageUrl(url: string): string {
  const trimmed = url.trim()
    .replace(/\\u002F/g, '/')
    .replace(/&amp;/g, '&');
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('http://')) {
    const httpsCandidate = `https://${trimmed.slice(7)}`;
    if (/xiaohongshu|xhscdn/i.test(httpsCandidate)) {
      return httpsCandidate;
    }
  }
  return trimmed;
}

/**
 * Extract unique image identifier from XHS image URL.
 * This handles different URL formats for the same image (different sizes, CDNs, etc.)
 */
function extractImageIdentifier(url: string): string {
  // Pattern 1: 24-char hex ID (most common XHS format)
  const hexMatch = url.match(/\/([a-f0-9]{24})(?:[!?/]|$)/i);
  if (hexMatch?.[1]) return hexMatch[1];

  // Pattern 2: spectrum path with ID
  const spectrumMatch = url.match(/\/spectrum\/([^/?!]+)/i);
  if (spectrumMatch?.[1]) return spectrumMatch[1];

  // Pattern 3: Generic filename extraction (without extension and params)
  const filenameMatch = url.match(/\/([^/?!]+?)(?:\.[a-z]{3,4})?(?:[!?]|$)/i);
  if (filenameMatch?.[1] && filenameMatch[1].length >= 8) return filenameMatch[1];

  // Fallback: use full URL
  return url;
}

function extractImageUrls(html: string): string[] {
  const candidates = new Set<string>();
  const push = (url: string) => {
    const normalized = normalizeImageUrl(url);
    if (!/^https?:\/\//i.test(normalized)) return;
    if (normalized.startsWith('data:')) return;
    candidates.add(normalized);
  };

  const metaPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi
  ];
  for (const pattern of metaPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) push(match[1]);
    }
  }

  const imgTagPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgTagPattern.exec(html)) !== null) {
    if (imgMatch[1]) push(imgMatch[1]);
  }

  const jsonUrlPattern = /"url"\s*:\s*"([^"]+)"/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = jsonUrlPattern.exec(html)) !== null) {
    if (jsonMatch[1]) push(jsonMatch[1]);
  }

  const directImagePattern = /https?:\/\/[^"'\\s>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\s>]*)?/gi;
  let directMatch: RegExpExecArray | null;
  while ((directMatch = directImagePattern.exec(html)) !== null) {
    if (directMatch[0]) push(directMatch[0]);
  }

  const filtered = Array.from(candidates).filter(url => {
    const lower = url.toLowerCase();
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(lower)) return false;
    return /xiaohongshu|xhscdn/.test(lower);
  });

  return filtered.slice(0, 12);
}

interface StructuredNoteData {
  title?: string;
  content?: string;
  author?: string;
  images?: string[];
  videoUrl?: string;
  noteType?: string;
}

function firstString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function extractImagesFromList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  const urlKeys = [
    'url',
    'urlDefault',
    'url_default',
    'urlPre',
    'url_pre',
    'urlOrigin',
    'url_origin',
    'originUrl',
    'origin_url',
    'original_url',
    'url_list'
  ];

  for (const item of value) {
    if (typeof item === 'string') {
      urls.push(normalizeImageUrl(item));
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    for (const key of urlKeys) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        urls.push(normalizeImageUrl(candidate));
      } else if (Array.isArray(candidate)) {
        for (const nested of candidate) {
          if (typeof nested === 'string' && nested.trim().length > 0) {
            urls.push(normalizeImageUrl(nested));
          }
        }
      }
    }
  }
  return urls;
}

function collectStringValues(value: unknown, out: string[]) {
  if (!value) return;
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, out);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStringValues(item, out);
    }
  }
}

function looksLikeVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes('.mp4') || lower.includes('.m3u8')) return true;
  return lower.includes('xhscdn') && lower.includes('video');
}

function extractVideoUrls(value: unknown): string[] {
  const raw: string[] = [];
  collectStringValues(value, raw);
  const filtered = raw
    .map(normalizeImageUrl)
    .filter(url => /^https?:\/\//i.test(url) && looksLikeVideoUrl(url));
  return Array.from(new Set(filtered));
}

function pickPreferredVideoUrl(urls: string[]): string | undefined {
  const mp4 = urls.find(url => url.toLowerCase().includes('.mp4'));
  return mp4 || urls[0];
}

function sanitizeJsonLike(raw: string): string {
  return raw
    .replace(/\bundefined\b/g, 'null')
    .replace(/\bNaN\b/g, 'null')
    .replace(/\bInfinity\b/g, 'null');
}

function extractInitialState(html: string): Record<string, unknown> | null {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/i);
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(sanitizeJsonLike(match[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractNoteFromData(noteData: Record<string, unknown>): StructuredNoteData | null {
  const title = firstString(noteData, ['title', 'noteTitle', 'displayTitle', 'display_title', 'shareTitle']);
  const content = firstString(noteData, ['desc', 'description', 'content', 'noteDesc', 'note_content']);
  const rawType = firstString(noteData, ['type', 'noteType', 'note_type']);
  let author = firstString(noteData, ['author', 'nickname', 'userName', 'username', 'user_name']);
  if (!author && noteData.user && typeof noteData.user === 'object') {
    author = firstString(noteData.user, ['nickname', 'name', 'userName', 'username']);
  }

  let images: string[] = [];
  images = images.concat(extractImagesFromList(noteData.imageList));
  images = images.concat(extractImagesFromList(noteData.image_list));
  images = images.concat(extractImagesFromList(noteData.images));
  images = images.concat(extractImagesFromList(noteData.imgs));

  const videoCandidates = [
    ...extractVideoUrls(noteData.video),
    ...extractVideoUrls(noteData.videoInfo),
    ...extractVideoUrls(noteData.video_info),
    ...extractVideoUrls(noteData.media),
    ...extractVideoUrls(noteData.mediaInfo),
    ...extractVideoUrls(noteData.stream),
    ...extractVideoUrls(noteData)
  ];
  const videoUrl = pickPreferredVideoUrl(videoCandidates);
  const noteType = videoUrl || (rawType && rawType.toLowerCase() !== 'normal') ? 'video' : 'note';

  if (!title && !content && images.length === 0 && !videoUrl) return null;

  // Deduplicate images by their core identifier, not full URL
  // This handles cases where XHS returns same image with different URL params/CDNs
  const seen = new Map<string, string>();
  for (const url of images) {
    if (!url) continue;
    const id = extractImageIdentifier(url);
    if (!seen.has(id)) {
      seen.set(id, url);
    }
  }
  const uniqueImages = Array.from(seen.values());

  return {
    title: title ?? undefined,
    content: content ?? undefined,
    author: author ?? undefined,
    images: uniqueImages,
    videoUrl: videoUrl,
    noteType: noteType
  };
}

function extractNoteFromInitialState(html: string, noteId?: string): StructuredNoteData | null {
  const state = extractInitialState(html);
  if (!state) return null;

  const queue: unknown[] = [state];
  const visited = new Set<unknown>();
  let noteDetailMap: Record<string, unknown> | null = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const record = current as Record<string, unknown>;
    if (record.noteDetailMap && typeof record.noteDetailMap === 'object') {
      noteDetailMap = record.noteDetailMap as Record<string, unknown>;
      break;
    }

    queue.push(...Object.values(record));
  }

  if (!noteDetailMap) return null;

  const resolveEntry = (entry: unknown): StructuredNoteData | null => {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    if (record.note && typeof record.note === 'object') {
      return extractNoteFromData(record.note as Record<string, unknown>);
    }
    return extractNoteFromData(record);
  };

  if (noteId && noteDetailMap[noteId]) {
    const resolved = resolveEntry(noteDetailMap[noteId]);
    if (resolved) return resolved;
  }

  for (const entry of Object.values(noteDetailMap)) {
    const resolved = resolveEntry(entry);
    if (resolved) return resolved;
  }

  return null;
}

function extractStructuredNote(html: string, noteId?: string): StructuredNoteData | null {
  const initialStateNote = extractNoteFromInitialState(html, noteId);
  if (initialStateNote) return initialStateNote;

  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!nextDataMatch || !nextDataMatch[1]) return null;

  try {
    const json = JSON.parse(nextDataMatch[1]);
    const queue: unknown[] = [json];
    const visited = new Set<unknown>();
    let depth = 0;

    while (queue.length > 0 && depth < 7) {
      const current = queue.shift();
      depth += 1;
      if (!current || typeof current !== 'object') continue;
      if (visited.has(current)) continue;
      visited.add(current);

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      const record = current as Record<string, unknown>;
      const recordNote = record.note && typeof record.note === 'object'
        ? (record.note as Record<string, unknown>)
        : null;
      const recordNoteId = recordNote
        ? firstString(recordNote, ['noteId', 'note_id', 'id', 'noteIdStr', 'note_id_str'])
        : firstString(record, ['noteId', 'note_id', 'id', 'noteIdStr', 'note_id_str']);

      if (!noteId || (recordNoteId && recordNoteId === noteId)) {
        const candidate = recordNote ? extractNoteFromData(recordNote) : extractNoteFromData(record);
        if (candidate) return candidate;
      }

      queue.push(...Object.values(record));
    }
  } catch {
    return null;
  }

  return null;
}

// 从分享文本中提取标题和作者信息
interface ShareTextExtraction {
  title: string;
  author: string;
  url: string | null;
}

function extractFromShareText(input: string): ShareTextExtraction {
  let title = '';
  let author = '';
  let url: string | null = null;

  // 提取【】中的内容：格式通常是 【标题 - 作者 | 小红书】
  const bracketMatch = input.match(/【([^】]+)】/);
  if (bracketMatch) {
    const bracketContent = bracketMatch[1];
    // 尝试分割标题和作者
    const parts = bracketContent.split(/\s*[-|－]\s*/);
    if (parts.length >= 2) {
      title = parts[0].trim();
      // 作者通常在第二部分，排除"小红书"等平台名
      const possibleAuthor = parts[1].trim();
      if (!possibleAuthor.includes('小红书')) {
        author = possibleAuthor;
      }
    } else {
      title = bracketContent.replace(/\s*\|\s*小红书.*$/, '').trim();
    }
  }

  // 提取URL
  const urlPatterns = [
    /https?:\/\/www\.xiaohongshu\.com\/explore\/[a-f0-9]+[^\s]*/i,
    /https?:\/\/www\.xiaohongshu\.com\/discovery\/item\/[a-f0-9]+[^\s]*/i,
    /https?:\/\/xhslink\.com\/[^\s]+/i,
    /www\.xiaohongshu\.com\/explore\/[a-f0-9]+[^\s]*/i,
    /www\.xiaohongshu\.com\/discovery\/item\/[a-f0-9]+[^\s]*/i,
    /xhslink\.com\/[^\s]+/i
  ];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) {
      url = match[0];
      if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
      }
      break;
    }
  }

  return { title, author, url };
}

// 从混合文本中提取小红书链接（保留向后兼容）
function extractXiaohongshuUrl(input: string): string | null {
  return extractFromShareText(input).url;
}

function extractNoteIdFromUrl(url: string): string | null {
  const match = url.match(/\/(?:explore|discovery\/item)\/([a-f0-9]+)/i);
  return match ? match[1] : null;
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

const XHS_COOKIE = process.env.XHS_COOKIE;

function withCookie(headers: Record<string, string>): Record<string, string> {
  if (!XHS_COOKIE) return headers;
  return { ...headers, Cookie: XHS_COOKIE };
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
      'Cache-Control': 'max-age=0',
      'Referer': url,
      'Origin': 'https://www.xiaohongshu.com'
    },
    {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Referer': url,
      'Origin': 'https://www.xiaohongshu.com'
    }
  ];

  for (const headers of headersConfigs) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: withCookie(headers)
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
          headers: withCookie({
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }),
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
    /小红书登录/i,
    /手机号登录/i,
    /验证码登录/i,
    /账号登录/i,
    /微信登录/i,
    /login/i,
    /sign.?in/i,
    /passport/i
  ];

  if (!loginIndicators.some(pattern => pattern.test(html))) {
    return false;
  }

  return !hasValidContent(html);
}

// 检测是否包含有效的笔记内容
function hasValidContent(html: string): boolean {
  if (extractStructuredNote(html)) {
    return true;
  }

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
function parseXiaohongshuContent(html: string, extractedTitle: string, noteId?: string): ParsedNoteData {
  try {
    const structured = extractStructuredNote(html, noteId);
    // 首先检查是否被重定向到登录页面
    if (!structured && isLoginPage(html)) {
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
    if (!structured && !hasValidContent(html)) {
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
    let title = structured?.title || extractedTitle || "";
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
    let content = structured?.content || '';

    if (!content || content.length < 20) {
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
    const images = structured?.images ?? [];
    const videoUrl = structured?.videoUrl;
    const noteType = structured?.noteType;

    return {
      title: title || extractedTitle || '小红书笔记',
      content: content,
      author: author,
      tags: tags,
      images: images.length > 0 ? images : extractImageUrls(html),
      videoUrl: videoUrl,
      noteType: noteType,
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

    // 从分享文本中提取所有信息
    const shareTextInfo = extractFromShareText(input);
    const actualUrl = shareTextInfo.url;
    const extractedTitle = shareTextInfo.title;
    const extractedAuthor = shareTextInfo.author;
    const noteId = actualUrl ? extractNoteIdFromUrl(actualUrl) : null;

    console.log('📝 从分享文本提取: 标题=', extractedTitle, '作者=', extractedAuthor);

    if (!actualUrl) {
      return {
        success: true,
        data: {
          title: '无法提取有效链接',
          content: `无法从输入内容中识别有效的小红书链接。\n\n支持的小红书链接格式：\n• https://www.xiaohongshu.com/explore/xxxxx\n• https://www.xiaohongshu.com/discovery/item/xxxxx\n• https://xhslink.com/xxxxx\n\n请检查链接格式是否正确。`,
          author: '无法获取',
          tags: [],
          images: [],
          stats: { likes: 0, comments: 0, shares: 0 }
        }
      };
    }

    console.log('✅ 提取到的链接:', actualUrl);
    console.log('✅ 提取到的标题:', extractedTitle);

    // 🎯 尝试多种高级解析方法
    const methods = [
      { name: 'Direct Request', func: tryDirectRequest },
      { name: 'Xhslink Redirect', func: tryXhslinkRedirect },
      { name: 'Jina AI', func: tryJinaAI },
      { name: 'R.jina.ai API', func: tryRJinaAPI },
      { name: 'Textise Proxy', func: tryTextiseProxy },
      { name: 'Multiple Proxies', func: tryMultipleProxies }
    ];

    let lastError = '';

    for (const method of methods) {
      try {
        console.log(`🔄 尝试方法: ${method.name}`);

        const result = await method.func(actualUrl);

        if (result.success && result.content) {
          console.log(`🎉 ${method.name} 成功! 内容长度: ${result.content.length}`);

          // 解析获取到的内容
          const parsedData = parseXiaohongshuContent(result.content, extractedTitle, noteId ?? undefined);
          if (parsedData.requiresLogin || parsedData.noContent || parsedData.parseError) {
            return {
              success: false,
              error: '无法自动提取该笔记内容，请确认链接可访问且Cookie有效。'
            };
          }

          return {
            success: true,
            data: {
              ...parsedData,
              extractionMethod: method.name,
              sourceUrl: actualUrl
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
    return {
      success: false,
      error: '自动解析失败，请确认链接可访问且Cookie有效。'
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

    if (!process.env.XHS_COOKIE) {
      return NextResponse.json(
        { success: false, error: '未配置XHS_COOKIE，无法自动抓取小红书内容' },
        { status: 500 }
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
