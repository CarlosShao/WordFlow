# AI 模块（AI Module）

服务端 LLM 代理层。所有 AI 调用走服务端，密钥不暴露给前端。支持 OpenAI 兼容 API（DeepSeek、Moonshot、OpenAI 等）。

## 职责

- 翻译服务（中英互译）
- 词汇解释（词性、搭配、记忆法）
- AI 对话（学习助手）
- AI 生成练习题（补充本地规则生成的题目）

## 路由

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/v1/ai/translate | 翻译 |
| POST | /api/v1/ai/explain | 词汇解释 |
| POST | /api/v1/ai/chat | AI 对话 |
| POST | /api/v1/ai/generate-question | AI 生成练习题 |

## 配置

环境变量：
- `LLM_BASE_URL` — API 端点（如 `https://api.deepseek.com/v1`）
- `LLM_API_KEY` — API 密钥
- `LLM_MODEL` — 模型名（如 `deepseek-chat`）

## 契约

- 所有接口需认证
- 服务端代理调用，密钥不进日志
- 超时 30s，失败返回 502 BAD_GATEWAY
- 翻译结果只返回译文，不附加解释
