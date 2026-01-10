# Cloudflare CDN 缓存调试指南

## 问题描述

当修改页面链接或内容后，通过 Cloudflare CDN 访问的页面仍显示旧版本，而直接访问服务器（通过公网 IP）显示的是新版本。

## 问题根源

1. **Next.js 内部缓存**：`.next/cache` 目录会缓存预渲染的静态页面
2. **Cloudflare CDN 边缘缓存**：即使执行 Purge Everything，某些边缘节点的缓存可能不会立即清除
3. **Cache-Control 头冲突**：Next.js 可能返回 `s-maxage=31536000`，导致 CDN 长时间缓存

## 解决方案

### 1. 清除 Next.js 内部缓存

```bash
rm -rf /var/www/xiaohongshu/.next/cache
pm2 restart xhs-app
```

### 2. Nginx 配置 - 添加 CDN 专用缓存控制头

在 `/www/server/panel/vhost/nginx/xhs.hellojoy.top.conf` 中：

```nginx
# 页面不缓存
location / {
    proxy_pass http://127.0.0.1:3101;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 关键：CDN 专用缓存控制头
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    add_header CDN-Cache-Control "no-store" always;
    add_header Surrogate-Control "no-store" always;
}
```

**关键头说明：**
- `CDN-Cache-Control`: Cloudflare 专门识别的头，优先级高于标准 Cache-Control
- `Surrogate-Control`: CDN 代理服务器的标准缓存控制头

### 3. Cloudflare Cache Rules（可选但推荐）

在 Cloudflare Dashboard → Caching → Cache Rules 中添加规则：

- **Rule name**: `No cache for homepage`
- **When**: `(http.request.uri.path eq "/")`
- **Then**: Bypass cache

确保此规则排在**第1位**（最高优先级）。

### 4. 执行 Purge

修改 Nginx 配置并重启后，在 Cloudflare Dashboard 执行 **Purge Everything**。

## 调试命令

```bash
# 验证服务器直接返回的内容
curl -s http://127.0.0.1:3101/ | grep -o 'href="/[a-z-]*"' | head -3

# 验证 Nginx 返回的内容
curl -s http://127.0.0.1/ -H "Host: xhs.hellojoy.top" | grep -o 'href="/[a-z-]*"' | head -3

# 验证 Cloudflare 返回的内容
curl -s https://xhs.hellojoy.top/ | grep -o 'href="/[a-z-]*"' | head -3

# 带参数绕过缓存测试
# 浏览器访问: https://xhs.hellojoy.top/?cachebust=1
```

## 教训

1. Next.js 的 `export const dynamic = 'force-dynamic'` 只控制服务器端渲染，不能阻止 CDN 缓存
2. Cloudflare 的 Purge 有时不可靠，需要从源头（Nginx）控制缓存行为
3. 调试 CDN 缓存问题时，用 `curl` 从服务器测试比用浏览器更准确
4. 多层缓存（Next.js 内部缓存 + Nginx + CDN）需要逐层排查
