# 工单：三模块审查问题修复（例句库 / AI练习 / 错题本）

> 来源：2026-09-06 全链路功能审查与实机诊断。
> 执行约束：
> 1. 另一会话正在编辑以下文件，**一律不得修改**：`src/server/scripts/import-hellocet.ts`、`src/web/src/api/client.ts`、`src/web/src/utils/http.ts`、`src/web/src/components/SettingsDialog.vue`、`src/web/src/views/ExamBookPage.vue`、`src/web/src/views/ExamPracticePage.vue`
> 2. 不执行 git commit/push，改动只留工作区
> 3. 每单完成后跑校验：server `npm run build`（tsc）、`npm run test`（vitest）；web `npx vue-tsc -b`
> 4. 不在任何输出/日志中打印 API key 明文

---

## T1 [P0] AI 出题判分修复：correctAnswer 字母 → 选项全文

**背景**：实测 LLM 返回 `"correctAnswer": "C"`（选项字母），前端判分用选项全文与它比较，导致 AI 题目永远判错、正确答案永不高亮、得分恒 0。

- [x] 后端 `src/server/src/modules/ai/index.ts`（generate-question 的 content/direct 模式 systemPrompt，约 :232）：明确要求 `correctAnswer` 必须**原样复制 options 数组中的某一项全文**，禁止返回字母编号
- [x] 前端 `src/web/src/api/ai.ts`（generateQuestions 映射，约 :95-105）：双保险——若 `correctAnswer` 是单个字母 A-D 且 `options` 存在，归一化为对应选项全文

## T2 [P0] 练习页修复：失败可见化 + 题型枚举 + 填空死胡同

**背景**：练习页所有失败被静默吞掉（store 有 error、模板不渲染）；「阅读理解」必 500；「完形填空」选项为空数组导致无法作答；答错也弹「回答正确」；难度筛选参数从未送达后端。

- [x] 后端 `src/server/src/modules/practice/index.ts`：`createPracticeSchema.questionTypes` 枚举加入 `'READING_COMPREHENSION'`（QUESTION_TYPE_MAP :17 已支持）；`createPracticeSchema` 增加 `difficulty` 可选字段——若 `Vocabulary` model 存在 difficulty 字段则按 CEFR→Difficulty 映射过滤抽词（A1/A2→BEGINNER/ELEMENTARY、B1/B2→INTERMEDIATE/UPPER_INTERMEDIATE、C1/C2→ADVANCED/PROFICIENT），无该字段则接受参数但不影响行为
- [x] 前端 `src/web/src/api/practice.ts`：`createSession` 请求体带上 `difficulty`；`normalizeQuestion` 把后端 `CLOZE`/`FILL_BLANK` 映射为 `fill-blank`、`LISTENING` 映射为 `listening`
- [x] 前端 `src/web/src/views/PracticePage.vue`：渲染 `practice.error` 错误条（含重试）；`fill-blank`/`listening` 题渲染文本输入框（回车/检查按钮提交，调 `practice.submitAnswer(answer)`）；修复 submitAnswer 的 toast 判断——用提交结果的真实对错，而不是 `correctAnswer` 字符串真值

## T3 [P0] 错题本前端适配后端契约 + review 语义 + userAnswer 落库

**背景**：后端 mistakes 模块完整可用，前端按一套从未实现的契约编写（嵌套 question 对象 / reviewedAt / 小写状态 / 参数名 masteryStatus+type+pageSize），列表渲染崩坏、筛选恒空、「已掌握」需点两次、「你的答案」永远为空。

- [x] 后端 `src/server/src/modules/mistakes/index.ts`：`POST /:id/review` 改为接受显式 `{ status: 'NOT_REVIEWED' | 'REVIEWING' | 'MASTERED' }` 直接设置 masteryStatus（zod 校验 + 属主校验保留），不再依赖 reviewCount 阈值；保持响应结构不变
- [x] 后端 `src/server/src/modules/practice/index.ts`（submit 的 mistake upsert，约 :173-189）：create 与 update 分支都补写 `userAnswer: answer`
- [x] 前端 `src/web/src/types/index.ts`：重写 `MistakeRecord` 为后端扁平契约（`questionType`/`question: string`/`correctAnswer`/`userAnswer?`/`wrongAnswer?`/`explanation?`/`masteryStatus: 'NOT_REVIEWED'|'REVIEWING'|'MASTERED'`/`reviewCount`/`lastWrongAt`/`lastReviewDate`）
- [x] 前端 `src/web/src/api/mistakes.ts`：查询参数改为后端契约（`mastery`（大写枚举）/`limit`/`sortBy`/`sortOrder`/`page`），去掉双重断言；review 调用发送 `{ status }`
- [x] 前端 `src/web/src/stores/mistakes.ts` + `src/web/src/views/MistakesPage.vue`：适配扁平字段（题干用 `mistake.question` 字符串、你的答案用 `mistake.userAnswer ?? mistake.wrongAnswer`、日期用 `lastWrongAt`、状态用大写枚举映射文案与样式类）；筛选 tab 值改为大写枚举并走后端 `mastery` 参数（或本地大写比较）；「标记为已掌握/复习中」单击即生效

## T4 [P1] 例句库落地：实现搜索后端 + 前端错误可见与安全修复

**背景**：前端壳子指向从未存在的 `GET /api/v1/ai/examples/search`，数据库无例句表；404 被伪装成「找到 0 条结果」；高亮正则未转义 + v-html XSS。

- [x] 后端新增 `GET /api/v1/ai/examples/search`（放 `src/server/src/modules/ai/index.ts`）：鉴权 `preHandler: [app.authenticate]`；参数 `keyword`（必填）/`difficulty`（CEFR，可选）/`page`/`limit`（默认 20，上限 50）；数据源优先级：① 当前用户 `Vocabulary.examples`（Json string[]，含 word/translation 上下文）② `DictionaryEntry.payload` 中的例句（执行时探明结构，不可用则跳过并注明）；CEFR→Difficulty 枚举映射过滤；返回 `{ success, data: [{ word, translation, sentence, translation?, source, difficulty }], meta: { page, limit, total } }`
- [x] 前端 `src/web/src/api/examples.ts`：返回类型补 meta 分页
- [x] 前端 `src/web/src/views/ExamplesPage.vue`：错误态展示（区分「无结果」与「请求失败」）；`highlightText` 对关键词做正则转义、对原文做 HTML 转义后再进 `v-html`；难度点击即触发搜索；未搜索时显示引导空态

## T5 [P1] 配置修复：.env 失效 AI_API_KEY 替换

**背景**：实测 `.env` 的 `AI_API_KEY` 返回 401「该令牌状态不可用」；`ai_providers` 表中 agnes（主力）key 实测 200 有效。影响：设置页「测试连接」默认路径必失败、direct fetch 回落坏 key、providers 表清空时全线瘫痪。

- [x] 用脚本从 `ai_providers` 表读取 agnes 主力 key 写入 `src/server/.env` 的 `AI_API_KEY`（文件已 gitignore，不打印明文），同时核对 `AI_API_BASE_URL`/`AI_MODEL` 与该 provider 一致

## T6 [P1] AI 空结果显式报错 + LLM 调用超时

- [x] 前端 `src/web/src/api/ai.ts`：`generateQuestions` 收到 `null`/空时抛出「AI 返回格式异常，请重试」而非静默返回 `[]`（vocabulary 模式单题返回 `{data:对象}` 不受影响）
- [x] 前端 `src/web/src/components/AIQuestionGenerator.vue`：生成结果为空数组时展示明确错误提示而非无声回到按钮态
- [x] 后端 `src/server/src/modules/ai-processing/llm.ts`：`callWithProvider` 无外部 signal 时默认 `AbortSignal.timeout(120_000)`；`src/server/src/modules/ai/index.ts` 直连 fetch（callLlm 自定义分支、test-connection 已有）补同样超时

## T7 [P1] 全局 errorHandler 兜住 ZodError

- [x] `src/server/src/common/errors.ts`：errorHandler 增加 `ZodError` 分支 → 400 + `INVALID_PARAMS` + 字段错误摘要（当前一律 500 "Internal server error"）

## T8 [P1] 生产部署双前缀修复

- [x] `deploy/nginx/wordflow.conf`：`location /api/` 的 `proxy_pass` 改为带尾斜杠 URI 重写（`proxy_pass http://wordflow_api/;`），消除前端 `/api` baseURL + 后端 `/api/v1` 叠加出的 `/api/api/v1/*`；加注释说明。属部署配置，需上线时实测验证

---

## 执行记录（2026-09-06）

- 执行方式：子代理通道被并发限制阻塞，全部工单由主代理串行执行完成
- T1：后端 prompt 约束由另一并行会话先行完成（内容与工单一致），本会话补前端 normalizeCorrectAnswer 双保险
- T2：难度过滤未真正实现——Vocabulary 无 difficulty 列（需 migration），后端仅接受参数；reading-comprehension 前端兜底为词义选择题（本地规则出不了带文章的 RC 题）
- T3：响应 meta 被 client 拦截器丢弃（client.ts 正被另一会话编辑，未动），列表请求改用后端上限 limit=100 缓解分页缺失
- T4：数据源实测为 DictionaryEntry.payload.examples（{cn,en} 双语对，10 万+词目），blng_sents_part 结构不存在；difficulty 同样无数据支撑，接受参数不过滤
- 校验：server tsc 0 error；web vue-tsc 本会话触碰文件 0 error；vitest 75 通过 / 11 失败——失败项与改动前基线完全一致（ai-processing 8、upload 1、auth 2，既有问题）
- 例句搜索实测：keyword=expand 命中 3 条双语例句

## 暂缓（本期不做，已记录）

- exam（真题）答错自动入错题本 —— 需产品确认错题归属词汇的映射规则
- Mistake 列表 `lastWrongAt` 复合索引 —— 数据量上来后再加 migration
- 例句库独立 Sentence 表 + 词典爬取例句回填 —— T4 先用既有数据验证需求
- 练习主观题 LLM 评分（gradeAnswer 目前仅精确匹配）
- PracticePage 限时模式下 listening 题的音频播放交互


---

# GUI 自动化验收记录（2026-09-06 下午）

测试方式：ZCode 内置浏览器黑盒 GUI 测试（真实点击/输入 + DOM 快照 + 截图交叉验证），测试账号 e2e-accept@wordflow-test.local（API 注册 + DB 播种 6 个到期词汇）。截图证据：audit_tmp/gui-test-screenshots/。

## 验收中发现并修复的问题

| # | 级别 | 问题 | 根因 | 修复 | 复测 |
|---|---|---|---|---|---|
| 1 | P0 | 登录成功后停在 /login 不跳转 | stores/auth.ts 的 isAuthenticated 计算属性只读 localStorage（非响应式），首次求值缓存 false 后永不失效，路由守卫一直判未登录 | 增加 accessToken ref 响应式镜像，所有 setTokens 调用统一走 persistTokens | ✅ 登出→登录→/dashboard |
| 2 | 环境 | 例句搜索 404 / ZodError 仍 500 | wordflow-api Docker 容器 tsx watch 在 Windows bind mount 上收不到文件事件，运行 10h 前的旧代码 | docker restart；后续代码改动均需 restart | ✅ |
| 3 | P1 | 填空题「提交答案」按钮永远禁用（T2 实现缺陷） | 按钮 disabled 绑定 practice.selectedAnswer，文本输入只更新本地 textInput | 新增 canSubmit 计算属性 + onSubmitClick 统一入口 | ✅ 填空提交/判分/解析 |
| 4 | P1 | 设置页「测试连接」仍 401 | compose 用 ${AI_API_KEY} 从项目根 .env 注入容器，根 .env 里是失效旧 key（24 字符） | 根 .env 更新为库内有效 key + docker compose up -d api 重建 | ✅ 连接成功 200 |
| 5 | P2 | 错题解析显示「暂无解析」 | practice 写错题时未落 explanation | upsert create+update 分支补写；API 实测落库 | ✅ |
| 6 | P2 | 练习完成后题卡与结果卡同屏 | 模板两个 section 条件独立 | 题卡条件加 !showResults | ✅ |
| 7 | P3 | 个人中心「加入时间：-」 | 后端 profile 返回 createdAt，前端契约要 joinDate | 后端响应补 joinDate 别名 | ✅ 2026年9月6日 |

## 验收结论（全部通过）

- 例句库：expand 搜索 4 条双语例句+高亮；C++ 不崩溃；空词空态；难度点击即搜
- 练习页：完形填空（输入框）/阅读理解（不再 500，兜底选择题）/语法专项（选项判分）全部可练；答对/答错 toast 正确；完成只显示结果卡
- 错题本：6 条错题字段完整（你的答案/正确答案/日期/词徽章）；tab 筛选正确（服务端 mastery 参数）；一键掌握单击生效；统计实时更新
- AI 抽屉：10s 生成 4 题（选择/判断/填空混合）；答对「正确」+选项标绿；答错「错误」+正确项标绿；换一批正常
- 回归：词汇页 10 万词典正常；设置弹窗渲染正常；深色主题正常；test-connection 连接成功

| 8 | P1 | 错误卡不显示具体原因（真实用户 CarlosShao 点开始练习只见「练习加载失败」） | ErrorState 组件 prop 是 message，三个页面传的是 :description（T2/T3 引入）；根因是用户账号 0 词汇触发 NO_DATA 400，指导文案被吞 | 三处改 :message；练习页对无词汇错误增加「去添加词汇」引导按钮+说明文案 | 无词汇账号实测：完整文案显示、按钮跳转词汇页 ✅ |

| 9 | **P0 产品断裂** | 词汇页叫「词汇」但只展示词典库（102,829 词全局共享），**没有任何「加入生词本」入口**——用户无法积累生词本（Vocabulary），练习功能对所有无生词用户是死路；CarlosShao 生词本 0 条即此原因（数据已三重复核：唯一账号、2026-08-10 注册、Vocabulary 0 条；「生词本最多 8163 条」是 System 导入账号） | 词典浏览与个人生词本概念混用，收藏入口缺失 | ① 词典词条卡片加「+ 生词本」按钮（@click.stop 防冒泡，带词典释义/音标/例句一起收藏，api addWord 扩展 translation/phonetic/examples 字段，后端 schema 本就支持无需重启）② 409 重复收藏友好处理 ③ 副标题说明「点+生词本收藏后可用于 AI 练习」 | 实测：无词汇账号收藏「-ence」→ 按钮变 ✓ 已加入 → 练习成功出题（第1题/共1题）✅ |

## 环境注意事项（重要）

1. **Windows bind mount 下容器内 tsx watch 收不到文件变更**：修改 src/server 代码后必须执行 `docker restart wordflow-api`（若根 .env 变更则执行 `docker compose up -d api` 重建）
2. **compose 的 ${AI_API_KEY} 读项目根 .env**，与 src/server/.env 是两套——换 key 要两处同步（建议后续统一为 env_file 挂载）
3. 测试数据保留：账号 e2e-accept@wordflow-test.local 及其词汇/错题（命名可辨识，dev 库无碍）
