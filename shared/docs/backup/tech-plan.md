# 技术方案：WordFlow

## 1. 问题本质（第一性原理）
- 用户真正要解决的是什么：在真实英文内容上完成"输入 → 内化 → 输出 → 纠错 → 再输入"的学习闭环，并持久化学习轨迹。
- 最核心的输入 / 输出 / 约束：
  - 输入：英文内容（文章/视频/播客）、用户行为（点击、答题、复习）
  - 输出：词汇掌握度、练习分数、错题解析、学习统计
  - 约束：前端已有 9 个页面和 37 个组件，需最小改动接入真实后端；桌面端复用前端代码；单用户自托管，无鉴权需求。
- 哪些设计是必要的，哪些只是习惯性方案（可质疑项）：
  - 必要：统一 API 层、间隔重复算法、AI 代理层、爬取模块
  - 可质疑：Express vs Fastify（两者皆可，选 Express 因生态更成熟）、Tauri 壳是否必须（MVP 可先只做 Web 版）

## 2. 核心约束
- 硬约束：
  - 保留现有前端路由和组件结构，不做 UI 重构
  - API 响应格式需匹配前端现有 types/index.ts 接口
  - 桌面端必须复用 Web 前端代码，不允许维护两套 UI
  - 单用户自托管，无鉴权、无多用户隔离
  - 后端和前端都部署到 Docker 容器
- 软约束：
  - 团队成员熟悉 TypeScript + Express，优先降低学习成本
  - 部署在 Windows 开发环境，需考虑跨平台兼容

## 3. 关键风险
| 风险 | 概率 | 影响 | 初步缓解 |
|------|------|------|----------|
| 前端 API 契约与后端不一致 | 高 | 高 | Phase 1 冻结契约，前端写代码前反复回看 |
| AI 服务成本超预算 | 中 | 中 | MVP 用 Mock/本地降级，真实 AI 可配置开关 |
| 桌面端 Tauri 学习曲线 | 中 | 低 | 复用 Web 前端，只写最小 Rust 层 |
| 间隔重复算法实现复杂度 | 低 | 中 | MVP 用简化版 SM-2，不追求学术级精度 |
| 爬取模块稳定性 | 高 | 中 | 各源独立适配，失败不阻塞其他功能 |
| 媒体文件存储与迁移 | 中 | 低 | 项目目录内 media/ 文件夹 + 备份脚本 |

## 4. 系统架构
### 模块划分与职责边界
```
┌─────────────────┐     ┌─────────────────┐
│   Web Frontend  │     │  Desktop Shell  │
│  (Vue 3 + TS)  │     │  (Tauri + Vue)  │
│  src/web/       │     │  src/desktop/   │
└────────┬────────┘     └────────┬────────┘
         └───────────┬───────────┘
                     │ HTTPS / JSON
            ┌────────▼────────┐
            │   API Gateway   │
            │   (Express)     │
            └────────┬────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼────┐  ┌────▼────┐  ┌───▼────┐
   │ Content │  │ Vocab   │  │   AI   │
   │ Module  │  │ Module  │  │ Module │
   └─────────┘  └─────────┘  └────────┘
                     │
            ┌────────▼────────┐
            │   Database      │
            │  (PostgreSQL)   │
            └─────────────────┘
```

### 关键数据流
1. 前端请求内容列表 → API 查询 DB → 返回分页数据 → 前端渲染
2. 用户答题 → 前端 POST /practice/submit → API 判分 → 错题入库 → 返回结果
3. 复习触发 → 前端 GET /vocabulary/review → API 按间隔重复算法出题 → 前端闪卡
4. AI 请求 → 前端 POST /ai/* → API 代理到 LLM → 返回结构化结果 → 前端展示
5. 爬取触发 → 后端定时任务/手动触发 → 抓取内容 → 下载媒体 → 入库 → 前端可浏览

## 5. 技术选型
| 层 | 选型 | 理由 | 为什么不选 XX |
|----|------|------|--------------|
| 前端框架 | Vue 3 + Vite + TypeScript | 已有完整实现，保留 | React：无迁移必要 |
| 状态管理 | Pinia | 已安装，标准方案 | Vuex：已废弃 |
| 路由 | Vue Router 4 | 已有实现 | 无 |
| 后端框架 | Express + TypeScript | 生态成熟、团队熟悉 | Fastify：性能更好但生态略小，MVP 够用即可 |
| 数据库 | PostgreSQL | 统一环境，本地 Docker + 云端直接部署，零迁移成本 | SQLite：迁移成本高 |
| ORM | Prisma | 类型安全、迁移友好 | TypeORM：API 不够直觉 |
| 鉴权 | 无 | 单用户自托管，无需鉴权 | JWT：单用户场景过度设计 |
| AI 代理 | 服务端转发 + 前端可配置 endpoint | 隐藏 key、支持多 provider | 前端直连：key 暴露风险 |
| 桌面壳 | Tauri 1.x | Rust 安全、体积小、复用 Web 前端 | Electron：体积大、资源占用高 |
| 部署 | Docker Compose + PM2 + Nginx | 后端容器化，单服务器部署，本地云端一致 | 单二进制：迁移性差 |

## 6. 数据模型
### 核心实体与关系
```
ContentItem 1──n ContentSegment
ContentSegment 1──n PracticeQuestion
Vocabulary 1──n ExampleSentence
PracticeSession 1──n PracticeQuestion
MistakeRecord (独立)
```

### 关键字段（Prisma Schema 草案）
- ContentItem：id, type(article|video|podcast), title, summary, source, difficulty(A1-C2), category, tags[], segments(JSON), mediaPath, transcript, createdAt
- ContentSegment：id, contentItemId, startTime, endTime, text, translation
- Vocabulary：id, word, phonetic, partOfSpeech, definition, chineseDefinition, examples[], wordFamily{}, masteryLevel(0-5), reviewHistory(JSON), nextReviewAt, createdAt
- PracticeQuestion：id, type(cloze|comprehension|grammar|correction), difficulty, question, options[], correctAnswer, explanation, points, tags[], sourceContentId
- MistakeRecord：id, questionId, question, userAnswer, correctAnswer, masteryStatus(not-reviewed|reviewing|mastered), reviewCount, lastReviewedAt, createdAt
- PracticeSession：id, questions[], score, completedAt, duration
- StudyStatistic：id, date, studyMinutes, wordsLearned, exercisesCompleted, createdAt

## 7. 接口设计
### 前后端契约（冻结前先定义）
所有接口统一前缀 `/api/v1`，响应格式：
```json
{
  "code": 200,
  "data": {},
  "message": "success",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 核心端点清单
| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| Content | GET | /api/v1/content | 内容列表（分页/筛选） |
| Content | GET | /api/v1/content/:id | 内容详情 |
| Content | POST | /api/v1/content/import | 批量导入内容 |
| Content | POST | /api/v1/content/crawl | 触发爬取任务 |
| Content | GET | /api/v1/content/sources | 可用内容源列表 |
| Vocabulary | GET | /api/v1/vocabulary | 我的词汇表 |
| Vocabulary | POST | /api/v1/vocabulary | 添加单词 |
| Vocabulary | PATCH | /api/v1/vocabulary/:id | 更新单词 |
| Vocabulary | DELETE | /api/v1/vocabulary/:id | 删除单词 |
| Vocabulary | GET | /api/v1/vocabulary/review | 复习列表（间隔重复） |
| Practice | GET | /api/v1/practice/questions | 获取练习题 |
| Practice | POST | /api/v1/practice/submit | 提交答案 |
| Mistakes | GET | /api/v1/mistakes | 错题列表 |
| Mistakes | PATCH | /api/v1/mistakes/:id/mastery | 更新掌握度 |
| Dashboard | GET | /api/v1/dashboard/stats | 今日统计 |
| Dashboard | GET | /api/v1/dashboard/heatmap | 学习热力图 |
| Dashboard | GET | /api/v1/dashboard/word-growth | 单词增长曲线 |
| Dashboard | GET | /api/v1/dashboard/recommendations | 每日推荐 |
| AI | POST | /api/v1/ai/questions/generate | 生成题目 |
| AI | POST | /api/v1/ai/errors/analyze | 错误分析 |
| AI | POST | /api/v1/ai/words/contextual | 语境释义 |
| AI | POST | /api/v1/ai/study-plan/weekly | 周计划 |
| AI | POST | /api/v1/ai/vocabulary/story | 词汇故事 |
| AI | POST | /api/v1/ai/text/assess-difficulty | 难度评估 |

## 8. 开发拆分
### Phase 1 DAG（粗粒度）
1. 后端脚手架 + Docker Compose + PostgreSQL + Prisma + 统一响应格式
2. 爬取模块（RSS/YouTube/Twitter/网页解析 + 媒体下载 + 定时调度）
3. 内容模块（CRUD + 分页筛选 + 导入/爬取接口）
4. 词汇模块（CRUD + 间隔重复算法）
5. 练习与错题模块
6. Dashboard 统计模块
7. AI 代理模块
8. 前端接入真实 API（替换 Mock + Pinia stores 重构）
9. 桌面端 Tauri 壳初始化
10. 集成测试 + 部署脚本

## 9. 依赖关系
- 任务 1（脚手架） → 所有后续任务
- 任务 2（爬取） → 任务 3（提供内容数据）
- 任务 3（内容） → 任务 4,5,6（提供内容 ID）
- 任务 8（前端接入） → 依赖任务 3-7 完成
- 任务 9（桌面端） → 依赖任务 8（前端 API 就绪）
- 外部依赖：LLM API Key（可延后接入，先用 Mock）

## 10. 测试方案
- 单元测试：服务端用 Jest/Vitest，覆盖核心业务逻辑（间隔重复、评分算法、爬取解析）
- 集成测试：Supertest 测试 API 端点，覆盖 happy path + 边界条件
- 前端测试：Vitest + Vue Test Utils，覆盖关键组件和 API 调用
- E2E：Playwright 覆盖主流程（浏览内容 → 答题 → 复习）
- MVP 目标：服务端单元 + 集成覆盖率 ≥ 60%，前端关键路径覆盖

## 11. 上线计划
### 本地开发
1. 启动 Docker Compose（PostgreSQL + 后端）
2. 运行 Prisma migrate 初始化数据库
3. 启动前端 dev server（Vite）
4. 启动桌面端（tauri dev）

### 生产部署（MVP）
1. 单服务器部署（Ubuntu 20.04+）
2. Docker Compose 启动 PostgreSQL + 后端服务
3. Nginx 反向代理（Web 静态文件 + API 转发）
4. PM2 管理 Node.js 容器或直接 Docker restart
5. 每日自动备份 PostgreSQL + media/ 文件夹
6. 桌面端通过 GitHub Release 分发安装包

### 灰度 / 回滚
- MVP 阶段不涉及灰度，直接全量
- 回滚：Docker Compose 回滚到上一版本 + 数据库备份恢复（如有 schema 变更）

## 12. 代码规范与框架约定
- TypeScript 严格模式（`strict: true`），禁止 `any` 类型
- ESLint + Prettier 统一代码风格，提交前自动格式化
- Git 提交信息遵循 Conventional Commits（feat/fix/docs/refactor/test/chore）
- 目录结构约定：
  - `src/server/src/modules/{module}/` 每个业务模块独立目录
  - `src/server/src/middleware/` 全局中间件
  - `src/server/src/utils/` 通用工具函数
  - `src/server/src/types/` 全局类型定义
- 错误处理：统一错误类继承，全局错误中间件，禁止吞错
- 日志规范：使用结构化日志（pino），密钥/敏感信息不进日志
- API 响应：统一 `{code, data, message, timestamp}` 格式
