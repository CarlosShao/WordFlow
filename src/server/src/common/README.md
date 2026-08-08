# 公共基础设施层

这一层是后端所有模块共享的底层能力：Prisma（PostgreSQL ORM）、Redis 连接、MinIO 对象存储客户端。每个模块都从这儿拿实例，不自己管理连接。

## 文件

- `prisma.ts` — Prisma 单例。`getPrisma()` 返回全局共享的 `PrismaClient`，进程退出时调 `disconnectPrisma()`。
- `redis.ts` — ioredis 单例。`getRedis()` 返回共享 Redis 客户端，自带重连策略；进程退出时调 `disconnectRedis()`。
- `minio.ts` — MinIO 客户端单例 + `ensureBucket` + `buildUserKey`。`getMinio()` 返回共享客户端；`buildUserKey(userId, filename)` 生成 `${userId}/${timestamp}-${filename}` 的对象存储键。

## 怎么接入

启动 Fastify 时调用 `getPrisma()` / `getRedis()` / `getMinio()`，关闭时断开。其余模块只 import 这些 getter，不直接 new 连接。

## 部署

依赖 PostgreSQL / Redis / MinIO，见根目录 `docker-compose.yml`。本地起全套：

```bash
docker compose up -d
```
