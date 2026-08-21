# WordFlow 海外双语字幕视频源可行性研究报告

## 执行摘要

实测确认：**YouTube 可以作为 WordFlow 的海外双语字幕视频源，但有两个前提——服务器需能访问 YouTube（当前本机已具备 Clash 代理 127.0.0.1:7890），且字幕获取需采用能绕开 429 限流的工具链（youtube-transcript-api 实测成功，yt-dlp 下载字幕内容被限流）**。本机实测已成功从 YouTube 拉取到带时间戳的英文手动/自动字幕（244 条）与中文机器翻译轨（159 条，时间戳与英文逐条对齐）。其他海外平台（Vimeo、Coursera、Khan Academy、BBC/VOA）各有硬伤，不具备接入价值。

## 背景

WordFlow 现有双语字幕来源只有两条：TED 官网（自带人工 en/zh-Hans 双语字幕，最优）和 B 站（实测大部分视频无 CC 字幕轨道，如 BV1ZHWCz8E6M，无法回填）。用户希望验证"海外平台是否有可程序化获取的双语字幕资源"。本次调研包含三路并行检索（YouTube 字幕技术、其他平台能力、大陆网络绕行方案）加本机真实环境实测。

## 实测过程与关键数据

本机环境：Windows + yt-dlp 2026.07.04 + Clash 代理 127.0.0.1:7890（已确认运行中，系统代理已启用）。

1. **YouTube 直连不可达**：`www.youtube.com:443` TCP 连接失败，无系统代理 env（HTTP_PROXY/HTTPS_PROXY 为空）。但通过 `--proxy http://127.0.0.1:7890` 后 curl 返回 200，0.59s——代理通道可用。

2. **yt-dlp 列字幕成功、下字幕被限流**：对 `9bZkp7q19f0`（Gangnam Style）执行 `--list-subs` 成功列出全部自动字幕轨道，包括 `zh-Hans`（Chinese Simplified）和 `zh-Hant`。但实际 `--write-auto-subs` 下载字幕文件时反复触发 **HTTP 429 Too Many Requests**（试过 android_vr / web / web_embedded / mweb / tv 五种客户端、加 Deno JS runtime、加 PO Token 插件，均无法拿到字幕内容）。web/mweb 客户端还提示需要 PO Token（2025 年 9 月起 YouTube 反爬升级，PO Token 由 BgUtils 生成，yt-dlp 需配 Deno + PO Token Provider 插件才稳定）。

3. **youtube-transcript-api 绕开限流成功（关键突破）**：用 Python 库 `youtube-transcript-api`（最新版，走 YouTube 网页 transcript 接口而非视频流接口）通过代理，成功获取：
   - 乔布斯 2005 斯坦福演讲（`UF8uR6Z6KLc`）：英文字幕 244 条，含秒级时间戳（如 `7.5 -> 10.4: This program is brought to you by Stanford University.`）；
   - 同一视频的 `zh-Hant`（繁体）机器翻译轨 159 条，**时间戳与英文逐条一致**（如 `7.5 -> 10.4: 本節目由史丹佛大學主辦。`）；
   - 该视频**无 `zh-Hans` 翻译轨**，只有 `zh-Hant`；`zh-Hans` 仅在部分视频存在（9bZkp7q19f0 的 `--list-subs` 里出现过），说明**简体中文翻译轨覆盖不保证，视视频而定**。
   - 注意：YouTube 中文字幕多为"英文 ASR → 机器翻译"，非人工翻译，质量低于 TED 志愿者翻译；且英文演讲视频的自动中文轨往往只有繁体。

4. **视频流可代理获取**：`--get-url -f "mp4[height<=720]"` 成功返回 googlevideo.com 直链（360p mp4，itag=18），说明视频流也可通过代理拉取。

5. **Khan Academy 不可用**：yt-dlp 的 khanacademy extractor 报 HTTP 400（API 变更导致 extractor 失效），换 URL 格式仍 400；直接调 `api/internal/videos` 也失败。与网络代理无关（禁代理同样 400）。

6. **需要 Deno**：yt-dlp 已明确提示 YouTube 提取无 JS runtime 将被弃用，本机已通过 winget 安装 Deno 作为 `--js-runtimes deno`。

## 其他海外平台评估

| 平台 | 英文字幕 | 中文字幕 | 获取方式 | 大陆可达性 | 结论 |
|------|---------|---------|---------|-----------|------|
| Vimeo | 有 | 极少（取决于上传者） | yt-dlp 支持 + API 需 token | 官方声明被中国屏蔽 | 不推荐 |
| Coursera | 丰富 | 大量 zh-CN | coursera-dl 需登录，yt-dlp 不支持 | 需代理 | 不推荐 |
| Khan Academy | 有 | 覆盖率未知 | yt-dlp 原生支持但 extractor 已失效(400) | 可达 | 暂不可用 |
| TED-Ed 官网 | 有 | 有 | 字幕托管在 YouTube | 等同 YouTube | 不推荐 |
| CrashCourse | 有 | 无 | 纯 YouTube | 需代理 | 不推荐 |
| BBC/VOA Learning | 无时间轴文字稿 | 无 | 爬虫需自行对齐 | 被屏蔽 | 不推荐 |
| TED 官网(现有) | 人工 | 人工 zh-Hans | yt-dlp 原生 | 直连 | 最优，继续用 |
| **YouTube** | 手动+ASR | 机器翻译 zh-Hant/zh-Hans | **youtube-transcript-api 实测成功** | 需代理 | **可用** |

## WordFlow 集成方案

现有代码已具备基础：`downloader.ts` 用 yt-dlp 拉 TED/YouTube 字幕，`ZH_LANG_PREFERENCE` 已含 `zh-Hans/zh-CN/zh-tw/zh-Hant`，`youtubeStrategy` 已存在（通过 YOUTUBE_API_KEY 解析频道/播放列表）。**需要补齐的缺口**：

1. **代理配置**：`downloader.ts` 的 `runYtDlp` 未传 `--proxy`。Docker 容器内访问宿主机代理需 `--network host` 或配置 `YTDLP_PROXY` env（新增 `config.youtubeProxy`，如 `http://host.docker.internal:7890`）。这是服务器侧能否抓取的决定性前提。

2. **字幕获取策略**：实测 yt-dlp 下载 YouTube 字幕内容被 429 限流，而 youtube-transcript-api 成功。推荐策略：YouTube 视频**优先用 youtube-transcript-api**（Node 侧可调 Python 子进程，或引入 Node 实现）拿 en + 中文轨；yt-dlp 仅用于 TED 与视频流元数据。中文字幕若缺 zh-Hans，可退化为：取 zh-Hant 繁体 + 前端简繁转换，或走现有的 LLM 翻译（`translator.ts`）用人工英文字幕生成简体中文。

3. **质量标注**：YouTube 中文轨是机器翻译，需沿用现有 `TranscriptQuality` 体系标记为 `human_source_ai_translation` 或 ASR 来源，不能冒充 `human_bilingual`。前端可据此展示质量徽标。

4. **播放链路**：视频流可经代理拉取直链（已实测），前端 `fixMediaUrl`/media proxy 需扩展允许 `googlevideo.com`/`ytimg.com` 域名代理，或沿用 youtube embed iframe（与现有 `resolveEmbedUrl` 的 youtube embed 逻辑一致）。

## 结论

- **"去海外平台找双语字幕资源"答案是 YES，且就是 YouTube**：实测证明在代理可用时，通过 youtube-transcript-api 能稳定拿到"英文原声轨 + 中文机器翻译轨"且时间戳天然对齐，这正是 WordFlow 双语段落所需的原料。
- 与 TED 的差异：TED 中文字幕是人工志愿者翻译（质量高、有简体），YouTube 中文轨是机器翻译且常只有繁体——集成时应以"英文轨为准、中文轨作参考/降级"。
- 其他平台无需再试：Vimeo/Coursera 大陆不可达或需登录，Khan 的 extractor 已坏，BBC/VOA 无时间轴字幕。

## 限制

- 429 限流规避依赖 youtube-transcript-api 的未公开接口，YouTube 策略变更可能使其随时失效（库作者已声明）。
- 简体中文（zh-Hans）翻译轨覆盖不保证，繁体（zh-Hant）覆盖更普遍；需要前端/LLM 兜底转换。
- 本次实测在开发机（有本地 Clash）完成；Docker 部署的服务器访问 YouTube 需另行配置代理通道，本文未在服务器容器内实测。

## 参考文献

1. [yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)
2. [yt-dlp 官方 README](https://github.com/yt-dlp/yt-dlp)
3. [yt-dlp 支持站点列表](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
4. [youtube-transcript-api (GitHub)](https://github.com/jdepoix/youtube-transcript-api)
5. [youtube-transcript-api · PyPI](https://pypi.org/project/youtube-transcript-api/)
6. [YouTube Data API v3 Captions 文档](https://developers.google.com/youtube/v3/docs/captions)
7. [Vimeo 区域可用性（中国屏蔽声明）](https://help.vimeo.com/hc/en-us/articles/18332106845329-Vimeo-availability-and-regional-restrictions)
8. [coursera-dl 官方仓库](https://github.com/coursera-dl/coursera-dl)
9. [TED-Ed FAQ（字幕托管于 YouTube）](https://help.ted.com/hc/en-us/articles/360005308974-general-ted-ed-lessons-faq)
10. [bgutil-ytdlp-pot-provider (GitHub)](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)
