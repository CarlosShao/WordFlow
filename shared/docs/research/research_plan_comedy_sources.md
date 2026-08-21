# 研究计划：英语喜剧/脱口秀/小品类双语字幕视频源调研（第三轮）

## 背景
WordFlow 双语学习应用已有 TED（人工双语）和网易公开课（人工双语）两个高质量源，但用户想学习"喜剧/脱口秀/小品类"英语内容（内容更口语化、更贴近日常），要求：英语内容 + 中英双语字幕 + 可程序化爬取。

## 候选方向（待验证）
1. **YouTube 喜剧频道**：Dry Bar Comedy、Don't Tell Comedy、Netflix Is A Joke、Late Night 脱口秀（Colbert/Fallon/Kimmel/Conan）、Comedy Central 等——人工英文 CC 覆盖情况、能否 youtube-transcript-api 获取、中文轨质量。
2. **B 站脱口秀/喜剧**：海量双语搬运视频，CC/AI 字幕接口可得性（需 cookie）、UP 主硬字幕能否绕过。
3. **字幕组/字幕网站**：zimuku/subhd 的脱口秀专场双语字幕（但需匹配视频文件）。
4. **双语转录网站**：scrapsfromtheloft 等 stand-up 英文字幕。

## 子任务
| 子代理 | 任务 |
|--------|------|
| A | YouTube 喜剧频道英文 CC 字幕覆盖 + 获取可行性 |
| B | 国内可直连喜剧双语资源（B 站/字幕站/学习站点） |

## 本人实测
- B 站脱口秀视频 CC/AI 字幕接口（带 cookie）
- youtube-transcript-api 拿一个 YouTube 喜剧视频英文字幕（代理）

## 报告输出
- 喜剧类双语内容源对比表
- 最可行接入方案
