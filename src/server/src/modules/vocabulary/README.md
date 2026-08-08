# 词汇模块（Vocabulary Module）

用户词汇表的 CRUD 管理 + 间隔重复（SM-2 简化版）调度。用户从内容中标记生词，系统根据记忆曲线安排复习。

## 职责

- 词汇条目的增删改查（每个用户独立）
- 按用户查询词汇列表（分页 + 搜索 + 掌握度筛选）
- SM-2 简化算法计算下次复习时间
- 复习记录追踪（每次复习的 quality → EF 因子 + interval 更新）

## 路由

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/v1/vocabulary | 当前用户词汇列表（分页、搜索、筛选） |
| GET | /api/v1/vocabulary/due | 当前到期待复习词汇 |
| GET | /api/v1/vocabulary/:id | 单条词汇详情 |
| POST | /api/v1/vocabulary | 添加词汇 |
| PUT | /api/v1/vocabulary/:id | 更新词汇 |
| DELETE | /api/v1/vocabulary/:id | 删除词汇 |
| POST | /api/v1/vocabulary/:id/review | 提交复习结果（quality 0-5） |

## SM-2 简化算法

- 每张卡片有 `efactor`（初始 2.5）、`interval`（天）、`repetitions`
- 复习时传 `quality`（0-5）：
  - quality < 3：reset interval=1, repetitions=0
  - quality >= 3：interval = round(interval * efactor), repetitions++
- efactor 更新：`efactor = max(1.3, efactor + (0.1 - (5-quality)*(0.08 + (5-quality)*0.02)))`
- `nextReviewAt = now + interval * 1 day`

## 契约

- 所有接口需认证（request.user.id）
- userId + word 唯一约束（同一用户不重复添加同一词）
- 复习操作自动更新 efactor / interval / repetitions / nextReviewAt
