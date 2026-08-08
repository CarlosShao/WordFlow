# 内容模块（Content Module）

英语学习内容的核心模块。统一管理三类内容：ARTICLE / VIDEO / PODCAST。负责内容的 CRUD、列表查询、用户浏览记录、收藏。爬取调度器把外部数据写入这里，前端从这里读取展示。

## 职责

- 内容的增删改查
- 列表分页 + 类型/难度/关键词筛选
- 用户浏览记录（viewCount + UserContentInteraction）
- 用户收藏/取消收藏
- 内容去重（source + sourceUrl 唯一约束）

## 路由

| Method | Path | 鉴权 | 说明 |
|--------|------|------|------|
| GET | /api/v1/content | 公开 | 内容列表（分页、筛选） |
| GET | /api/v1/content/:id | 公开 | 单条内容详情 |
| POST | /api/v1/content | 需认证 | 创建内容 |
| PUT | /api/v1/content/:id | 需认证 | 更新内容 |
| DELETE | /api/v1/content/:id | 需认证 | 删除内容 |
| POST | /api/v1/content/:id/view | 可选 | 记录浏览（viewCount++） |
| POST | /api/v1/content/:id/favorite | 需认证 | 收藏/取消收藏 |
| GET | /api/v1/content/favorites/me | 需认证 | 当前用户收藏列表 |

## 契约

- 请求体用 Zod 校验，校验失败返回 400 VALIDATION_ERROR
- 内容不存在返回 404 NOT_FOUND
- 重复创建返回 409 DUPLICATE
- 所有响应遵循 `{ success, data, error?, meta? }` 格式
