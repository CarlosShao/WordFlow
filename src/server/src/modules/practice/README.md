# 练习模块（Practice Module）

从词汇和内容生成练习题、提交作答、自动判分、记录错题。AI 兜底生成题目，前端降级方案由前端处理。

## 职责

- 练习会话的创建 / 列表 / 详情
- 单道题目的 CRUD
- 提交答案 + 判分（选择/填空精确匹配；主观题由 AI 评分）
- 错题自动同步到 Mistake 模块

## 路由

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/v1/practice | 当前用户练习会话列表 |
| GET | /api/v1/practice/:id | 练习会话详情（含题目） |
| POST | /api/v1/practice | 创建练习会话 |
| POST | /api/v1/practice/:id/submit | 提交单个题目答案 |
| POST | /api/v1/practice/:id/complete | 完成会话（统计 + 错题同步） |
| DELETE | /api/v1/practice/:id | 删除练习会话 |

## 创建练习

请求体可指定：
- `vocabularyIds?: string[]` — 指定词汇（不指定则从 due 词汇随机抽）
- `contentId?: string` — 指定内容（生成阅读理解等）
- `questionTypes?: QuestionType[]` — 题型偏好
- `questionCount?: number` — 题目数量（默认 10）

## 题型枚举

- MULTIPLE_CHOICE — 单选
- FILL_BLANK — 填空
| TRANSLATION — 翻译
| LISTENING — 听写

## 判分规则

- MULTIPLE_CHOICE：答案完全一致 → correct
- FILL_BLANK：不区分大小写、去空格后匹配
- TRANSLATION / LISTENING：调用 LLM 评分（0-100），>= 60 视为 correct
- 错题写入 Mistake 模块（upsert，重复答错复习次数 +1）

## 契约

- 错题写入 Mistake 表（prisma.mistake），contentId、vocabularyId 关联
- 会话完成时返回统计：total / correct / wrong / accuracy
- 所有接口需认证
