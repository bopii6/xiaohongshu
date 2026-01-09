import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_REFERER = 'https://www.xiaohongshu.com/';
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function isAllowedHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === 'xiaohongshu.com' || lower.endsWith('.xiaohongshu.com')) return true;
  if (lower.endsWith('.xhscdn.com')) return true;
  return false;
}

function normalizeTargetUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice(7)}`;
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(normalizeTargetUrl(urlParam));
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid url' }, { status: 400 });
  }

  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json({ success: false, error: 'Host not allowed' }, { status: 403 });
  }

  target.protocol = 'https:';
  const referer = request.nextUrl.searchParams.get('referer') || DEFAULT_REFERER;
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_UA,
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': referer
  };

  if (process.env.XHS_COOKIE) {
    headers.Cookie = process.env.XHS_COOKIE;
  }

  const response = await fetch(target.toString(), {
    method: 'GET',
    headers,
    redirect: 'follow'
  });

  if (!response.ok) {
    return NextResponse.json(
      { success: false, error: `Upstream ${response.status}` },
      { status: response.status }
    );
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const result = new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });

  return result;
}
