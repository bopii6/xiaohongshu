# 子域名部署记录（xhs.hellojoy.top）

这份记录用于复盘这次子域名共存部署的过程、遇到的问题与解决方法，方便下次快速复用。

## 目标
- 在不影响现有站点 `hellojoy.top` 的前提下，为新服务创建子域名 `xhs.hellojoy.top`
- Nginx 反代到新服务端口（示例：3101）
- 保持原站点配置不变

## 最终结构
- 现有站点：`hellojoy.top`（独立 vhost 配置）
- 新子域名：`xhs.hellojoy.top`（新增 vhost 配置）
- 应用端口：`127.0.0.1:3101`
- DNS：Cloudflare 添加 A 记录（`xhs -> 服务器公网 IP`）
- HTTPS：Cloudflare Flexible（浏览器 HTTPS，源站 HTTP）

## 关键步骤（复用版）
1) **DNS 记录**
   - Cloudflare 新增 A 记录：`xhs -> 服务器公网 IP`
   - 初期建议 Proxy = DNS only，确认通了再改为 Proxied

2) **Nginx 新增 vhost（不改原站）**
   - 先备份：`cp hellojoy.top.conf hellojoy.top.conf.bak`
   - 新建：`xhs.hellojoy.top.conf`

3) **Nginx 语法检查并重载**
   - `nginx -t`
   - `/www/server/nginx/sbin/nginx -s reload`

4) **本机反代验证**
   - `curl -I -H "Host: xhs.hellojoy.top" http://127.0.0.1/`
   - 返回 200 说明 Nginx 正常

5) **公网访问**
   - `http://xhs.hellojoy.top/rewrite`
   - 如果开启 Cloudflare Proxied，需处理 HTTPS 相关问题

## 遇到的问题与解决方案

### 1) 域名解析明明已加，还是打不开
**现象**
- 本地浏览器访问失败
- `nslookup` 有时显示 NXDOMAIN

**原因**
- `nslookup` 会查 AAAA（IPv6）记录，没有也会显示 NXDOMAIN，但 A 记录其实已生效
- 8.8.8.8 在服务器上被屏蔽，查询结果不可靠

**解决**
- 使用 1.1.1.1/114.114.114.114 查询 A 记录：
  - `nslookup -type=A xhs.hellojoy.top 1.1.1.1`
- 只要 A 记录返回 IP 就是正常

### 2) Cloudflare 开了 Proxied，浏览器报 521/连接重置
**现象**
- Cloudflare 521（Web server is down）
- 浏览器提示连接重置

**原因**
- Cloudflare SSL/TLS 模式是 **Full**
- Cloudflare 会用 HTTPS 连接源站，但源站没有证书

**解决（最快）**
- SSL/TLS → Overview → 设置为 **Flexible**
- 浏览器到 Cloudflare 用 HTTPS，Cloudflare 到源站用 HTTP

**长期更安全方案**
- 为源站配置证书（Cloudflare Origin Certificate 或 Let’s Encrypt）
- 把模式改为 **Full (Strict)**

### 3) Nginx 配置写入出错
**现象**
- 这里文档输出不完整、出现奇怪内容

**原因**
- here-doc 没有正确结束（`NGINX` 标记被打断）

**解决**
- 重新覆盖写入完整配置，再 `nginx -t` 检查

## 子域名 Nginx 示例（HTTP 反代）
```nginx
server {
    listen 80;
    server_name xhs.hellojoy.top;

    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 下次复用的最短流程
1) Cloudflare 添加 A 记录（xhs -> IP）
2) 新建 vhost 配置（不改原站）
3) `nginx -t` + reload
4) `curl -I -H "Host: xhs.hellojoy.top" http://127.0.0.1/`
5) Cloudflare 设置 Flexible 或配置源站证书

## HTTPS Full/Strict 方案（推荐更安全）
当希望全链路 HTTPS（浏览器到 Cloudflare、Cloudflare 到源站）时，需给源站配置证书。

### 方案 A：Cloudflare Origin Certificate（推荐）
优点：证书只在 Cloudflare 和源站之间使用，签发快，不依赖公网 80/443 的验证。

1) Cloudflare → SSL/TLS → Origin Server → Create Certificate  
   - Hostnames：`xhs.hellojoy.top`  
   - Key type：RSA  
   - Validity：默认
   - 生成后保存 **证书** 和 **私钥**

2) 服务器保存证书
```bash
mkdir -p /www/server/panel/vhost/cert/xhs.hellojoy.top
cat >/www/server/panel/vhost/cert/xhs.hellojoy.top/fullchain.pem <<'PEM'
<把 Cloudflare 证书粘贴到这里>
PEM
cat >/www/server/panel/vhost/cert/xhs.hellojoy.top/privkey.pem <<'PEM'
<把 Cloudflare 私钥粘贴到这里>
PEM
```

3) 配置 Nginx 443（示例）
```nginx
server {
    listen 80;
    server_name xhs.hellojoy.top;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name xhs.hellojoy.top;

    ssl_certificate     /www/server/panel/vhost/cert/xhs.hellojoy.top/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/xhs.hellojoy.top/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

4) 重载 Nginx 并切换模式
```bash
nginx -t
/www/server/nginx/sbin/nginx -s reload
```

5) Cloudflare 设置
- SSL/TLS → Overview → 选择 **Full (Strict)**

### 方案 B：Let’s Encrypt（源站直接签发）
优点：浏览器也可以直接信任；缺点：需要公网 80/443 验证。

1) 使用宝塔或 `certbot` 申请证书  
2) 按证书路径配置 Nginx 443  
3) Cloudflare 设置 Full (Strict)
