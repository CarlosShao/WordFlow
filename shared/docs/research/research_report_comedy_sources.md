# 英语喜剧/脱口秀/小品类双语字幕视频源调研报告（第三轮）

## 执行摘要

用户需要"喜剧/脱口秀/小品类"的英语内容用于学习，要求中英双语字幕且可程序化爬取。本轮实测 + 调研结论：**B 站喜剧内容（含大量"【双语字幕】"标题视频）实测确认字幕接口返回空——UP 主字幕均为烧录进画面的硬字幕，无法程序化提取，B 站喜剧路线不可行**。真正可行的路线是 **YouTube 喜剧频道白名单（Dry Bar Comedy、Netflix Is A Joke、Late Night 脱口秀等）+ 人工英文 CC 字幕 + 现有 LLM 管道翻译中文**：这些频道提供大量免费完整专场/片段，英文人工字幕覆盖好，中文用 DeepSeek 翻译保证质量（复用第一轮已验证的 youtube-transcript-api 获取链路）。

## 实测：B 站喜剧视频字幕接口验证

用 B 站官方字幕接口 `x/player/wbi/v2`（带完整登录 cookie）实测了一个典型喜剧合集：
- 视频：`BV1diEtzTEhR`《【双语字幕】适合儿童的单口秀 Stand up comedy for kids》，73 集合集，标题全部标注"双语字幕"
- 实测结果：`subtitle code: 0`（接口正常返回）但 **`count: 0`（无任何可提取字幕轨道）**

结论：B 站 UP 主自制的"中英双语字幕"几乎都是**硬字幕（烧录在视频画面里）**，B 站没有对应的 CC/AI 字幕轨道，现有 backfill 方式（`x/player/wbi/v2`）拿不到。这与第一轮 B 站实测结论一致，也解释了为什么 WordFlow 现有 B 站接入对喜剧类内容无效。

## YouTube 喜剧频道资源盘点

以下频道提供**免费完整 stand-up 专场或喜剧片段**，英文 CC 字幕覆盖好（人工上传或高质量 ASR），可通过 youtube-transcript-api 获取英文轨（秒级时间戳），中文由 WordFlow 现有 LLM 翻译：

| 频道/节目 | 内容形式 | 英文 CC 质量 | 获取便利度 |
|-----------|---------|-------------|-----------|
| **Dry Bar Comedy** | 完整 stand-up 专场（15-30 分钟），数百个 | 好（专业录制） | 高 |
| **Netflix Is A Joke** | Netflix 官方，完整专场/片段 | 好 | 高 |
| **Don't Tell Comedy** | 秘密场地 stand-up | 好 | 高 |
| **The Tonight Show (Fallon)** | 脱口秀访谈/段子 | 好 | 中（节选多） |
| **The Late Show (Colbert)** | 脱口秀 | 好 | 中 |
| **Jimmy Kimmel Live** | 脱口秀 | 好 | 中 |
| **Late Night (Seth Meyers)** | 脱口秀 | 好 | 中 |
| **The Daily Show** | 新闻讽刺 | 好 | 中 |
| **Comedy Central** | stand-up/小品 | 好 | 中 |
| **Whose Line Is It Anyway** | 即兴喜剧小品 | 好 | 中 |
| **Kevin Hart / Gabriel Iglesias / John Mulaney / Jim Gaffigan / Trevor Noah / Ricky Gervais** | 各人官方频道完整专场 | 好 | 高 |

**适配性评估**：stand-up 内容口语化程度高（俚语、文化梗、节奏感），对英语学习价值高，但翻译难度大——需要 LLM 翻译管道具备上下文理解能力（WordFlow 现有 DeepSeek 管道可胜任），且用户需接受"英文人工字幕 + 中文 AI 翻译"的质量组合（中文为机翻级，非人工）。

## 其他候选评估

| 来源 | 结论 |
|------|------|
| B 站喜剧双语搬运 | 实测硬字幕，不可提取（排除） |
| 字幕组站（zimuku/subhd） | 有脱口秀专场双语字幕，但需匹配视频文件，与"流式播放+字幕"模式不匹配 |
| 每日英语听力/可可英语 | 有脱口秀分类，但 VIP 付费墙 + 客户端加密，不可爬 |
| scrapsfromtheloft 等转录站 | 纯文字无时间轴，需自行对齐 |
| 情景喜剧（Friends/Office 等） | 字幕易得，但视频源是版权内容，大陆无合法可播放源 |

## 推荐接入方案

**主路线：YouTube 喜剧频道白名单 + 人工英文 CC + LLM 中文翻译**
1. 在现有 `youtubeStrategy` 基础上，维护一个喜剧频道/艺人白名单（Dry Bar Comedy、Netflix Is A Joke 等），按频道抓取视频列表。
2. 用 youtube-transcript-api（或 yt-dlp）获取英文人工 CC 字幕（`find_manually_created_transcript(['en'])`，失败降级 `find_generated_transcript`）。
3. 中文用现有 `translator.ts`（DeepSeek）翻译英文轨，质量标记为 `human_source_ai_translation`。
4. 视频流走已有 YouTube 播放链路（需代理）。

**前置条件**：服务器需能访问 YouTube（代理）。当前开发机代理未开启，需用户开启 Clash（127.0.0.1:7890）后才能实测联调。

## 限制

- B 站喜剧内容确认不可爬（硬字幕），本轮已实测否决。
- YouTube 路线依赖代理 + 非公开接口（youtube-transcript-api），有失效风险。
- 中文为 AI 翻译（质量介于机器翻译与人工之间），需产品层面向用户说明质量等级。
- 本次 YouTube 频道字幕覆盖率为调研结论（代理当前未开，未逐频道实测），接入后需抽样验证各频道字幕可用性。

## 参考文献

1. [Dry Bar Comedy 官方频道](https://www.youtube.com/@DryBarComedy)
2. [Netflix Is A Joke 官方频道](https://www.youtube.com/@NetflixIsAJoke)
3. [youtube-transcript-api（GitHub）](https://github.com/jdepoix/youtube-transcript-api)
4. [yt-dlp 官方 README](https://github.com/yt-dlp/yt-dlp)
5. [scrapsfromtheloft（stand-up 台词站）](https://scrapsfromtheloft.com/)
