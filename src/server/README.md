# Server

Backend API service (Fastify + TypeScript ESM).

## Tech

- Node.js 20+
- Fastify 5.x
- TypeScript 5.x (strict)
- Prisma 6.x + PostgreSQL 16
- Redis 7.x (session/cache)
- MinIO (object storage)

## 启动方式（必须用 Docker）

后端 API 必须在 Docker 中启动（dev 环境，端口 3002，tsx watch 热更新）。

```bash
# 在项目根目录启动所有服务（含后端 API）
cd ..
docker compose up -d

# 查看后端日志
docker logs -f wordflow-api
```

- 容器名：`wordflow-api`
- 端口：`3002`
- 环境：`development`（挂载源码，修改自动热更新）
- Dockerfile：`deploy/docker/Dockerfile.api.dev`
- 环境变量：配置在 `docker-compose.yml` 的 `api` 服务中

## Scripts

- `npm run dev` - 仅作参考，实际请用 Docker 启动
- `npm run build` - build for production
- `npm run start` - start production server