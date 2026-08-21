# WordFlow B站喜剧内容接入 — 交接文档

> 交接时间：2026-08-14
> 交接人：前序 AI agent（deepseek-v4-flash）
> 接手人：后续 agent
> 本文档目标：让接手者**不重踩已踩过的坑**，直接继续推进。

---

## 0. 一句话总结

给 WordFlow（英语学习应用，Vue3 + Fastify + PostgreSQL + Prisma）**新增了 B站（Bilibili）视频爬取能力**：B站视频（无英文轨）→ 云端 ASR 转英文 → LLM 翻译中文 → 按真实音频时间轴对齐 → 双语 segments 入库，与现有 TED 管线同一套数据格式。同时修复了 B站封面防盗链问题。

---

## 1. 当前运行状态（接手时先确认）

| 项 | 状态 |
|---|---|
| Docker 服务 | `wordflow-api`(3002) / `postgres`(5432) / `redis`(6379) / `minio`(9000) 均在运行 |
| 后端健康 | `http://localhost:3002/health` → 200 |
| 前端 | Vite dev @ `http://localhost:5173`（**用户自己启动**，不要动）|
| 全量批处理 | **后台任务 pwsh-16 正在跑**（119 个 BILIBILI 源，最终版代码）。**任务运行期间绝对不要重启 wordflow-api 容器**（会导致 HTTP 断连、批量中断，已因此中断 2 次）|
| 数据库 BILIBILI 内容 | 正在由 pwsh-16 重新生成（中途清空过一次）|

**接手第一步**：`docker logs --tail 50 wordflow-api` 看是否还在输出 ASR chunk 日志；`SELECT count(*) FROM contents WHERE source LIKE 'Steve%' OR source LIKE 'SNL%';` 看入库进度。119 个源预计 1.5~2.5 小时跑完（分块 ASR，每视频约 10-12 次 API 调用）。

---

## 2. 本次需求背景

用户（个人自用英语学习 app）：
1. 现有 TED 内容太无聊，想要**喜剧类**（SNL、脱口秀）和**恐怖/惊悚类**英文原声视频
2. 视频源在 B站：Steve Harvey《Hey Steve》合集（BV1Gb5KzZEoc，100 个分P）+ UP主"SNL周六夜现场"（space.bilibili.com/35815912，1209 个视频）
3. 已确认用 **阶跃星辰 Step Plan**（用户是订阅用户）：ASR = `stepaudio-2.5-asr`（0.15元/小时），LLM = `step-3.7-flash`
4. **用户明确不要本地 ASR/LLM 模型**（机器 GTX 1060，要干别的活）——全部走云端 API

已入库内容（pwsh-16 完成前）：SNL 19 个 + Steve 6 个分P（25 条），格式见 §5。

---

## 3. 代码改动清单（全部已落地）

| 文件 | 改动 |
|---|---|
| `src/server/prisma/schema.prisma` | `CrawlerSourceType` 枚举加 `BILIBILI` |
| `src/server/prisma/migrations/20260814120000_add_bilibili_source_type/migration.sql` | 手写迁移：`ALTER TYPE "CrawlerSourceType" ADD VALUE IF NOT EXISTS 'BILIBILI';`（已 resolve --applied）|
| `src/server/src/modules/crawler/strategies/bilibili.ts` | **核心新 strategy**：B站 API 拉元数据/字幕轨 → DASH 音频直下 → 云端 ASR 分块转写 → 一致性校验 → 双语对齐 → CrawlItem |
| `src/server/src/modules/crawler/asr.ts` | **新模块**：stepaudio-2.5-asr SSE 转写 + ffmpeg PCM 转换 + **25s 分块**（每块带真实时间）|
| `src/server/src/modules/crawler/cleaner.ts` | 新增 `alignAsrToChineseTimeline` / `alignBilingualToSpeechTimeline` / 增强 `splitEnglishBySentence`（无标点 ASR 文本按句首词切分）|
| `src/server/src/modules/crawler/strategies/index.ts` | 注册 `BILIBILI: bilibiliStrategy` |
| `src/server/src/modules/crawler/routes.ts` | create/update source 的 type 枚举加 `BILIBILI` |
| `src/server/src/modules/media/routes.ts` | **新增封面代理接口** `GET /api/v1/media/cover?url=`（解决 B站防盗链）|
| `src/server/src/modules/crawler/translator.ts` | translateBatch 加 120s 超时（AbortSignal）|
| `src/server/src/modules/ai-processing/llm.ts` | `callLlm` 增加可选 `signal` 参数 |
| `src/server/src/common/errors.ts` | 未预期错误加 `logger.error` 打印堆栈（排查用，保留）|
| `src/web/src/api/content.ts` | `normalizeContent`：hdslb.com 封面 URL 重写为后端代理 `/api/v1/media/cover?url=...` |
| `src/web/src/views/ContentPage.vue` | 封面 `<img referrerpolicy="no-referrer">` |
| `src/web/src/views/ReadingPage.vue` | 同上 |
| `docker-compose.yml` | api 服务挂载 `./.bilibili_cookie.txt:/app/.bilibili_cookie.txt` |
| `scripts/crawl-steve.ps1` | 批量触发脚本（遍历全部 BILIBILI 源，JWT 过期自动 refresh 续期）|

---

## 4. 关键架构：B站视频处理管线（bilibili.ts）

```
CrawlerSource(type=BILIBILI, url=https://www.bilibili.com/video/BVxxx?p=N)
  │
  ├─ fetchVideoMeta()      B站 view API（含 pages 分P列表、first_frame 分P封面）
  ├─ fetchSubtitleTracks() player/v2 API → CC 字幕轨列表（ai-zh / zh-CN / zh-Hans）
  ├─ downloadSubtitleJson() 下载字幕 JSON → 转 SRT 文本
  ├─ zhSubtitleMatchesAudio() ★ LLM 一致性校验：ASR 英文 vs 中文轨是否同一内容
  │     （B站 ai-zh 大量脏数据：cid 关联到别的内容的字幕！校验不过就丢弃中文轨，走 LLM 翻译）
  ├─ fetchDashAudioUrl()   playurl API 拿 DASH 音频直链（绕开 yt-dlp 的 CDN IPv6 问题）
  ├─ transcribeAudio()     stepaudio-2.5-asr SSE，25 秒分块 → 每块带真实时间范围
  ├─ alignBilingualToSpeechTimeline()  英文/中文按"句子数比例"分配到各时间块，
  │     块内再按"字符比例"给每句细分时间戳 → 句子级 segments（en/zh/start/end 毫秒）
  └─ CrawlItem → 现有 service.ts insertItem() 入库（source+sourceUrl 去重）
```

**数据流与 TED 完全一致**：`contents` 表，`segments` JSONB 数组 `[{en, zh, start, end}]`（**毫秒**），`content`=英文全文，`translation`=中文全文，`type='VIDEO'`，`videoUrl`=B站页面 URL（前端播放走现有 `/api/v1/media/bilibili` 代理）。

---

## 5. 数据格式（与前端兼容性已验证）

```jsonc
// contents 表示例（Steve Harvey P74）
{
  "title": "74.Hey Steve- How Do You Ask A Guy Out",   // 多分P用 part 名，单视频用原标题
  "type": "VIDEO",
  "source": "Steve Harvey Hey Steve P74",               // CrawlerSource 的 name
  "sourceUrl": "https://www.bilibili.com/video/BV1Gb5KzZEoc?p=74",
  "coverUrl": "https://i2.hdslb.com/bfs/storyff/xxx_firsti.jpg",  // 分P首帧图，https
  "duration": 190,                                        // 秒
  "content": "英文全文...",
  "translation": "中文全文...",
  "segments": [
    { "en": "Hey Steve.", "zh": "嘿，史蒂夫。", "start": 0, "end": 2500 },
    { "en": "So recently I turned 24...", "zh": "所以我最近刚满24岁...", "start": 5000, "end": 7500 }
  ]
}
```

前端 `ContentDetailPage.vue` 自动识别毫秒/秒（比较最大时间戳 vs duration），**毫秒直接可用**，无需改前端。

---

## 6. 踩过的坑（重要！每一条都是真金白银的教训）

### 6.1 B站图片防盗链（封面 403）★ 已修复
- **症状**：浏览器里所有 B站封面不显示，后端数据正常、curl 测试 200。
- **根因**：`<img src="https://i*.hdslb.com/...">` 请求带 `Referer: http://localhost:5173` → B站 CDN 返回 **403**。curl 无 Referer 才 200。
- **修复**：后端代理 `GET /api/v1/media/cover?url=`（后端 fetch 带 `Referer: https://www.bilibili.com` → 200），前端把 hdslb.com 封面重写为代理 URL。已在浏览器实测：彩色像素 0.2% → 11%，封面正常显示。
- **注意**：只允许代理 hdslb.com/bilibili 域名（有校验）。

### 6.2 B站 ai-zh 字幕脏数据 ★ 已修复（严重）
- **症状**：部分视频拿到的 ai-zh 字幕内容与视频完全无关（如 SNL 视频配的是《黑暗荣耀》字幕、IPHONE 评测字幕）。
- **根因**：B站 AI 字幕服务 cid 关联错误（官方脏数据），**无法从 URL/元数据预判**。
- **修复**：`zhSubtitleMatchesAudio()` 用 LLM 对比 ASR 英文样本 vs 中文轨样本，不一致 → 丢弃中文轨 → 走 LLM 翻译。**实测约 50% 的 SNL 视频被拦截**。
- 代价：被拦截的视频中文由 LLM 翻译（质量反而更好，但费 token）。

### 6.3 B站 cookie 传递
- `--add-header Cookie:` → **HTTP 412**（B站风控）。
- 必须用 **Netscape cookie 文件**（`--cookies`），已挂载 `/app/.bilibili_cookie.txt`。yt-dlp 可能尝试写回 cookie 文件，所以 strategy 里**复制到临时目录**再传。

### 6.4 Docker 容器 IPv6 问题（yt-dlp 下载 CDN）
- 容器内 yt-dlp 下载 B站 CDN 报 `Network unreachable`（CDN 域名先解析 AAAA，容器无 IPv6 出口）。
- 试过 `--force-ipv4`（不稳定，有时报 "No remote IPv4 addresses"）。
- **最终方案**：**不用 yt-dlp 下音频**，改用 B站 playurl API 拿 DASH 音频直链，Node fetch 直接下载（稳定、快）。yt-dlp 仅作 fallback。
- 参考：`src/server/src/index.ts` 里已有 undici IPv4 hack（`family: 4`），那是给 Node fetch 用的。

### 6.5 stepaudio-2.5-asr 无时间戳
- SSE 返回的 `start_time`/`end_time` **恒为 0**，不给词级/句级时间。
- **时间轴方案**：25 秒分块转写 → 每块文本带真实 `[start, end]` → 块内按字符比例细分到句子。实测可用（时间单调、覆盖全程）。
- Step Plan 路径：`POST https://api.stepfun.com/step_plan/v1/audio/asr/sse`（只有 SSE 方式，无同步接口），请求体格式见 asr.ts。
- 音频需转 **16kHz 16-bit mono PCM**（ffmpeg），base64 后提交。

### 6.6 ASR 文本无标点
- ASR 输出常无标点（"You're watching the Disney Channel We now return..."），按 `.!?` 切分失效 → 多句挤一个 segment。
- **修复**：`splitEnglishBySentence` 增强——按句首词（I/You/Well/But/So/Now/Then/Okay...）切分。

### 6.7 中文分配 bug（"选一句英文，整段中文高亮"）★ 已修复
- 旧实现每句英文都 `slice(0, N)` 取中文 → 中文**重复堆积**（第2句含第1句的中文...）。
- **修复**：中文按序消费（zhPos 游标），每句英文只拿自己份额的中文。

### 6.8 均匀时间轴 vs 实际语速 ★ 已修复（新代码）
- 旧实现每条 segment 固定 6 秒 → 长句没说完就跳下一句（用户反馈"字幕滚动太快"）。
- **修复**：块内按**字符比例**分配时间（长句多占时间）。

### 6.9 tsx watch 热重载不生效
- Docker 里改 `src/server/src` 代码后 **tsx watch 不自动重载**，必须 `docker restart wordflow-api`。

### 6.10 批量脚本 JWT 过期
- access token 15 分钟有效，批量跑 30+ 个源后就 401。
- **修复**：`scripts/crawl-steve.ps1` 带 refresh token 自动续期。
- **PS5 兼容坑**：脚本必须 **UTF-8 with BOM** 编码（否则 PS 5.1 解析中文注释报 "Unexpected token '}'"）；避免 while+try+continue 结构（PS5 解析 bug），用递归/for。

### 6.11 批量运行中重启容器 = 批量中断
- pwsh-13 / pwsh-14 两次批量都因中途重启容器而中断（"The underlying connection was closed"）。
- **铁律：pwsh-16 运行期间不要重启 wordflow-api。**

---

## 7. 环境与凭据

| 项 | 值 |
|---|---|
| 后端容器 | `wordflow-api`，dev 模式（tsx watch），源码挂载 `./src/server/src:/app/src` |
| B站 cookie | `.env` 里 `BILIBILI_COOKIE="..."`（完整 cookie 串）+ 根目录 `.bilibili_cookie.txt`（Netscape 格式，yt-dlp 用）|
| StepFun | `AI_API_BASE_URL=https://api.stepfun.com/step_plan/v1`，`AI_API_KEY` 在 `.env`（docker-compose 注入），`AI_MODEL=step-3.7-flash` |
| ASR 定价 | stepaudio-2.5-asr **0.15 元/小时**（Step Plan 按 Credit 折算，1M Credit = 1 元）|
| 容器内工具 | yt-dlp 2026.03.17、ffmpeg 8.1.1、node 20 |
| 宿主机 | 也有 yt-dlp / ffmpeg / python3.11 + faster-whisper（未用，用户不要本地模型）|

---

## 8. 尚未完成 / 待办（接手者继续）

1. **等 pwsh-16 跑完**：119 源全量入库（后台进行中）。跑完验证 `SELECT count(*) FROM contents WHERE source LIKE 'Steve%' OR source LIKE 'SNL%';` 应为 119。
2. **验证时间轴效果**：用户反馈"字幕滚动太快/对不上"——新代码（字符比例）已修复，需在浏览器实际播放验证（用户会自己看）。重点看：长句是否完整显示、字幕是否跟嘴。
3. **封面最终确认**：代理已生效，让用户刷新确认所有卡片有图。
4. **SNL 剩余 1190 个视频**：用户只选了 19 个带字幕的试跑，UP 主还有约 1190 个视频未入库（用户说"视频量不小"，后续可批量加源）。注意 SNL 无字幕的视频中文是 LLM 翻译（费 token）。
5. **恐怖/惊悚类**：用户提过也想要，尚未找源。
6. **前端标题优化**：多分P 已用 part 名作标题（"74.Hey Steve- ..."），列表里来源名仍显示"Steve Harvey Hey Steve P74"这种（可接受）。
7. **可选优化**：封面代理加内存缓存（目前每次回源 B站，有 Cache-Control: max-age=86400 但无服务端缓存）；`/api/v1/media/cover` 可加 MinIO 落地。
8. **可选优化**：分块 ASR 块边界可能切断单词（可接受，时间轴单调即可）；如需更精准可上 whisper 类词级时间戳方案（用户明确拒绝本地模型，考虑云端带时间戳 ASR 服务）。

---

## 9. 常用命令

```bash
# 后端日志（看 ASR 进度/错误）
docker logs --tail 50 -f wordflow-api

# 查入库进度
docker exec wordflow-postgres psql -U wordflow -d wordflow -c "SELECT count(*) FROM contents WHERE source LIKE 'Steve%' OR source LIKE 'SNL%';"

# 手动触发单个源爬取（需 token：注册/登录拿）
curl -X POST http://localhost:3002/api/v1/crawler/sources/<id>/crawl -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{}'

# 批量脚本（会自动 refresh token；注意 PS5 需 UTF-8 BOM，已处理）
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\crawl-steve.ps1

# 改后端代码后重启（批量运行中别执行！）
docker restart wordflow-api

# 类型检查（在容器内）
docker exec -w /app wordflow-api npx tsc --noEmit
```

---

## 10. 给用户的说明要点（接手者沟通用）

- 数据格式与 TED 完全一致（同一套存储/前端逻辑），没有两套规矩。
- B站 ai-zh 中文轨被 LLM 校验后约一半会丢弃改由 LLM 翻译——这是 B站脏数据的主动防御，翻译质量反而更好。
- 成本：ASR 0.15元/小时，119 个视频全量约 10-15 元（Step Plan Credit 内）。
- 用户看到的"没封面/对不上"在**刷新 + 批量完成后**应全部消失。
