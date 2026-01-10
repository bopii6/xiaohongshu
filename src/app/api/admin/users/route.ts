import { NextRequest, NextResponse } from 'next/server';
import { getUsers, addUser, deleteUser } from '@/lib/users';

// 管理员密码验证
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin888';

function verifyAdmin(request: NextRequest): boolean {
    const adminToken = request.cookies.get('admin_token')?.value;
    return adminToken === ADMIN_PASSWORD;
}

// GET - 获取所有用户
export async function GET(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const users = getUsers();
    // 不返回密码
    const safeUsers = users.map(({ password, ...user }) => user);
    return NextResponse.json({ users: safeUsers });
}

// POST - 添加用户
export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { username, password, name } = body;

        if (!username || !password) {
            return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 });
        }

        const newUser = addUser({
            username,
            password,
            name: name || username,
            enabled: true,
        });

        return NextResponse.json({
            success: true,
            user: { ...newUser, password: undefined }
        });
    } catch {
        return NextResponse.json({ error: '添加失败' }, { status: 500 });
    }
}

// DELETE - 删除用户
export async function DELETE(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: '缺少用户 ID' }, { status: 400 });
        }

        const success = deleteUser(id);
        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }
    } catch {
        return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }
}
