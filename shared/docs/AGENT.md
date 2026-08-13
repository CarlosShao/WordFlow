# WordFlow Agent Handbook

> 本文档为 AI Agent 开发指南，采用紧凑格式，节省 token。

---

## 1. Project Identity

```
name: wordflow
type: monorepo (web/server/desktop)
maturity: mvp
target: chinese english learners
```

---

## 2. Tech Stack

### Backend
- Runtime: Node.js 20+
- Framework: Fastify 5.x
- Language: TypeScript 5.x (strict: true)
- ORM: Prisma 6.x
- DB: PostgreSQL 16
- Cache/Queue: Redis 7.x (BullMQ)
- Storage: MinIO (S3-compatible)
- Auth: JWT (access + refresh) + bcrypt + GitHub OAuth
- Real-time: SSE
- Docs: Swagger (@fastify/swagger)
- Test: Vitest
- Log: Pino

### Frontend
- Framework: Vue 3.5 + TypeScript 6.x
- Build: Vite 8.x
- Router: Vue Router 4.x (history mode)
- State: Pinia 4.x
- HTTP: Axios
- UI: Custom components + CSS variables (theming)

### Desktop (Tauri - Full-Featured)
```
provide:
  - System tray (minimize to tray, not exit)
  - Global shortcuts (start/pause study session)
  - Local storage (offline cache)
  - Native notifications (study reminders, streak alerts)
  - Memory history mode (for Tauri compatibility)
  - Window management (always-on-top, transparency)
consume:
  - Web frontend (wrapped)
  - Backend API (when online)
```

---

## 3. Project Structure

```
WordFlow/
├── src/
│   ├── web/          # Vue frontend
│   │   ├── src/
│   │   │   ├── api/          # HTTP clients
│   │   │   ├── components/   # Reusable components
│   │   │   ├── composables/  # Vue composables
│   │   │   ├── router/       # Vue Router config
│   │   │   ├── stores/       # Pinia stores
│   │   │   ├── types/        # TypeScript types
│   │   │   └── views/        # Page components
│   │   └── package.json
│   ├── server/       # Fastify backend
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   │   ├── auth/         # 注册/登录/刷新/登出/GitHub OAuth
│   │   │   │   ├── content/      # 语料内容 CRUD
│   │   │   │   ├── crawler/      # 爬虫（strategies/ + translator + scheduler）
│   │   │   │   ├── ai/           # AI 配置/连线测试
│   │   │   │   ├── ai-processing/# AI 处理流水线（词汇提取、题目生成）
│   │   │   │   ├── vocabulary/   # 词汇库
│   │   │   │   ├── practice/     # 练习会话/题目/提交
│   │   │   │   ├── mistakes/     # 错题本
│   │   │   │   ├── dashboard/    # 学习统计
│   │   │   │   └── upload/       # 文件上传(MinIO)
│   │   │   ├── common/       # Shared utilities (errors/logger/minio/prisma/redis)
│   │   │   ├── config/       # Config (index.ts)
│   │   │   └── main.ts       # Entry point
│   │   └── package.json
│   └── desktop/      # Tauri desktop (full-featured)
├── shared/           # Shared types/utils
├── docs/             # Documentation
├── docker-compose.yml
└── .docker/volumes/  # Docker data (gitignored)
```

---

## 4. Key Design Decisions

### 4.1 Monorepo
- pnpm workspace
- Shared types in `shared/` package
- Independent versioning per app

### 4.2 API Design
- RESTful + URL versioning (`/api/v1/`)
- Request/response: JSON
- Error format: `{ success: false, error: { code, message } }`
- Success format: `{ success: true, data: T }`
- Pagination: `?page=1&limit=20` → `{ data, total, page, limit }`
- Datetime: ISO 8601 (UTC)

### 4.3 Auth Flow
- Access token: 15 min (memory)
- Refresh token: 7 days (Redis whitelist)
- Auto-refresh on 401
- Logout: remove both tokens + Redis cleanup

### 4.4 User Isolation
- All user data tables: `userId` foreign key
- Content table: public (no userId)
- User-content interaction: separate table
- API queries: always filter by `userId` from JWT

### 4.5 Database
- Soft delete: `deletedAt` timestamp
- Timestamps: `timestamptz` (UTC)
- JSON fields: `jsonb` for queryability
- Indexes: all FK + query fields
- Unique constraints: `(userId, word)`, `(userId, questionId)`, `email`, `githubId`

### 4.6 File Storage
- MinIO bucket: `wordflow-uploads`
- Key format: `${userId}/${timestamp}-${filename}`
- Size limit: 50MB per file
- Type whitelist: images, audio, video

### 4.7 Caching (Redis)
- Content list: 5 min TTL
- User data: no cache (real-time)
- Cache invalidation: on write
- Penalty: null cache for misses

### 4.8 Queue (BullMQ)
- Crawler jobs: hourly (news), daily (video/podcast)
- AI jobs: on-demand
- Retry: 3 attempts, exponential backoff
- Dead letter: log + manual review

### 4.9 Crawler Architecture
- Strategy pattern: `interface CrawlStrategy { crawl(source): Promise<CrawlItem[]> }`（见 `src/server/src/modules/crawler/strategies/`）
- Strategies: RSS, TED, VOA, YouTube, Podcast, Web, Puppeteer, Twitter
- Dedup: `@@unique([source, sourceUrl])`
- Translation: 批量 LLM 翻译（`translator.ts`），双语 `segments`（en/zh）
- Rate limit: per-source configurable

---

## 5. Module Contracts

### Auth Module
```
provide:
  - verifyToken(token) -> { userId, username }
  - JWT middleware for Fastify
  - GitHub OAuth flow
```

### Content Module
```
provide:
  - GET /api/v1/contents?page=&limit=&type=&source=&search=
  - GET /api/v1/contents/:id
  - GET /api/v1/contents/recommendations
  - POST /api/v1/contents (manual add)
consume:
  - Auth: userId from JWT
```

### Vocabulary Module
```
provide:
  - CRUD /api/v1/vocabularies
  - GET /api/v1/vocabularies/review
  - Spaced repetition: SM-2 algorithm
consume:
  - Auth: userId filter
```

### Practice Module
```
provide:
  - GET /api/v1/practice/questions
  - POST /api/v1/practice/submit
consume:
  - Content: get content for questions
  - AI: generate questions
  - Auth: userId
```

### Mistakes Module
```
provide:
  - CRUD /api/v1/mistakes
  - PATCH /api/v1/mistakes/:id/mastery
consume:
  - Practice: record mistakes
  - Auth: userId
```

### AI Module
```
provide:
  - OpenAI-compatible abstraction layer
  - Functions: generateQuestions, analyzeError, contextualDefinition, weeklyPlan, vocabularyStory, assessDifficulty
  - SSE streaming support
```

### Dashboard Module
```
provide:
  - GET /api/v1/dashboard/stats
  - GET /api/v1/dashboard/heatmap
  - GET /api/v1/dashboard/today
consume:
  - Vocabulary, Practice, Mistakes stats
```

---

## 6. Development Conventions

### 6.1 Code Style
- TypeScript strict: true
- No `any` types
- File naming: kebab-case for files, camelCase for variables
- Function length: < 50 lines
- File length: < 300 lines

### 6.2 Naming
- API paths: plural nouns (`/contents`, `/vocabularies`)
- Events: `on[Action]` (onClick, onSubmit)
- Handlers: `handle[Event]` (handleClick, handleSubmit)
- Types: PascalCase (ContentItem, UserProfile)

### 6.3 Error Handling
- Global error handler (Fastify)
- Business errors: `AppError` class with code
- Validation errors: Fastify JSON Schema
- External service errors: wrap with context

### 6.4 Logging
- Pino structured logs
- Levels: debug (dev), info (prod), warn, error
- Filter: password, token, authorization
- Context: requestId, userId

### 6.5 Testing
- Unit tests: Vitest + supertest
- Integration tests: test DB (docker-compose.test.yml)
- Mock: external services (AI, GitHub, MinIO)
- Coverage: 80% minimum

---

## 7. Environment Variables

```env
# Server
NODE_ENV=development
# 开发环境端口 3002（Docker 启动）；生产 3001
PORT=3002
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/wordflow

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=wordflow-uploads

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3002/api/v1/auth/github/callback

# AI
AI_API_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=
AI_MODEL=deepseek-chat

# Frontend
VITE_API_BASE_URL=http://localhost:3002/api/v1
```

---

## 8. Docker Compose Services

| Service | Container | Port | Depends On |
|---------|-----------|------|------------|
| api（后端） | `wordflow-api` | 3002 | postgres, redis, minio |
| postgres (PostgreSQL 16) | `wordflow-postgres` | 5432 | - |
| redis (Redis 7) | `wordflow-redis` | 6379 | - |
| minio | `wordflow-minio` | 9000/9001 | - |

> 无 nginx / adminer 服务。后端必须在 Docker 中启动（dev 环境，端口 3002，热更新）。

Data volumes: named volumes（postgres_data / redis_data / minio_data / wordflow_node_modules）

---

## 9. Security Checklist

- [ ] Passwords bcrypt hashed (cost factor 12)
- [ ] JWT tokens signed + verified
- [ ] Refresh tokens in Redis whitelist
- [ ] SQL injection: Prisma parameterized queries
- [ ] XSS: Vue escaping + sanitize AI output
- [ ] CORS: whitelist in production
- [ ] Rate limiting: per-user
- [ ] Request size limits
- [ ] Sensitive data: logged filtered
- [ ] File uploads: type + size validation

---

## 10. Common Patterns

### 10.1 Create Endpoint
```typescript
// 1. Define schema
const schema = {
  body: Type.Object({ ... }),
  response: { 200: Type.Object({ ... }) }
}

// 2. Handler
fastify.post('/resource', { schema }, async (req, reply) => {
  const userId = req.user.userId  // from JWT middleware
  const data = await service.create(userId, req.body)
  return { success: true, data }
})
```

### 10.2 Database Query
```typescript
// Always include userId filter
const items = await prisma.content.findMany({
  where: { userId, deletedAt: null },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
})
```

### 10.3 Error Handling
```typescript
if (!item) {
  throw new AppError('NOT_FOUND', 'Content not found', 404)
}
```

---

## 11. Extending the System

### 11.1 New Module
1. Create `server/src/modules/[name]/`
2. Define routes, service, types
3. Register in `main.ts`
4. Add tests
5. Update AGENT.md

### 11.2 New API
1. Define JSON Schema
2. Add route handler
3. Implement service layer
4. Add tests
6. Update AGENT.md

### 11.3 New Frontend Page
1. Create `web/src/views/[Name]Page.vue`
2. Add route in `router/index.ts`
3. Create API client in `api/[name].ts`
4. Replace mock with real API
5. Update USER_MANUAL.md

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Port already in use | `lsof -i :3002` then kill |
| DB connection failed | Check `DATABASE_URL`, ensure db container healthy |
| Prisma client out of sync | `npx prisma generate` |
| Migration failed | `npx prisma migrate resolve` |
| Redis connection failed | Check `REDIS_URL`, ensure redis container running |
| MinIO bucket missing | Check bucket auto-create on startup |

---

*Last updated: 2026-08-11*
