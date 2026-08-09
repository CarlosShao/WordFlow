# 后端工程规范（src/server）

后端服务的技术规范文档，AI Agent 和开发者共同遵守。

## 技术栈

| 类别 | 选型 | 版本 |
|------|------|------|
| 运行时 | Node.js | >= 20 |
| 框架 | Fastify | 5.x |
| 语言 | TypeScript | 5.x（strict 模式） |
| ORM | Prisma | 6.x |
| 数据库 | PostgreSQL | 16 |
| 缓存 | Redis | 7（ioredis 客户端） |
| 对象存储 | MinIO | 最新 |
| 校验 | Zod | 3.x |
| 日志 | Pino | 9.x |
| 测试 | Vitest | 2.x |

## 目录结构

```
src/server/
├── package.json          # 依赖 + 脚本
├── tsconfig.json         # TypeScript 配置
├── vitest.config.ts      # 测试配置
├── prisma/
│   └── schema.prisma     # 数据库模型
└── src/
    ├── index.ts          # Fastify 入口 + 启动
    ├── config/
    │   └── index.ts      # Zod 环境变量校验
    ├── common/           # 公共基础设施
    │   ├── prisma.ts     # Prisma 单例
    │   ├── redis.ts      # Redis 单例
    │   ├── minio.ts      # MinIO 客户端
    │   ├── errors.ts     # AppError + errorHandler
    │   └── logger.ts     # Pino 实例
    ├── modules/          # 业务模块（每个一个目录）
    │   ├── content/      # 内容模块
    │   ├── vocabulary/   # 词汇模块
    │   ├── practice/     # 练习模块
    │   ├── mistakes/     # 错题模块
    │   ├── dashboard/    # 仪表盘模块
    │   └── ai/           # AI 代理层
    └── tests/            # 测试
        ├── mocks/        # 测试 mock
        └── *.test.ts     # 测试文件
```

## 模块约定

每个业务模块：
- `index.ts` — 导出 `xxxRoutes(app: FastifyInstance)` 函数
- `README.md` — 模块职责、路由表、契约说明
- 内部辅助函数（如 crawler、scheduler）按需拆分到同目录文件

路由注册在 `src/index.ts` 的 `buildApp()` 中统一完成。

## 接口规范

- RESTful，URL 版本前缀 `/api/v1/`
- 响应格式：`{ success: boolean, data?: unknown, error?: { type, message, details? }, meta? }`
- 分页响应带 `meta: { page, limit, total, totalPages }`
- 错误类型定义在 `ErrorType` 常量中

## 认证

- JWT Bearer <REDACTED>（access 15min + refresh 7 天）
- `app.authenticate` 中间件注入 `request.user = { id, email }`
- 需认证路由配置 `{ preHandler: [app.authenticate] }`
- GitHub OAuth 回调后签发 JWT

## 用户隔离

- 所有用户数据表都有 `userId` 外键
- 查询必须带 `where: { userId }`，禁止返回其他用户数据
- 更新/删除前验证所有权（findFirst with userId）

## 测试规范

- 单元测试：纯函数直接测试（如 SM-2 算法）
- 路由测试：用 `app.inject()` + mock Prisma，不依赖真实数据库
- Mock 放在 `tests/mocks/` 目录
- 命令：`npm test` 或 `npx vitest run`

## 脚本

- `npm run dev` — tsx watch 热重载
- `npm run build` — tsc 编译
- `npm start` — 运行编译产物
- `npm test` — vitest 运行测试
- `npm run prisma:generate` — 生成 Prisma Client
- `npm run prisma:migrate` — 执行数据库迁移

## 部署依赖

- `docker-compose.yml` 起 PostgreSQL + Redis + MinIO
- 生产用 `DATABASE_URL` 连接云数据库
- MinIO 兼容 S3 API，可替换为 AWS S3

## 安全最佳实践

### 用户隔离（强制）

1. **所有用户数据查询必须带 `userId` 过滤**
   ```typescript
   // ✅ 正确
   prisma.vocabulary.findMany({ where: { userId, ... } })
   prisma.vocabulary.findFirst({ where: { id, userId } })

   // ❌ 错误（缺少 userId 过滤，导致数据泄露）
   prisma.vocabulary.findMany({ where: { id: { in: ids } } })
   ```

2. **更新/删除前必须验证所有权**
   ```typescript
   // ✅ 正确：先 findFirst 验证所有权
   const existing = await prisma.vocabulary.findFirst({ where: { id, userId } })
   if (!existing) throw new AppError('NOT_FOUND', '资源不存在', 404)
   await prisma.vocabulary.delete({ where: { id } })
   ```

3. **批量查询同样需要隔离**
   ```typescript
   // ✅ 正确：通过 vocabularyIds 生成练习时也要带 userId
   prisma.vocabulary.findMany({
     where: { id: { in: vocabIds }, userId },  // userId 必须存在
   })
   ```

### 内容资源所有权

- Content 是共享资源，但创建者拥有修改/删除权限
- 创建时设置 `createdBy: userId`
- 更新/删除前验证 `existing.createdBy === userId`
- `createdBy` 为 null 的遗留内容允许任何人修改（向后兼容）

### 认证中间件

- 需认证路由必须配置 `{ preHandler: [app.authenticate] }`
- 公开路由（如内容列表、内容详情）不配置中间件
- 混合路由（如记录浏览）使用 `request.user?.id` 可选注入

### 输入验证

- 所有 POST/PUT 请求体必须用 Zod `safeParse` 或 `parse` 校验
- 路径参数通过 Prisma 参数化查询天然防护 SQL 注入
- 分页参数用 `z.coerce.number().min(1).max(100)` 限制范围

### 数据完整性

- Prisma schema 外键约束 + `onDelete: Cascade` 保证级联删除
- 唯一约束：`@@unique([userId, word])` 等保证数据一致性
- 数据库枚举（enum）约束状态值，避免无效状态

### 安全清单

- [x] 环境变量不硬编码，全部走 config
- [x] 密钥（JWT_SECRET、API_KEY）不进日志
- [x] 用户输入全部 Zod 校验
- [x] SQL 注入防护（Prisma 参数化查询）
- [x] CORS 白名单限制
- [x] Helmet 启用安全头
- [ ] 限流（生产环境启用 `@fastify/rate-limit`）
- [x] 用户隔离：所有查询带 userId 过滤
- [x] 所有权验证：更新/删除前 findFirst({ id, userId })
- [x] 内容资源：createdBy 字段 + 所有权验证
