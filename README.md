# English Learner Project

Multi-platform English learning application.

## Structure

```
src/
├── web/        ← Web frontend (Vue 3 + Vite)
├── desktop/    ← Tauri desktop shell
└── server/     ← Backend API service

shared/
├── assets/     ← Shared images, icons
└── docs/       ← Project documentation
```

## Development

**基础设施 + 后端（Docker，推荐）：**
```bash
# 启动所有服务（PostgreSQL / Redis / MinIO / 后端 API）
docker compose up -d

# 查看后端日志
docker logs -f wordflow-api

# 停止服务
docker compose down
```
> 后端 API 必须在 Docker 中启动（dev 环境，端口 3002，热更新）。
> 前端由用户自行启动。

**Web:**
```bash
cd src/web
npm install
npm run dev
```

**Desktop:**
```bash
cd src/desktop
npm install
npm run tauri dev
```

## Build

**Web production:**
```bash
cd src/web
npm run build
```

**Desktop production:**
```bash
cd src/desktop
npm run tauri build
```
