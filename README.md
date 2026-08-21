# WordFlow

> 多平台英语学习应用 —— 把真实语料（视频字幕、播客、RSS、词典、真题）变成可检索、可精听、可练习的学习资料。

WordFlow 是一个面向英语学习者的一体化内容平台。后端通过爬虫与云原生 AI 管线抓取并清洗多源内容（B 站 / YouTube 视频、播客、RSS、词典、雅思 / 托福真题），进行双语字幕对齐、AI 翻译与词汇抽取；前端（Vue 3）提供内容浏览、字幕精听、收藏、按难度 / 来源分组检索等学习体验。同时支持 Web 与桌面（Tauri）两种形态。

## 功能特性

- 多源内容聚合：视频（B 站 / YouTube）、播客、RSS 文章、词典词条、雅思 / 托福真题。
- 双语字幕精听：基于真实时间戳的字幕段落，支持逐句跳转、原文 / 译文对照。
- AI 处理管线：翻译、摘要、词汇抽取，通过可配置的 AI Provider（agnes 主力 + stepfun 兜底，OpenAI 兼容协议）。
- 内容检索：按标题、摘要、全文（原文 + 译文）关键字的模糊搜索，按来源 / 难度 / 分类分组聚合。
- 用户系统：GitHub OAuth 登录、JWT 鉴权、收藏夹、学习设置。
- 对象存储：MinIO 统一托管媒体与上传资源。
- 云原生：支持 CNB 云原生开发环境与 Docker Compose 本地一键启动。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vite 8 + Pinia + Vue Router + PixiJS（可视化） |
| 后端 API | Fastify 5（TypeScript, ESM）+ Zod 校验 + Swagger 文档 |
| 数据库 | PostgreSQL 16 + Prisma 6（迁移 + 类型安全客户端） |
| 缓存 | Redis 7（ioredis） |
| 对象存储 | MinIO（S3 兼容） |
| 桌面壳 | Tauri |
| AI | OpenAI 兼容协议（agnes / stepfun），本地 faster-whisper 转写 |

## 目录结构

```
WordFlow/
├── src/
│   ├── web/            ← Web 前端 (Vue 3 + Vite)
│   │   └── src/        ← api / components / stores / views / composables ...
│   ├── desktop/        ← Tauri 桌面壳
│   └── server/         ← 后端 API 服务 (Fastify + Prisma)
│       ├── src/
│       │   ├── index.ts            ← 入口
│       │   ├── config/             ← 环境变量与配置
│       │   ├── common/             ← 错误、MinIO 等公共工具
│       │   └── modules/            ← 业务模块
│       │       ├── ai/             ← AI Provider 配置 (agnes/stepfun)
│       │       ├── ai-processing/  ← 翻译/摘要/词汇抽取管线
│       │       ├── auth/           ← GitHub OAuth + JWT
│       │       ├── content/        ← 内容列表/检索 API
│       │       ├── crawler/        ← 爬虫(RSS/清洗/翻译/B站字幕)
│       │       ├── dictionary/     ← 词典词条爬取
│       │       ├── exam/           ← 雅思/托福真题
│       │       ├── media/          ← 媒体/字幕处理
│       │       ├── mistakes/       ← 错题本
│       │       ├── practice/       ← 练习
│       │       ├── upload/         ← 上传
│       │       └── vocabulary/     ← 词汇
│       └── prisma/      ← schema.prisma + migrations
├── shared/
│   ├── assets/         ← 共享图片、图标
│   └── docs/           ← 项目文档 (research/ 调研报告)
├── scripts/            ← 长期维护脚本 (whisper 转写、字幕回填等)
├── deploy/             ← Dockerfile / 部署配置
└── docker-compose.yml  ← 本地一体化启动
```

## 快速开始（本地 Docker）

后端 API 必须在 Docker 中启动（dev 环境端口 3002，源码热更新挂载）。前端由用户自行启动。

```bash
# 1. 复制并填写后端环境变量（AI key、Bilibili cookie 等）
cp src/server/.env.example src/server/.env

# 2. 启动所有服务（PostgreSQL / Redis / MinIO / 后端 API）
docker compose up -d

# 3. 首次初始化数据库迁移
docker exec -it wordflow-api npx prisma migrate deploy

# 4. 查看后端日志
docker logs -f wordflow-api
```

> 中间件（postgres / redis / minio）已配置 `restart: unless-stopped`，Docker 故障重启后会自愈，避免"连不上 DB 导致 API 崩溃"。

## 前端开发

```bash
# Web
cd src/web
npm install
npm run dev      # http://localhost:5173

# 桌面 (Tauri)
cd src/desktop
npm install
npm run tauri dev
```

## 构建

```bash
# Web 生产构建
cd src/web && npm run build

# 桌面生产构建
cd src/desktop && npm run tauri build
```

## 配置说明

后端配置集中在 `docker-compose.yml`（dev）与 `src/server/.env`（本地运行）。关键项：

- `DATABASE_URL` / `REDIS_URL` / `MINIO_*`：中间件连接。
- `JWT_SECRET` / `JWT_REFRESH_SECRET`：生产环境务必替换为 `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` 生成的强密钥。
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`：GitHub OAuth App，回调 `http://localhost:3002/api/v1/auth/github/callback`。
- `AI_API_BASE_URL` / `AI_API_KEY` / `AI_MODEL`：DB 不可用时的 fallback；生产主配置在 `ai_providers` 数据库表（agnes 优先级 10，stepfun 20）。
- `BILIBILI_COOKIE` / `BILIBILI_SESSDATA`：解锁 B 站 CC 字幕与 1080P+ 画质（无 SESSDATA 仅 480P/360P）。
- `CORS_ORIGIN`：前端地址（默认 `http://localhost:5173`）。

### 字幕与转写

- 视频文本来源：本地 faster-whisper GPU 转写（Pascal 显卡用 `int8` compute type）或 B 站官方字幕 API；**绝不用文本 LLM 替代 ASR**。
- 字幕时间戳：DB 统一存毫秒。
- 相关脚本见 `scripts/`（`whisper_podcast_backfill.py`、`backfill_bilibili_segments.ts` 等）。

## Git 协作规范

- 远程：`github`（GitHub）与 `cnb`（CNB，云原生开发）双端。任何本地提交后必须**同时 push 到 github 与 cnb**。
- 分支策略：仅在 `dev` 分支开发与修改代码，**不在 `main` 上直接改动**。
- 改代码前先从双端 pull 同步（`git pull github dev` + `git pull cnb dev`），尤其 CNB 云环境可能有改动，避免版本不一致。
- 仓库排除：大二进制与资源（`DELIVERY/` 数据库备份、`*.mp3`、`*.dump`、`*.pdf`、真题资源）不进 Git；Prisma 迁移 `src/server/prisma/migrations/**` 是源码，必须保留。

## 许可证

私有项目，未经授权请勿外传。
