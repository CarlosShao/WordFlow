# 研究计划：WordFlow 海外双语字幕视频源调研

## 背景
WordFlow 双语学习应用目前支持 TED（自带 en/zh-Hans 轨道）和 B 站视频。实测 B 站大量视频（如 BV1ZHWCz8E6M）无 CC 字幕轨道，现有 backfill 无法获取双语字幕。用户希望转向海外平台，寻找能稳定提供中英双语字幕的视频源。

## 当前环境已知事实（2026-08-13 实测）
- 本机 yt-dlp 2026.07.04 已安装
- 无任何代理环境变量（HTTP_PROXY/HTTPS_PROXY/ALL_PROXY 均为空）
- www.youtube.com:443 TCP 不可达（需代理）
- vimeo.com 可达但 yt-dlp 报 OAuth 401（需 impersonate 依赖或 API token）

## 研究问题
1. 哪些海外平台能提供中英双语字幕轨道？
2. 技术上如何获取（yt-dlp / 官方 API / 第三方服务）？
3. 在当前网络环境（无法直连 YouTube）下，有哪些可行的获取路径？
4. 如何集成到 WordFlow 后端 backfill + 前端播放链路？

## 子任务分配
| 子代理 | 任务 | 核心产出 |
|--------|------|----------|
| A | YouTube 字幕获取技术全解 | yt-dlp 字幕参数、自动/手动字幕、多语言轨道、vtt/srt 时间戳格式、常见坑 |
| B | 其他海外平台字幕能力 | Vimeo/Coursera/Khan Academy/edX 等字幕获取方式与中文字幕支持 |
| C | 大陆网络环境访问 YouTube 的可行方案 | 中转服务、第三方转录 API、yt-dlp 代理部署等 |

## 本人（lead）负责
- 读取 WordFlow 现有 backfill/media 模块代码，评估集成点
- 综合三个子代理结果，给出推荐方案与集成设计

## 搜索策略
- 关键词：`yt-dlp youtube subtitles list languages`、`youtube auto captions chinese quality`、`yt-dlp --write-subs auto/manual`、`youtube transcript api china access`、`vimeo captions api`、`coursera subtitles download`
- 时间范围：2024-2026
- 来源优先级：官方文档（yt-dlp GitHub、YouTube API）、可信技术博客、StackOverflow/GitHub issue
- 微信公众号文章作为补充（wechat-article-search，若 skill 可用）

## 报告结构
1. 背景与结论摘要
2. 各平台双语字幕能力对比
3. 技术获取方案详解
4. 网络环境限制与绕行方案
5. WordFlow 集成设计建议
6. 参考文献
