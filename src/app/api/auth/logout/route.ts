import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        // 清除认证 Cookie
        const cookieStore = await cookies();
        cookieStore.delete('auth_token');

        return NextResponse.json({
            success: true,
            message: '登出成功'
        });
    } catch {
        return NextResponse.json(
            { success: false, error: '登出失败' },
            { status: 500 }
        );
    }
}
