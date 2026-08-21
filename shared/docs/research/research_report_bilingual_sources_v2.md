# WordFlow 高质量中英双语字幕视频源深挖报告（第二轮）

## 执行摘要

本轮找到**两个真正可行的高质量双语来源**。最大发现是 **网易公开课（open.163.com）**：实测确认其公开 JSON 接口免登录返回**人工翻译的中英双语 SRT 字幕（时间戳逐条对齐）+ 可播放的 m3u8/MP4 视频流**，大陆直连，是继 TED 之后第二个"人工双语+免登录+直连"的来源，且存量巨大（TED 数千集 + 哈佛/耶鲁/MIT/斯坦福名校公开课）。第二路线是 **YouTube 白名单频道人工英文 CC 字幕 + 项目现有 LLM 翻译成中文**——把"YouTube 中文轨是机器翻译"的短板绕过去，用人工英文 + DeepSeek 翻译保证双语质量。

## 背景

上一轮结论：YouTube 可用但中文轨是机器翻译且常缺简体；TED 人工双语最优但数量有限；B 站无 CC。用户不满意现有双语质量，要求找"高质量中英双语字幕的高质量视频"。本轮按三条路并行调研 + 本机实测。

## 实测：网易公开课（重点，已验证通过）

**链路完全打通，全程免登录、大陆直连**：

1. 课程/视频信息接口：`https://c.open.163.com/open/mob/movie/list.do?plid={plid}`（GET，无 Cookie），返回该课程所有分集的 JSON。
2. 每个分集含 `subList` 数组：`subName: "中文"` 与 `subName: "英文"` 各带 `subUrl`（SRT）和 `subVttUrl`（VTT）直链；另有 `mp4SdUrlOrign`/`m3u8SdUrlOrign` 视频流地址、`subtitleLanguage: "中英双文"`、时长、标题。
3. **字幕质量实测**（MIT 信号与系统课程第 1 集）：英文 SRT 与中文 SRT **cue 数量一致、时间戳逐条完全相同**（如 `00:00:42,000 --> 00:00:44,240` 中英都是同一段），即两轨天然按索引对齐，可直接复用 WordFlow 现有 `alignSubtitles` 的"cue 数相等按索引"路径。
4. **视频流实测**：m3u8 返回正常 `#EXTM3U` 分片列表，MP4 直链存在（`mov.bn.netease.com`），yt-dlp generic extractor 也能解析出 HLS 流（`--list-subs` 显示无内嵌字幕轨，字幕需走上述 JSON 接口而非 yt-dlp）。
5. 课程发现：`open.163.com/ted/` 等旧分类页已 302 到首页，课程列表接口无公开稳定端点；但单个视频页 URL（`open.163.com/movie/.../plid_mid.html` 或 `newview/movie/free?pid=&mid=`）可直接解析出 plid。**推荐接入方式：用户粘贴网易公开课视频/课程链接 → 后端解析 plid → list.do 拉全部分集双语字幕+视频流**。

**内容构成**：TED 演讲数千集（网易官方与 TED 合作、人工翻译）、哈佛/耶鲁/斯坦福/MIT 等名校公开课（数万集）、人文/经济/科学 22 个领域。质量上中文为网易官方组织的人工翻译，与 TED 官网同级别。

## 路线二：YouTube 白名单人工英文 CC + LLM 翻译（可作长期兜底）

- youtube-transcript-api（Python，实测上一轮已通过代理成功拿到秒级时间戳字幕）能区分人工/自动字幕：`find_manually_created_transcript(['en'])` 只返回人工轨，`is_generated` 属性可二次确认。**用人工英文轨 + 项目已有 `translator.ts`（DeepSeek）翻译中文，双语气质量远超 YouTube 机器翻译轨**。
- 白名单频道（人工英文 CC 覆盖率高）：TED、TED-Ed、Kurzgesagt、3Blue1Brown（官方 captions 仓库）、CrashCourse、Veritasium、SciShow、Physics Girl、Numberphile、CGP Grey、VSauce、Vox、DW Documentary、SmarterEveryDay、BBC Earth、National Geographic 等。
- 约束：需代理访问；youtube-transcript-api 依赖非公开接口有失效风险；应"逐视频探测人工字幕，无则跳过/降级"。

## 其他平台结论（本轮新增调研）

| 平台 | 双语质量 | 结论 |
|------|---------|------|
| 每日英语听力 | 人工+机器混杂 | 网页截断+客户端加密+VIP 付费墙，程序化不可行 |
| 可可英语/听力特快 | 人工+机器 | SPA 动态加载需逆向，性价比低 |
| CGTN | 无软字幕（英文硬字幕） | 不可程序化获取 |
| 中国日报双语新闻 | 纯文字稿无时间轴 | 可作文稿资源，非字幕 |
| 可汗学院 | 人工双语（经 YouTube 轨） | yt-dlp extractor 依赖硬编码哈希易失效（已 400），需自行调 GraphQL 拿 youtubeId 再走 YouTube，复杂度高 |
| MIT OCW | 官方英文人工，无中文 | 免登录直连，但需自行 LLM 补中文 |
| Coursera 免费课 | 官方人工中英双语 | onDemand API 免登录可拿字幕，但大陆需代理 |
| 字幕组(zimuku/subhd) | 人工双语 | 教育类覆盖差+需匹配视频文件，与流式模式不匹配 |

## 推荐方案与集成建议

**首选：网易公开课作为 TED 之外的第二大双语视频源。** 集成路径：
1. 后端新增 `strategies/netease.ts`：解析 `open.163.com` URL 取 plid → 调 `list.do` → 遍历 `videoList`，取每集 `subList` 中"中文/英文"的 SRT 直链下载 → 按索引对齐（两轨 cue 数一致）→ 写 `segments`/`content`/`translation`/`duration`。
2. 视频流：把 `mp4SdUrlOrign` 或 m3u8 交给前端播放（`mov.bn.netease.com` 需加进 media proxy 允许域名或直接走 m3u8）。
3. 质量标记：人工双语，等同 `human_bilingual`（与 TED 同级）。
4. 备选：**YouTube 人工英文 CC + LLM 中文** 作为长尾补充，按白名单频道+逐视频探测实现，中文字幕质量按 `human_source_ai_translation` 标记。

## 结论

不用再难受了——**网易公开课就是你要的"高质量中英双语字幕的高质量视频"**：人工双语、时间戳精确对齐、免登录、大陆直连、TED 数千集+名校课程几万集，且视频流可播放。集成复杂度低（一个公开 JSON 接口 + 按索引对齐），比折腾 YouTube/代理/PO Token 省心得多。

## 限制

- 网易公开课平台更新放缓，部分老链接可能失效；课程发现接口不稳定（无公开列表端点），需靠"用户粘贴链接"方式接入。
- YouTube 人工英文轨路线依赖代理与非公开接口，仅作备选。
- 未在 Docker 容器内实测网易公开课接口（本机 curl 已验证，接口无 Cookie 鉴权，容器内应同样可用）。

## 参考文献

1. [网易公开课 open.163.com](https://open.163.com/)
2. [Open163-Downloader（验证 list.do 接口）](https://github.com/JamesHoi/Open163-Downloader)
3. [爬取与处理网易公开课字幕（CSDN）](https://blog.csdn.net/Knightley_K/article/details/121746544)
4. [youtube-transcript-api（GitHub）](https://github.com/jdepoix/youtube-transcript-api)
5. [yt-dlp 官方 README](https://github.com/yt-dlp/yt-dlp)
6. [yt-dlp khanacademy extractor 源码](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/khanacademy.py)
7. [coursera-dl（GitHub）](https://github.com/coursera-dl/coursera-dl)
8. [MIT OCW 官网](https://ocw.mit.edu/)
9. [3Blue1Brown captions 官方仓库](https://github.com/3b1b/captions)
