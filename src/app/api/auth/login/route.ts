import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 从环境变量获取认证信息
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'xhs2026';

// 简单的 token 生成（实际生产环境建议使用 JWT）
function generateToken(username: string): string {
    const timestamp = Date.now();
    const data = `${username}:${timestamp}:${AUTH_PASSWORD}`;
    // 简单的 base64 编码
    return Buffer.from(data).toString('base64');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        // 验证账号密码
        if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
            // 生成认证 token
            const token = generateToken(username);

            // 设置 Cookie
            const cookieStore = await cookies();
            cookieStore.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 天有效期
                path: '/',
            });

            return NextResponse.json({
                success: true,
                message: '登录成功'
            });
        } else {
            return NextResponse.json(
                { success: false, error: '账号或密码错误' },
                { status: 401 }
            );
        }
    } catch {
        return NextResponse.json(
            { success: false, error: '登录失败，请重试' },
            { status: 500 }
        );
    }
}
