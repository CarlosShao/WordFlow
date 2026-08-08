# 仪表盘模块（Dashboard Module）

聚合学习统计数据：今日任务、连续天数、词汇量趋势、复习日历。

## 职责

- 学习概览（今日待复习词汇数、今日已练习数）
- 连续学习天数（streak）
- 词汇掌握度分布
- 近 7/30 天学习热力图

## 路由

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/v1/dashboard/overview | 今日概览 |
| GET | /api/v1/dashboard/streak | 连续天数 |
| GET | /api/v1/dashboard/vocab-growth | 词汇增长趋势 |
| GET | /api/v1/dashboard/heatmap | 学习热力图（日期→次数） |

## 契约

- 所有接口需认证
- 概览数据实时计算（不缓存，数据量小）
- 热力图返回 `{ date: string, count: number }[]`
