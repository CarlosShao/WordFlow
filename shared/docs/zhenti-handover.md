# 真题模块交接文档（2026-08-15 补写）

> 本交接文档由 CodeBuddy 在 harness（DeepSeek dsh）session 中断后补写。
> 原始 session log：`dsh-session-session-35916245-3897-48c4-979e-246af7621f97.zip`（14994 行）。
> 中断原因：`429 GoUsageLimitError - Monthly usage limit reached`（DeepSeek 月度额度用尽，24h 后重置）。

## 一、整体目标（goal-793dc09b）

将 `E:\work\data\English\` 下的 **TOEFL（TPO1-75 听力/阅读/口语，写作暂缓）** 与 **IELTS（剑4-20 A/G 类）** 真题数据整理清洗入库到 WordFlow 数据库（ExamBook / Content / ContentQuestion），并打通服务端 API 与前端真题练习页面。个别缺失数据（TPO64/65 L4、TPO50-53 阅读解析、TPO3/38 写作音频、四六级）跳过不做。

## 二、已完成（session turn 6-7 落盘，已验证）

### 数据入库（Phase 1-2，已完成 ✅）
| 模块 | 数量 | 说明 |
|---|---|---|
| exam_books | 73 | TOEFL TPO 1-75（category=TOEFL） |
| contents | 2799 | 听力 LISTENING 413 + 口语 SPEAKING 88 + 阅读 ARTICLE 223（+原有 2047） |
| content_questions | **2979** | 听力 2322 + 阅读 657 |
| 真题音频 | 479 | 390 听力 + 55 口语 + 34 已有（MinIO wordflow-uploads） |

解析脚本：`src/scripts/zhenti/`（parse_listen_docx.py / parse_v3.py / parse_new_dir.py / parse_speaking.py / parse_reading.py / merge_final.py 等）
导入脚本：`src/server/src/scripts/`（import-toefl.ts / import-speaking.ts / import-reading.ts）

### 后端 API（Phase 3a，已完成 ✅）
`src/server/src/modules/exam/index.ts`，已在 `src/server/src/index.ts` 注册：
- `GET /api/v1/exam/books?category=TOEFL|IELTS` — 书列表（每书 sectionCount + questionCount，按 createdAt 排序解决 TPO9/10 字典序问题）
- `GET /api/v1/exam/books/:id` — 书详情 + sections（含题目数/音频/类型）
- `GET /api/v1/exam/content/:id/questions` — 段题目列表（含答案）

已验证：73 本书、TPO1 详情 6 段、题目+答案正确返回。

### 前端（Phase 3b，接续完成 ✅）
- `src/web/src/api/exam.ts` — API client
- `src/web/src/views/ExamPage.vue` — 真题列表页（TOEFL/IELTS 筛选）
- `src/web/src/views/ExamBookPage.vue` — 书详情（段列表）
- `src/web/src/views/ExamPracticePage.vue` — 做题页（音频播放 + 逐题作答 + 对答案）
- **路由注册（断点处补齐）**：`src/web/src/router/index.ts` 新增 `/exam`（真题，导航入口由 App.vue 自动生成）、`/exam/book/:id`、`/exam/content/:id`
- **修复**：`ExamPracticePage.vue` 选项高亮比较 `selections[q.id] === letter(oi)` 应为 `.includes()`（原代码会导致选项选中高亮不生效，且 vue-tsc 报 TS2367）
- 前端 vue-tsc 类型检查 + vite 编译全部通过（注意：项目其他文件有既有 TS 错误，如 articles/content/listening/practice/mocks，与真题任务无关，勿动）

## 三、中断点（session turn 7 step 22）

- turn 7 目标：Phase 3（API + 前端）
- step 1-15：后端 exam 模块 3 条 API 全部打通并验证
- step 16-21：前端 api client + 3 个页面写完
- **step 22：正要注册前端路由时，429 用量上限中断**
- 接续工作（CodeBuddy 已完成）：注册路由 + 修复类型错误 + 全面验证 + **IELTS 剑17 全量解析入库 + 前端新题型支持**（见下）

## 四、IELTS（Phase 1e：已完成剑17 样板，方案已验证）

### 核心方案：视觉大模型解析（2026-08-15 确立，用户指定）
**pdfplumber 文本层对扫描件/OCR 拆字（`3 2`→32、漏行）不可靠，且剑16/18/20/G类本来就是扫描件。最终方案：用 stepfun 视觉模型 `step-3.7-flash`（OpenAI 兼容接口，原生多模态）直接识别 PDF 页面渲染图。**

- 脚本：`src/scripts/zhenti/parse_ielts_vlm.py`
  - `pages_to_png()`：PyMuPDF 渲染 PDF 页（zoom=2.0），PIL 纵向拼接多页（跨页题合并）
  - `ask_vision()`：POST `{apiBaseUrl}/chat/completions`，`content` 数组含 `image_url`（data:image/png;base64）+ text 指令，temperature=0
  - 听力指令：每 Part 页（题1-10/11-20/21-30/31-40）→ 输出题目 JSON `[{no,stem,options,type}]`
  - 阅读指令：每 Passage 的题目页（含正文，模型只提取题目）→ 题目 JSON（TFNG/YNNG/MATCHING/COMPLETION/MCQ）
  - 答案指令：答案页 → 输出 `{L1:..L40, R1:..R40}`（L/R 前缀区分听力阅读，避免键冲突），多选 IN EITHER ORDER 自动拆成 A/D
  - 缓存机制：每页结果存 `cache/ielts_q_{label}.json` + `cache/ielts_ans_T{n}.json`，断点续跑（重启电脑也能继续）
  - **经验**：① 模型偶尔漏题，补齐后对题号不连续的页删缓存重跑即可；② 答案页必须 L/R 前缀，否则纯数字键 L1/R1 冲突；③ 题型枚举：schema 已含 MCQ/MCQ_MULTI/TRUE_FALSE_NOT_GIVEN/MATCHING/COMPLETION

### 已完成：剑17 A类（4 Test × 80 = 320 题全对，已入库含音频）
| 项目 | 结果 |
|---|---|
| 答案页布局 | T1 L=118 R=119 \| T2 L=120 R=121 \| T3 L=122 R=123 \| T4 L=124 R=125（idx122 上半是得分表下半是 T3 L 答案） |
| 验证 | Test1 对照官方答案 **80/80 正确**；4 Test 全 320 题 + 320 答案 |
| 入库 | 320 题 + 16 音频（MinIO `ielts/17/tN_partM.mp3`） |
| 前端 | `ExamPracticePage.vue` 扩展支持 COMPLETION、TRUE_FALSE_NOT_GIVEN、MATCHING；题号显示 `q.order` |

### 已完成：剑18 A类（4 Test × 80 = 320 题全对，已入库）
- 扫描件 PDF，视觉模型直接 OCR，4 Test 答案页 L40+R40 完整提取
- 缺题已补（`IELTS_FORCE_LABELS=T3-R2,T3-R3,T4-R2` 重跑；T4-R1 R9 答案用 `IELTS_ANS_VER=v2` 重跑）
- 已入库：28 contents + 320 questions（无音频）

### 已完成：剑19 A类（4 Test × 80 = 320 题全对，已入库）
- 扫描件，**视觉探测页面（逐页分类 `_scan_pages.py`）+ 逐页题目识别合并去重**
- 入库：28 contents + 320 questions + 320 answers（音频未配）
- 答案页布局实测：每 Test 2 页（L 页 + R 页），T1=[120,121] T2=[122,123] T3=[124,125] T4=[126,127]
- 关键坑：剑19 阅读**文章页与题目页分离**（R1 文章 idx16、题目在 idx18/19），必须扫描整个 Passage 范围
- 扫描范围上限：`min(起页+6, max_p)`，max_p=下一 Passage 起页 或 下一 Test 听力起页 或 答案页-2，避免扫到 Audioscripts 超时
- 答案缓存版本化：`IELTS_ANS_VER=v2` 换缓存文件名避免旧答案污染

### 其余剑册推进
- **剑1-16、20**（含扫描件剑16/20）：复用 `parse_ielts_all.py` + `probe_final_{n}.json`（扫描件需先视觉逐页探测）
- 音频映射：各册命名不一（剑10 是 `TestN/SectionM.mp3`，剑17 是 `ELT_IELTS17_tN_audioM.mp3`），入库脚本需按册适配
- 答案页索引每册不同，需先 dump 定位（`Listening and Reading answer keys` 起始页）

## 五、已知坑 / 经验

1. **B 站 API 限流**：真题数据是本地文件，不走爬虫链路（ielts.ts/toefl.ts 是爬网页的，无关）
2. **zod coerce.boolean bug**（已修）：`MINIO_USE_SSL='false'` 会被转成 `true`，导致音频上传 SSL 失败。config/index.ts 已修复
3. **Prisma Client 与 DB 不同步**：`db push` 不会 regenerate client，导入脚本/容器内需 `npx prisma generate`（容器内要 `docker exec wordflow-api npx prisma generate`）
4. **schema 变更用 `db push` 而非 `migrate dev`**：migrate dev 会想 reset 数据库（丢数据）
5. **前端类型错误**：`src/web/src/api/*.ts` 里 axios response 直接 `.data` 的类型断言问题（`(data as unknown as { data }).data` 模式）；既有错误勿动
6. **音频上传幂等**：导入脚本按 source+sourceUrl 唯一键 upsert，题目先 deleteMany 再 create
