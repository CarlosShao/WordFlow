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

## 安全清单

- [ ] 环境变量不硬编码，全部走 config
- [ ] 密钥（JWT_SECRET、API_KEY）不进日志
- [ ] 用户输入全部 Zod 校验
- [ ] SQL 注入防护（Prisma 参数化查询）
- [ ] CORS 白名单限制
- [ ] Helmet 启用安全头
- [ ] 限流（生产环境启用 `@fastify/rate-limit`）
