import fs from 'fs';
import path from 'path';

export interface User {
    id: string;
    username: string;
    password: string;
    name: string;
    createdAt: string;
    enabled: boolean;
}

interface UsersData {
    users: User[];
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// 确保 data 目录存在
function ensureDataDir() {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// 读取所有用户
export function getUsers(): User[] {
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed: UsersData = JSON.parse(data);
    return parsed.users || [];
}

// 根据用户名查找用户
export function findUserByUsername(username: string): User | undefined {
    const users = getUsers();
    return users.find(u => u.username === username && u.enabled);
}

// 验证用户登录
export function validateUser(username: string, password: string): User | null {
    const user = findUserByUsername(username);
    if (user && user.password === password) {
        return user;
    }
    return null;
}

// 添加用户
export function addUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const users = getUsers();
    const newUser: User = {
        ...user,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
}

// 删除用户
export function deleteUser(id: string): boolean {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    users.splice(index, 1);
    saveUsers(users);
    return true;
}

// 保存用户数据
function saveUsers(users: User[]) {
    ensureDataDir();
    const data: UsersData = { users };
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
