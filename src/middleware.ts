import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 不需要登录就能访问的路径
const publicPaths = [
    '/',           // 首页
    '/login',      // 登录页
    '/api/auth',   // 认证 API
];

// 静态资源路径前缀
const staticPrefixes = [
    '/_next',
    '/favicon.ico',
    '/api/auth',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 静态资源直接放行
    if (staticPrefixes.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // 公开路径直接放行
    if (publicPaths.includes(pathname)) {
        return NextResponse.next();
    }

    // 检查认证 Cookie
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
        // 未登录，重定向到登录页，并带上原始路径
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 已登录，放行
    return NextResponse.next();
}

// 配置中间件匹配的路径
export const config = {
    matcher: [
        /*
         * 匹配所有路径，除了：
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
