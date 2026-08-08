# WordFlow PRD — 英语学习应用

> 版本: v0.1 (MVP 定义) · 状态: 草案 · 最后更新: 2026-08-08

---

## 1. 项目定位

### 一句话

面向个人用户的**英语学习应用** — 通过真实英文内容（文章/视频/播客）驱动词汇、阅读、听力、练习的闭环学习体验。

### 解决什么问题

| 现状痛点 | 我们的解法 |
|---|---|
| 单词书背了忘、忘了背 | 间隔重复（SRS）调度复习，科学对抗遗忘 |
| 教材内容无聊，学不下去 | 真实 BBC/TED/YouTube 内容当教材，兴趣驱动 |
| 刷题没人讲解，错了就过了 | AI 逐道分析错误，推相似题巩固 |
| 学习记录散落各处 | 一套系统追踪进度、词汇量、薄弱点 |

### 目标用户

**个人用户（1-3 人）**。产品做给自己用，设计决策全部围绕"一个人坚持用下去"展开。

---

## 2. 当前状态

### 2.1 已就绪（Web 前端）

| 模块 | 完成度 | 说明 |
|---|---|---|
| 仪表盘 | ✅ 完整 | 统计卡 / 热力图 / 词汇增长图 / 推荐 / 周报 |
| 内容发现 | ✅ 完整 | 类型/分类/难度筛选 / 卡片网格 |
| 内容详情 | ✅ 完整 | 文章/视频/播客三种视图，分段阅读，WordSelector |
| 词汇本 | ✅ 完整 | 词库列表 / 闪卡三档反馈 / 详情弹窗（词族/词源/复习曲线） |
| 例句库 | ✅ 完整 | 搜索 / 高亮 / 难度筛选 |
| 练习 | ✅ 完整 | 4 种题型 / 限时 / 连击动画 / 计分 / 总结 |
| 错题本 | ✅ 完整 | 4 档状态 / 筛选 / 掌握状态更新 |
| 设置 | ✅ 完整 | 目标/提醒/偏好/主题(7 种)/字体/AI 配置 |
| UI 组件库 | ✅ 35+ | 完整 design system |
| AI 服务框架 | ✅ 框架 | 6 套 prompt 模板 + mock/real 双模式切换 |
| API 层 | ✅ mock | 8 个 API 模块（mock 数据 + 模拟延迟） |
| Mock 数据 | ✅ 完整 | 6 类数据，结构覆盖全部业务 |

### 2.2 未开始

| 模块 | 说明 |
|---|---|
| 后端 API | 零代码。只有 README 占位 |
| 数据库 | 零 |
| AI 真实对接 | mock 数据，没有调过真实模型 |
| 内容爬虫 | 零 |
| 桌面端 | 零代码 |
| 用户系统 | 零（无登录/注册/多用户隔离） |
| SRS 算法 | 零（前端只有 UI，没有调度算法） |
| 测试 | 零 |

---

## 3. MVP 范围决策

### 核心原则

个人用 MVP 不等于"糙"。**能跑通完整学习闭环**是唯一标准。以下按优先级排列：

### P0 — MVP 必须有（砍了就不叫 MVP）

| # | 项 | 理由 |
|---|---|---|
| P0-1 | 后端 API + 本地 SQLite | 数据不丢的最基本要求 |
| P0-2 | 前端 API 层替换 mock → 真 API | 让已有 UI 真正跑在真实数据上 |
| P0-3 | 间隔重复算法（SRS） | 词汇本的核心灵魂。没有 SRS 的词汇本 = 单词列表 |
| P0-4 | AI 真实对接（至少 1 个能力） | 生成题目或错误分析二选一，证明"智能"不是空话 |
| P0-5 | 内容爬虫（1-2 个源） | 没有内容的应用是空壳 |

### P1 — MVP 应该有（体验从"能看"到"好用"）

| # | 项 | 理由 |
|---|---|---|
| P1-1 | 本地多用户切换 | 多人用一台设备时数据不混 |
| P1-2 | 数据导出/导入 | 手动备份，防数据库损坏 |
| P1-3 | CEFR 自动难度评级 | 爬来的内容不知道难度没法推荐 |
| P1-4 | 统一错误处理 + 加载态 | 生产级 != console.error |
| P1-5 | API 接口测试（核心链路） | 改了东西能验证没 break |

### P2 — MVP 可以砍（有则更好，没有不耽误用）

| # | 项 | 理由 |
|---|---|---|
| P2-1 | 用户注册登录（云端同步） | 纯本地够用，跨设备不是 MVP 必须 |
| P2-2 | 全文内容提取 | RSS 摘要能跑通，全文提取是锦上添花 |
| P2-3 | 桌面端（Tauri） | Web 已经能用，桌面是分发渠道不是功能差异 |
| P2-4 | 完整爬虫覆盖 5+ 源 | 1-2 个源先跑通，架构预留扩展 |
| P2-5 | Docker 一键部署 | 本地 run 够用 |
| P2-6 | 完整测试覆盖 | 核心链路测了就行 |

---

## 4. 功能规格

### 4.1 用户系统（MVP：本地多用户）

```
MVP 范围：
- 本地创建用户（用户名 + 头像）
- 用户切换（顶部下拉切换当前用户）
- 所有数据按 user_id 隔离
- 不搞注册登录/密码/云端同步

数据模型：
  users: id, username, avatar, created_at
  其余所有表加 user_id 外键
```

**为什么不做登录**：个人用、单设备。本地用户切换已经能隔离数据。上云是 P2。

### 4.2 后端 API + 数据库

#### 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 运行时 | Node.js 20+ | 前端已经是 JS，全栈同语言 |
| 语言 | TypeScript | 复用前端类型定义（ContentItem, Vocabulary 等） |
| 框架 | Express | 轻量、生态成熟、中间件灵活 |
| 数据库 | better-sqlite3 | 同步 API、零配置、文件型、个人用绰绰有余 |
| ORM | 不用 | SQLite 手写 SQL 最直接，Drizzle 可选但不必要 |
| 迁移 | 手写 schema.ts | 简单直接 |

#### 目录结构

```
src/server/
├── src/
│   ├── index.ts              # Express 入口
│   ├── db.ts                # better-sqlite3 连接 + 迁移执行
│   ├── schema.ts            # 建表语句（所有表定义）
│   ├── routes/
│   │   ├── users.ts          # GET/POST /api/users, GET/PUT /api/users/:id
│   │   ├── content.ts        # GET /api/content, GET /api/content/:id, POST /api/content/fetch（手动触发爬取）
│   │   ├── vocabulary.ts    # GET/POST/PUT/DELETE /api/vocabulary
│   │   ├── practice.ts      # GET /api/practice, POST /api/practice/:id/answer
│   │   ├── mistakes.ts      # GET/PUT /api/mistakes
│   │   ├── examples.ts      # GET /api/examples/search
│   │   ├── dashboard.ts    # GET /api/dashboard/*
│   │   └── ai.ts           # POST /api/ai/*
│   ├── services/
│   │   ├── srs.ts          # 间隔重复调度算法
│   │   ├── ai.ts          # OpenAI 调用 + prompt 拼装 + 输出校验
│   │   ├── scraper.ts      # RSS/公开源爬取
│   │   └── readability.ts  # 全文提取（Mercury Parser）
│   └── middleware/
│       ├── errorHandler.ts  # 统一错误处理
│       └── userContext.ts  # 从 header/cookie 取 user_id
├── data/
│   └── wordflow.db         # SQLite 文件
└── package.json
```

#### 数据模型（核心表）

```sql
-- 用户
users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)

-- 内容（统一文章/视频/播客）
contents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('article','video','podcast')),
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,        -- BBC/TED/YouTube/...
  source_url TEXT,
  difficulty TEXT CHECK(difficulty IN ('A1','A2','B1','B2','C1','C2')),
  category TEXT,
  cover_image TEXT,
  published_at TEXT,
  vocabulary_count INTEGER DEFAULT 0,
  word_count INTEGER,
  duration INTEGER,             -- 视频/播客秒数
  estimated_minutes INTEGER,
  video_url TEXT,
  audio_url TEXT,
  speaker TEXT,
  raw_content TEXT,            -- 原始全文（JSON: segments[]）
  subtitles TEXT,             -- 视频/播客字幕（JSON）
  crawled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)

-- 用户×内容（阅读记录）
user_content (
  user_id TEXT NOT NULL REFERENCES users(id),
  content_id TEXT NOT NULL REFERENCES contents(id),
  is_favorite INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  last_position INTEGER DEFAULT 0,  -- 视频播放位置/阅读进度
  completed_at TEXT,
  PRIMARY KEY (user_id, content_id)
)

-- 词汇
vocabulary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  word TEXT NOT NULL,
  phonetic TEXT,
  part_of_speech TEXT,
  definition TEXT,
  chinese_definition TEXT,
  examples TEXT,               -- JSON
  word_family TEXT,           -- JSON
  etymology TEXT,
  frequency INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 0,  -- 0-100
  source TEXT,
  tags TEXT,                   -- JSON
  -- SRS 字段
  ease_factor REAL DEFAULT 2.5,   -- SM-2 难度因子
  interval_days REAL DEFAULT 0,   -- 当前间隔
  repetitions INTEGER DEFAULT 0,   -- 连续正确次数
  next_review_at TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_reviewed_at TEXT,
  UNIQUE(user_id, word)
)

-- 练习记录
practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  score INTEGER,
  total_points INTEGER,
  started_at TEXT NOT NULL,
  completed_at TEXT
)

-- 错题本
mistakes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT REFERENCES practice_sessions(id),
  question_id TEXT NOT NULL,
  question_snapshot TEXT NOT NULL,  -- JSON（题目快照，防止题目删了错题消失）
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  mastery_status TEXT NOT NULL DEFAULT 'not-reviewed'
    CHECK(mastery_status IN ('not-reviewed','reviewing','mastered')),
  review_count INTEGER DEFAULT 0,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)

-- 例句
examples (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  word TEXT NOT NULL,
  sentence TEXT NOT NULL,
  translation TEXT,
  source TEXT,
  source_url TEXT,
  difficulty TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)

-- 爬虫日志（防止重复爬取）
scrape_log (
  source TEXT NOT NULL,
  last_scraped_at TEXT NOT NULL,
  items_count INTEGER DEFAULT 0,
  PRIMARY KEY (source)
)
```

### 4.3 间隔重复算法（SRS）

这是词汇本的灵魂。前端 UI 已就绪（三档反馈 + 掌握度进度条 + 遗忘曲线），**缺的是调度算法**。

#### 算法：SM-2 变体

```typescript
// services/srs.ts
type ReviewQuality = 1 | 2 | 3  // 1=困难, 2=还行, 3=简单

interface SrsState {
  easeFactor: number   // 难度因子，初始 2.5，最低 1.3
  interval: number    // 当前间隔（天）
  repetitions: number // 连续正确次数
}

function schedule(state: SrsState, quality: ReviewQuality): SrsState {
  let { easeFactor, interval, repetitions } = state

  if (quality === 1) {
    // 困难：重置间隔，降低 EF
    repetitions = 0
    interval = 1
    easeFactor = Math.max(1.3, easeFactor - 0.2)
  } else {
    // 还行/简单
    repetitions += 1
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 6
    else interval = Math.round(interval * easeFactor)

    // 简单比还行多提一点 EF
    easeFactor += quality === 3 ? 0.1 : 0
    easeFactor = Math.min(2.5, Math.max(1.3, easeFactor))
  }

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + Math.round(interval))

  return { easeFactor, interval, repetitions, nextReviewAt }
}
```

#### 与前端联动

前端 `VocabularyPage.vue` 的"困难/还行/简单"三档按钮 → 调 `PUT /api/vocabulary/:id/review` → 后端执行 SM-2 调度 → 返回 `nextReviewAt` + 新的 `masteryLevel` → 前端刷新卡片。

### 4.4 AI 真实对接

#### MVP 只做两个能力

| 能力 | 优先级 | Prompt 状态 |
|---|---|---|
| 生成练习题 | P0 | `aiService.ts` 已有完整 prompt |
| 错误分析 | P0 | `aiService.ts` 已有完整 prompt |

其余能力（周计划、词汇故事、上下文释义、难度评估）留 P1。

#### 后端代理模式

```
前端 POST /api/ai/generate-questions { contentId, difficulty, count }
  → 后端 services/ai.ts
    → 从 DB 取内容全文
    → 拼 prompt（复用前端 PROMPTS 模板）
    → fetch(OpenAI/兼容)
    → 校验 JSON 格式
    → 存 DB（防重复生成）
    → 回前端
```

#### 关键约束

- **JSON Mode**：OpenAI 用 `response_format: json_object`，兼容模型用 JSON mode prompt
- **输出校验**：校验必填字段存在 + 选项不重复 + 正确答案在选项中
- **失败降级**：OpenAI 挂了切本地 Ollama / 备用 key
- **Token 预算**：生成 5 题约消耗 800-1500 tokens，设上限 4096

### 4.5 内容爬虫

#### 源优先级（MVP 只做 RSS）

| 源 | 类型 | MVP | 理由 |
|---|---|---|---|
| BBC News | RSS | ✅ | 公开 RSS，结构化，每日更新 |
| NPR | RSS | ✅ | 公开 RSS，英文播客内容 |
| The Guardian | RSS | P1 | 公开 RSS，内容优质 |
| TED | 官方 API | P1 | 有 API，视频元数据完整 |
| YouTube | Data API | P2 | 需 API key，配额限制 |

#### 爬虫机械

```typescript
// services/scraper.ts
// 架构：定时 + 手动

// 定时：node-cron 每天 03:00
const SCRAPER_SCHEDULE = '0 3 * * *'

// 手动：POST /api/content/fetch { source, limit }
// 频率限制：每个 source 每小时最多爬 1 次

// 流程：
// 1. 检查 scrape_log（该 source最近爬取时间）
// 2. 检查频率限制
// 3. fetch RSS XML
// 4. parse → 结构化数据
// 5. 去重（source + title 唯一）
// 6. 存 DB（raw_content 存 JSON）
// 7. 更新 scrape_log
```

#### 增量策略

- 每次只爬最近 N 条（默认 20）
- 按 `published_at` DB 内最新 → 爬到新内容停
- 不全站爬取（存不下、也没必要）

### 4.6 前端 API 层替换

#### 替换方式（最小改动）

每个 `src/web/src/api/*.ts` 文件的模式：

```ts
// 之前（mock）
export const vocabularyApi = {
  async getList(params) {
    await delay(300)
    return { success: true, data: mockVocabulary }
  }
}

// 之后（real）
export const vocabularyApi = {
  async getList(params) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`/api/vocabulary?${query}`)
    return res.json()
  }
}
```

#### 改动范围

| 文件 | 改什么 |
|---|---|
| `api/content.ts` | mockContentItems → `/api/content` |
| `api/vocabulary.ts` | mockVocabulary → `/api/vocabulary` |
| `api/practice.ts` | mockPracticeQuestions → `/api/practice` |
| `api/mistakes.ts` | mockMistakes → `/api/mistakes` |
| `api/examples.ts` | mockExamples → `/api/examples` |
| `api/dashboard.ts` | mockDashboardStats → `/api/dashboard` |
| `api/ai.ts` | mock 逻辑 → `/api/ai/*`（已有 configureAI，不用动） |

**`api/ai.ts` 不改**：它已经有 `configureAI()` 切 real 模式，只是 endpoint 从 `/api/ai` 走后端代理即可。

#### 部署方式（MVP）

```
开发态：
  前端 Vite dev server (5173)
    → /api/* proxy 到 Express (3000)
    → vite.config.ts 配 proxy

生产态（可选）：
  npm run build → dist/
  Express 静态托管 dist/
  单端口对外
```

---

## 5. 非功能要求

### 5.1 性能

| 指标 | 目标 |
|---|---|
| 页面首屏 | < 2s（本地网络） |
| API 响应（简单查询） | < 100ms |
| AI 生成（5 题） | < 15s |
| DB 大小（1 年） | < 100MB |
| 爬虫单次 | < 30s |

### 5.2 错误处理

```
后端统一错误格式：
{
  success: false,
  error: {
    code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'AI_TIMEOUT' | 'RATE_LIMITED',
    message: '人话描述'
  }
}

前端统一处理：
- 拦截所有 API 错误
- 按 code 映射中文提示
- 网络错误 → Toast '网络异常，请检查连接'
- 超时 → Toast '请求超时，请重试'
```

### 5.3 日志

```
后端：
- 请求日志（method + path + status + duration）
- AI 调用日志（prompt tokens + completion tokens + latency）
- 爬虫日志（source + items_count + duration）
- 日志文件：data/logs/，按天切分

前端：
- 不暴露给用户的错误用 console.error
- 上报到后端的错误 /api/log（P1）
```

### 5.4 测试

| 层 | 覆盖范围 | 工具 |
|---|---|---|
| 后端 API | 核心路由（content/vocabulary/practice/ai） | Vitest + Supertest |
| SRS 算法 | schedule() 全部分支 | Vitest 单元 |
| 爬虫 | parse + 去重 | Vitest |
| 前端 E2E | 主链路（登录 → 看文章 → 答题 → 看错题） | Playwright（P1） |

---

## 6. 交付路线图

### Phase 1（1-2 周）— 后端骨架

- [ ] 项目初始化（Express + TS + SQLite）
- [ ] Schema 建表 + 迁移
- [ ] 用户 CRUD + user_id 隔离
- [ ] Content CRUD（先不爬，手动插入种子数据）
- [ ] Vocabulary CRUD + SRS 调度
- [ ] Practice + Mistakes CRUD
- [ ] Dashboard 聚合查询

### Phase 2（1 周）— 前端接通

- [ ] API 层 mock → real（8 个文件）
- [ ] Vite proxy 配通
- [ ] 联调 + 修复
- [ ] 部署到同端口

### Phase 3（1-2 周）— AI + 爬虫

- [ ] AI 对接（生成题目 + 错误分析）
- [ ] 输出校验 + 失败降级
- [ ] RSS 爬虫（BBC + NPR）
- [ ] 定时任务 + 手动触发
- [ ] 前端内容详情接爬虫数据

### Phase 4（1 周）— 打磨

- [ ] 本地多用户切换
- [ ] 数据导出/导入
- [ ] 统一错误处理 + 加载态
- [ ] 核心 API 测试
- [ ] 文档（API 文档 + README）

### 总计：4-6 周

---

## 7. 关键风险

| 风险 | 概率 | 缓解 |
|---|---|---|
| AI 输出格式不稳定 | 高 | JSON mode + 输出校验 + 失败降级 |
| RSS 内容质量参差 | 中 | 1-2 源先验证 + 人工审核机制 |
| SRS 参数需要调优 | 中 | SM-2 默认参数已被 Anki 验证，微调 ease factor |
| 前端 mock→real 联调 | 中 | API 层已封装，逐个替换 + 联调 |
| 爬虫被封 IP | 低 | 低频（每天 1 次）+ 只爬公开 RSS |

---

## 8. 不在 MVP 范围

- 用户注册登录（云端账户）
- 跨设备同步
- 全文内容提取（Mercury Parser）
- 5+ 源爬虫覆盖
- 桌面端（Tauri）
- Docker 部署
- CI/CD
- 国际化（i18n）
- 深色模式之外的额外主题
- 移动端 App
- 社交/排行榜/好友
- 付费/订阅

---

## 9. 验收标准

MVP 完成的定义：

- [ ] 一个用户能完整跑通：看文章 → 点生词 → 复习闪卡 → 做练习 → 看 AI 分析
- [ ] 学习数据不丢（重启应用后数据还在）
- [ ] 每天有新内容（RSS 爬虫每天爬）
- [ ] AI 生成的题目格式稳定、可用
- [ ] SRS 调度正确（难的词频繁出现，简单的隔久才出现）
- [ ] 核心 API 有测试覆盖
