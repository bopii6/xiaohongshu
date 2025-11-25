# 腾讯云混元大模型API集成指南

## 🚀 快速开始

### 1. 获取API密钥

1. 访问 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 注册/登录账号
3. 完成实名认证（个人或企业认证）
4. 进入"人工智能" -> "混元大模型"
5. 开通服务并获取密钥：
   - **SecretId** (访问管理密钥ID)
   - **SecretKey** (访问管理密钥)

### 2. 配置环境变量

创建 `.env.local` 文件（不要提交到版本控制）：

```bash
# 复制模板文件
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# 腾讯云混元大模型 API 配置
TENCENT_SECRET_ID=your_actual_secret_id_here
TENCENT_SECRET_KEY=your_actual_secret_key_here
TENCENT_REGION=ap-beijing
TENCENT_MODEL=hunyuan-lite

# 可选配置
TENCENT_TIMEOUT=60000
TENCENT_MAX_RETRIES=3
```

### 3. 重启开发服务器

```bash
npm run dev
```

## 📋 支持的模型

| 模型名称 | 描述 | 价格(元/千tokens) | 适用场景 |
|---------|------|----------------|----------|
| `hunyuan-lite` | 最经济选择 | 0.001 | 日常使用、推荐 |
| `hunyuan-standard` | 标准版本 | 0.004 | 平衡性能 |
| `hunyuan-pro` | 专业版本 | 0.008 | 高质量创作 |
| `hunyuan-turbo` | 快速响应 | 0.012 | 实时应用 |

## 🎯 功能特性

### 1. 智能内容改写
- **润色优化**: 提升文案质量，保持原意
- **扩写丰富**: 增加细节，丰富内容
- **风格转换**: 适配不同写作风格
- **SEO优化**: 提升搜索曝光

### 2. 专业提示词工程
- 小红书平台特色
- 多种改写风格
- 智能标签生成
- 话题建议

### 3. 完整的API服务
- `/api/ai-rewrite` - 内容改写
- 支持多种参数配置
- 错误处理和重试
- 成本计算和监控

## 🔧 使用方式

### 前端调用示例

```javascript
const response = await fetch('/api/ai-rewrite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalTitle: '标题',
    originalContent: '内容',
    style: 'similar', // similar | creative | professional | casual
    productInfo: '产品信息（可选）',
    targetAudience: '目标受众（可选）'
  })
});

const result = await response.json();
console.log(result.data.newContent);
```

### 服务端直接使用

```typescript
import { XiaohongshuService } from '@/lib/hunyuan/xiaohongshu-service';
import { getHunyuanConfig } from '@/lib/hunyuan/env';

const service = new XiaohongshuService(config);

const result = await service.rewriteContent({
  content: '需要改写的内容',
  type: 'polish',
  style: '生活记录'
});
```

## 📊 成本控制

### 预估费用
- **短内容润色**: 约 ¥0.001 - ¥0.004
- **中等扩写**: 约 ¥0.004 - ¥0.008
- **长文本处理**: 约 ¥0.008 - ¥0.012

### 优化建议
1. 使用 `hunyuan-lite` 模型降低成本
2. 合理设置参数长度
3. 批量处理以提高效率
4. 监控使用量避免超预算

## ⚠️ 注意事项

### 1. API限制
- 每分钟请求次数限制
- 单日总Token限制
- 并发连接数限制

### 2. 错误处理
- 网络超时自动重试
- 速率限制指数退避
- 友好的错误提示

### 3. 安全考虑
- API密钥安全存储
- 服务端调用，避免暴露
- 输入内容过滤

## 🐛 故障排除

### 常见错误

1. **环境变量未设置**
   ```
   Error: TENCENT_SECRET_ID 环境变量未设置
   ```
   解决：检查 `.env.local` 文件配置

2. **API密钥无效**
   ```
   Error: 腾讯云API错误: UnauthorizedOperation
   ```
   解决：检查SecretId和SecretKey是否正确

3. **服务不可用**
   ```
   Error: AI改写服务暂时不可用
   ```
   解决：检查网络连接和API服务状态

### 调试模式

开发环境下会输出详细日志：
```bash
# 查看API调用详情
console.log('调用腾讯云混元改写服务:', {...})

# 查看成本和耗时
console.log('腾讯云混元改写完成:', {
  model, cost, totalTokens
});
```

## 📈 性能优化

### 1. 模型选择策略
```typescript
// 根据任务类型自动选择最优模型
function selectOptimalModel(type: RewriteType): HunyuanModel {
  switch (type) {
    case 'expand': return 'hunyuan-standard';
    case 'shorten': return 'hunyuan-lite';
    default: return 'hunyuan-lite';
  }
}
```

### 2. 缓存机制
- 相同内容改写结果缓存
- 标题建议缓存
- 用户偏好缓存

### 3. 批量处理
- 并发限制为3个请求
- 指数退避避免限流
- 错误隔离保证稳定性

## 🔗 相关链接

- [腾讯云控制台](https://console.cloud.tencent.com/)
- [混元大模型文档](https://cloud.tencent.com/document/product/1729)
- [API密钥管理](https://console.cloud.tencent.com/cam/capi)

---

## 📝 开发说明

本集成提供了完整的TypeScript类型支持，包括：
- API请求/响应类型
- 模型配置类型
- 错误处理类型
- 使用统计类型

所有代码都经过类型检查，确保开发时的类型安全和代码提示。

## 🆕 对比百度文心一言

| 特性 | 腾讯云混元 | 百度文心一言 |
|------|-------------|-------------|
| **价格** | 更便宜（¥0.001/千token） | 较贵（¥0.008/千token） |
| **中文理解** | 腾讯生态优化 | 专业中文模型 |
| **免费额度** | 100万-1000万Token | 有限免费试用 |
| **稳定性** | 企业级服务 | 一般 |
| **社区支持** | 相对较少 | 较好 |
| **接入难度** | 中等 | 简单 |

**推荐选择腾讯云混元的原因**：
1. 成本更低，性价比更高
2. 免费额度更大
3. 腾讯生态系统完善
4. 社交媒体内容理解强