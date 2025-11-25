# AI 服务集成指南（智谱大模型版）

项目的主要 AI 能力（改写/生成等）已经切换为 **智谱 AI（BigModel）**，并保留 **腾讯云 OCR** 作为图片文字识别方案。本指南帮助你完成本地或线上部署所需的配置。

---

## 1. 为什么选择智谱

- **中文内容效果好**：GLM 系列在中文改写、创作和结构化输出方面表现稳定。
- **模型选择丰富**：`glm-4`、`glm-4-air`、`glm-4-flash` 等可按性能/成本自由切换。
- **JWT 鉴权**：与项目中的 `ZhipuClient` 对接省心，无需额外 SDK。
- **兼容现有 API**：`AIService` 默认即为智谱实现，前端无需改动。

腾讯云混元依旧可用于特定场景（如多厂商对比、备用通道），而 OCR 接口继续沿用腾讯方案。

---

## 2. 获取 API Key

1. 注册并登录 [智谱 AI 开放平台](https://open.bigmodel.cn/)。
2. 在控制台创建 **API Key**，注意保存 `api_key` 与 `secret` 两段式凭证。
3. 若需要更高配额，可在平台申请或升级套餐。
4. （可选）在腾讯云控制台准备 `SecretId/SecretKey`，仅用于 OCR 或混元备用。

---

## 3. 环境变量配置

复制 `.env.example` 为 `.env.local`，并填写：

```env
# 智谱大模型
ZHIPU_API_KEY=xxx.xxx   # 形如 id.secret 的组合
ZHIPU_MODEL=glm-4-flash # 可换 glm-4 / glm-4-air 等
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_TIMEOUT=60000
ZHIPU_MAX_RETRIES=3

# （可选）腾讯云混元 + OCR
TENCENT_SECRET_ID=xxx
TENCENT_SECRET_KEY=xxx
TENCENT_REGION=ap-beijing
TENCENT_MODEL=hunyuan-lite
TENCENT_TIMEOUT=60000
TENCENT_MAX_RETRIES=3
TENCENT_OCR_ACTION=GeneralAccurateOCR

# 应用参数
DEFAULT_AI_PROVIDER=zhipu
API_MAX_RETRIES=3
API_TIMEOUT_MS=30000
```

`.env.local` 不参与版本控制，部署时请在对应平台（Vercel、Render、自建服务器等）的环境变量里配置同名字段。

---

## 4. 常用模型与建议

| 模型 | 特点 | 适用场景 |
|------|------|----------|
| `glm-4-flash` | 最快的通用模型，成本低 | 默认改写、批量创作 |
| `glm-4-air` | 兼顾速度与质量 | 品牌内容、直播脚本 |
| `glm-4` | 高质量大模型 | 高端策划、深度文章 |
| `glm-4-long` | 长上下文支持 | 大纲、长文档整理 |

如需 token 价格，可参考智谱官网定价。`src/lib/zhipu/config.ts` 也预留了模型与价格映射，方便前端展示。

OCR 依旧由腾讯云提供，建议优先使用 `GeneralAccurateOCR`，图片清晰时也可改用 `GeneralBasicOCR` 获得更低延迟。

---

## 5. 服务端 API

| 功能 | Endpoint | 说明 |
|------|----------|------|
| 通用文本生成 | `POST /api/ai/generate` | 通过 `AIService` 默认走智谱 |
| 流式生成 | `POST /api/ai/generate/stream` | 同上，返回 `ReadableStream` |
| 小红书内容改写（OCR→改写） | `POST /api/ai-rewrite` | 直接调用智谱改写策略 |
| 组合内容生成 | `POST /api/ai/generate-content` | 根据类型拼装提示词 |
| OCR 上传识别 | `POST /api/ocr-upload` | 依赖腾讯云 OCR |

示例：调用改写接口

```bash
curl -X POST http://localhost:3000/api/ai-rewrite \
  -H "Content-Type: application/json" \
  -d '{
        "originalTitle": "夏日补水面膜",
        "originalContent": "...",
        "style": "creative"
      }'
```

---

## 6. 调试与排错

- **JWT 生成失败**：确认 `ZHIPU_API_KEY` 分隔格式 `id.secret` 无误，且服务器时间正确。
- **响应格式不规范**：`/api/ai-rewrite` 已做 JSON 解析与兜底处理，如仍有问题可查看服务器日志。
- **429/限流**：降低并发或在智谱控制台申请更高 QPS；必要时切换备用模型。
- **OCR 报错**：检查 `TENCENT_SECRET_ID/KEY`、OCR Action 是否已开通，或图片大小是否超过 10MB。

---

## 7. 推荐实践

1. **指令规范**：在 `system` 提示中明确风格、格式要求，可减少后处理逻辑。
2. **结果校验**：`/api/ai-rewrite` 提供 JSON 结构解析，若自定义接口，也建议先校验模型输出再落库。
3. **备用通道**：`AIService` 仍保留腾讯混元 Provider，必要时可通过请求参数切换。
4. **日志与成本**：智谱返回的 `usage` 中包含 token 统计，可用于埋点或费用估算。

如需进一步扩展，可参考 `src/lib/zhipu`（智谱客户端）、`src/lib/ai`（Provider 抽象）以及 `src/lib/tencent/ocr-client.ts`（OCR 接入）。
