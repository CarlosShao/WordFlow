# WordFlow 项目分析报告

> **【历史文档】2026-08-10 接手时的分析报告，多数问题已在后续迭代中解决。**
> 当前架构/启动方式以 `AGENT.md`、根目录 `README.md`、`src/server/README.md` 为准。
> 分析时间：2026-08-10 ｜ 接手前由一个失败的 agent 搭建了大体框架

## 一、项目定位
英语学习应用，支持多端（Web / 桌面 Tauri 规划中 / 后续移动）。
核心闭环：**导入真实语料**（YouTube / Twitter / 网页）→ **AI 提取词汇**、**生成练习题**、**错题本** → **记忆曲线复习**。

## 二、整体架构
- 前后端分离。后端 **Fastify (TypeScript, ESM)**；前端 **Vue 3 + Vite + Pinia + Vue Router + axios**。
- 数据层：**PostgreSQL（Prisma ORM）+ Redis（会话/缓存）+ MinIO（对象存储：音频/封面）**。
- 鉴权：**JWT access + refresh**（refresh 存 DB + Redis 白名单），支持 **GitHub OAuth**。
- AI：**OpenAI 兼容接口**（默认 DeepSeek），用于词汇提取、题目生成、错题分析。
- 爬虫：**策略模式**，支持 YouTube / Twitter / 网页 / puppeteer，DB 驱动。
- 调度：node-cron（定时抓取，接线情况待确认）。

## 三、后端模块（src/server/src/modules）
| 模块 | 职责 | 路由示例 |
|---|---|---|
| auth | 注册/登录/刷新/登出/GitHub OAuth | /api/v1/auth/* |
| content | 语料内容 CRUD、难度/类型筛选 | /api/v1/content |
| crawler | 爬虫策略（yt/twitter/web/puppeteer） | /api/v1/crawler |
| vocabulary | 词汇库管理 | /api/v1/vocabulary |
| practice | 练习会话、题目、提交评分 | /api/v1/practice |
| mistakes | 错题本 | /api/v1/mistakes |
| dashboard | 学习统计/仪表盘 | /api/v1/dashboard |
| ai | AI 配置/连接测试/调用封装 | /api/v1/ai |
| ai-processing | AI 处理流水线（词汇提取、题目生成） | 内部服务 |
| upload | 文件上传到 MinIO | /api/v1/upload |

## 四、前端结构（src/web）
- Vue 3 + Vite + Pinia + Vue Router + axios
- `api/`：每个后端模块对应一个 api 文件 + `client.ts`（axios 实例，自动带 JWT）
- `stores/`：对应后端模块（auth/vocabulary/practice/mistakes/dashboard/crawler）
- `components/`：丰富（Base* 基础组件、练习/词汇/统计图表/设置）
- `router/`：登录注册、首页仪表盘、内容浏览、练习、词汇、错题、设置、抓取源管理
- `src/desktop`：仅 README，**尚未搭建**

## 五、之前 agent 遗留的问题（"启动不了"的真正根因）
### ✅ 已修复（本轮）
1. esbuild 语法错误：`service.ts:240` 的 `password: <REDACTED>`（变量名被误替换成字面量）→ 改回 `password: hashedPassword`
2. 致命 config 字段名误用：`config` 是小写驼峰，代码却用大写顶层字段（全部 undefined）：
   - `index.ts`：`config.PORT` / `config.NODE_ENV` / `config.CORS_ORIGIN` / `config.LOG_LEVEL`
   - `minio.ts`：`config.MINIO_*`
   - `crawler/youtube.ts`、`twitter.ts`：`config.YOUTUBE_API_KEY` / `config.TWITTER_BEARER_TOKEN`
3. 调试垃圾文件阻塞构建：`src/server/src/test-debug/*`、`test-*.ts`、`smoke.ts`（用户拒绝删除，改用 tsconfig `exclude` 排除，未删文件）

### ⚠️ 仍需修复（tsc 暴露的 16+ 处错误 + 功能 bug）
- **依赖缺失**：crawler/content 用到 `cheerio`、`puppeteer`，但 package.json 未安装 → dev 启动加载 crawler 模块即崩
- **类型错误**：ai-processing / ai / practice 中 Prisma 返回的 nullable 字段（phonetic/translation 为 `string | null`）赋给要求 `string` 的地方
- **jwt 类型**：`jwt.sign` 的 `expiresIn` 类型报错（jsonwebtoken 类型版本不一致）
- **auth/service.ts**：用 `Record<string, unknown>` 绕过 Prisma 类型创建用户
- **content/index.ts**：用 `.ts` 扩展名 import（tsc 不允许）+ `interactions` 应为 `userInteractions`
- **crawler/service.ts**：把 `unknown` 写入 Json 字段
- **枚举体系统一**：
  - `QuestionType`：schema 是 `CLOZE/READING_COMPREHENSION/GRAMMAR/VOCABULARY/LISTENING`，代码用 `FILL_BLANK/MULTIPLE_CHOICE/TRANSLATION/LISTENING` → 写库会失败
  - `Difficulty`：schema 6 值，content 模块 zod 只 3 值，crawler 用 6 值
- **auth GitHub 首次登录**：只构造 `userData` 但**没调用 `prisma.user.create()`** → 新用户 GitHub 注册完全失效
- **practice Mistake**：创建时未传必填字段 `questionType` / `question`
- **重复实现**：两套爬虫（content/crawler.ts + scheduler.ts 旧版 vs crawler/ 策略），旧版有死代码

## 六、让 dev 真正跑起来的前置条件
1. 安装缺失依赖 或 移除 crawler 对 cheerio/puppeteer 的依赖
2. 起外部服务：`docker compose up -d`（Postgres / Redis / MinIO）
3. `prisma generate` +（首次）`prisma migrate dev` 建库
4. `.env` 已存在（含示例 .env.example）

## 七、我的下一步推进顺序（待你确认/授权）
1. 解决 crawler 依赖缺失（让 dev 能启动）
2. 修复 tsc 类型错误批
3. 统一枚举体系（建议以 schema 枚举为准，统一代码）
4. 修复 GitHub 登录、Mistake 必填等运行时功能 bug
5. 清理重复爬虫 / 死代码
6. 起 docker-compose + prisma 迁移 + dev 冒烟验证

**需要你确认**：环境是否已用 docker-compose 起好 Postgres/Redis/MinIO？是否要我直接按上面顺序开干？
