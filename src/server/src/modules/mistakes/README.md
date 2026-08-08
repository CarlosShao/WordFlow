# 错题模块（Mistakes Module）

用户答错的题目自动汇聚到这里。提供错题复习、掌握度流转、统计。

## 职责

- 错题的自动写入（由练习模块同步）
- 错题列表查询 + 分页
- 复习错题（标记本次答对/答错）
- 掌握度流转：NOT_REVIEWED → REVIEWING → MASTERED
- 错题统计

## 路由

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/v1/mistakes | 错题列表（分页、筛选、排序） |
| GET | /api/v1/mistakes/stats | 错题统计 |
| GET | /api/v1/mistakes/:id | 单条错题详情 |
| POST | /api/v1/mistakes/:id/review | 复习错题（传 correct: bool） |
| DELETE | /api/v1/mistakes/:id | 删除错题 |

## 掌握度流转

- NOT_REVIEWED — 新答错，未复习
- REVIEWING — 复习中（答对 1 次但未完全掌握）
- MASTERED — 连续答对 3 次，完全掌握

复习时：
- 答对 → reviewCount++，若 reviewCount >= 3 则 MASTERED，否则 REVIEWING
- 答错 → 重置为 NOT_REVIEWED，reviewCount 不变

## 契约

- userId + vocabularyId 唯一约束（同一用户的同一词汇只保留一条错题）
- 错题数据由练习模块 upsert 写入，本模块只读 + 复习更新
- 所有接口需认证
