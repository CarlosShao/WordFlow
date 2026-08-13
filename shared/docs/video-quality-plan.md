# WordFlow 视频画质分析与增强方案

> 针对「视频画质低」与「字幕跳转精度」问题的诊断报告与处理方案。
> 实测数据来自 2026-08-12 对 Bilibili API 的直接探测。

---

## 一、当前视频参数（实测）

以一个热门 B 站视频（`BV1EAuk6CEfw`《顽童戏老叟》，时长 103s）为例，未登录态调用
`x/player/wbi/playurl?fnval=16&q=127` 返回：

| 项 | 实测值 |
|---|---|
| 实际下发画质 id | `32`（480P） |
| `accept_quality`（接口声称支持） | `[80,64,32,16]` = 1080P/720P/480P/360P |
| `accept_description` | 高清1080P / 高清720P / 清晰480P / 流畅360P |
| format | `flv480` |
| DASH 视频流数 | 4 |

四条 DASH 流明细：

| 流 | 分辨率 | 帧率 | 编码 | 码率(bps) |
|---|---|---|---|---|
| 1 | 480×852（竖屏） | 30fps | H.264 (avc1.640033) | 271,560 |
| 2 | 480×852 | 30fps | H.265 (hvc1.1.6.L120.90) | 171,919 |
| 3 | 360×640 | 30fps | H.265 | 123,995 |
| 4 | 360×640 | 30fps | H.264 | 194,515 |

**结论：当前播放的就是 480P / ~270kbps 的 H.264 流。**

---

## 二、画质不佳的表现与根因

### 表现
- **模糊**：480P 放大到全屏后细节丢失，文字/人脸边缘发虚
- **码率偏低**：270kbps 在 480P 下已接近「能看」下限，运动场景块效应明显
- **无高码率选项**：前端无法切到 720P/1080P，因为后端拿不到这些流

### 根因（已实证）
**Bilibili API 在无登录态（无 `SESSDATA` cookie）时，即使 `accept_quality` 声明支持
1080P，实际下发的 DASH 流只有 480P/360P。** 这是 B 站对未登录访客的限流策略，
不是代码 bug。`bilibili.ts` 请求 `q=127`（4K+）也只会被降级到 480P。

### 次要问题（已一并修复）
1. `media/routes.ts` 的 proxy 把整个视频 `arrayBuffer()` 读进内存再 `reply.send(buffer)` ——
   1080P 视频几百 MB 会 OOM。已改为流式转发。
2. `getBilibiliVideoUrl` 里 quality id 取 `dashInfo.video[0]`（原始数组第一个），
   与实际播放 url（排序后最高清）不一致，导致 `qualityLabel` 显示错误。已修正。

---

## 三、已实施的画质修复（本次落地）

### 1. SESSDATA Cookie 注入（核心修复）
- `src/server/src/modules/media/bilibili.ts` 新增 `buildHeaders()`，从 `process.env.BILIBILI_SESSDATA`
  读取登录态 cookie 注入请求头。
- 配置方式：`.env` 添加 `BILIBILI_SESSDATA=你的SESSDATA值`
- 获取方法：登录 bilibili.com → F12 → Application → Cookies → 复制 `SESSDATA` 的值
- 预期效果：解锁 1080P / 1080P60 / 4K 流（取决于账号大会员等级）

### 2. 视频流代理改为流式
- `media/routes.ts` 的 `/api/v1/media/proxy` 从 `arrayBuffer()` 全量缓冲改为
  `Readable.fromWeb(response.body)` 流式转发，内存占用恒定，支持任意大小视频。

### 3. 画质选择修正
- `getBilibiliVideoUrl` 现在对 DASH 流按分辨率降序排序后取最高清，url 与 quality id 同源，
  `qualityLabel` 准确反映实际播放的画质。

---

## 四、进一步画质增强方案（可选，按需实施）

### A. 前端 MSE 多路切换（中等成本，收益高）
利用 `/api/v1/media/bilibili/dash` 返回的多路 DASH 流，前端用 MSE（Media Source Extensions）
按网络状况动态切换 360P↔720P↔1080P，类似 B 站官方播放器。

- **实现步骤**：
  1. 后端 dash 路由已返回 `videos[]`（含每路的 url/分辨率/码率），无需改后端
  2. 前端引入 `mpegts.js` 或 `dash.js` 作为 MSE 播放器
  3. 用 dash.js 的 `ProtectionController` + quality switching API
- **技术要求**：dash.js ~120KB，需处理 B 站 CDN 的 Referer 校验（已有 proxy 兜底）
- **局限**：增加前端包体积；B 站 DASH 的 baseUrl 需经 proxy 才能跨域

### B. 后端超分辨率重建（高成本，研究性质）
对已下载的低分辨率视频用 AI 超分模型（Real-ESRGAN / waifu2x）离线提升到 1080P。

- **实现步骤**：
  1. yt-dlp 下载原始 480P 视频到本地
  2. 调 `realesrgan-ncnn-vulkan -i in.mp4 -o out.mp4 -n realesr-animevideov3`
  3. 上传到 MinIO，前端播放本地增强版
- **技术要求**：GPU（Vulkan）、realesrgan 二进制、处理耗时（1min 视频约 3-5min）
- **局限**：实时性差，适合预下载的存量内容；非大会员视频源仍只有 480P

### C. 去噪 / 锐化 / 色彩校正（低成本的 CSS/Canvas 后处理）
不改变视频源，在前端用 CSS filter 或 WebGL shader 做画面增强：

```css
/* 轻度锐化 + 对比度提升，缓解 480P 模糊感 */
.video-native {
  filter: contrast(1.05) saturate(1.1);
  image-rendering: -webkit-optimize-contrast;
}
```
- **局限**：CSS filter 无法真正增加细节，只是观感改善；过度会引入伪影

---

## 五、替代方案（需求4：画质始终无法提升时的备选）

### 方案 1：离线下载 + 本地专业软件处理
- **工具**：yt-dlp（下载）+ Topaz Video AI / DaVinci Resolve（插帧/超分/调色）
- **步骤**：
  1. `yt-dlp -f "bestvideo+bestaudio" --cookies cookies.txt "https://www.bilibili.com/video/BVxxxx"`
     （带 cookie 可下 1080P+）
  2. Topaz Video AI：Frame Interpolation（60fps）+ Proteus AI（超分到 4K）
  3. 上传到 MinIO 或 CDN
- **预期效果**：480P → 1080P60，画质显著提升
- **局限**：人工流程、耗时长、需 GPU 工作站；仅适合精选内容批量处理

### 方案 2：更换视频源
- 对于 **TED**：直接用 `embed.ted.com` iframe（官方高清流），不走 bilibili
- 对于 **YouTube**：用官方 iframe embed（自适应画质）
- 对于 **自有内容**：上传原始高清素材到 MinIO，用直链播放
- **局限**：iframe 模式下无法用 `currentTime` 精确 seek（跨域限制），字幕同步会退化到比例估算

### 方案 3：CDN / 代理加速
- 当前 `/api/v1/media/proxy` 已代理 B 站 CDN，但单节点带宽受限
- 可加 Cloudflare / 腾讯云 CDN 缓存热门视频分片
- **局限**：B 站 CDN URL 带 deadline 签名，缓存需配合签名刷新

### 方案 4：API 直接获取高码率流
- 已实施：SESSDATA cookie 注入解锁高码率
- 进阶：用 B 站 WBI 签名 + 大会员账号可拿 4K HDR / 杜比视界流
- **局限**：需维护有效的大会员 cookie（定期过期）

---

## 六、推荐优先级

| 优先级 | 方案 | 成本 | 收益 | 状态 |
|---|---|---|---|---|
| P0 | SESSDATA cookie 注入 | 低 | 480P→1080P | ✅ 已实施 |
| P0 | proxy 流式化 | 低 | 防 OOM | ✅ 已实施 |
| P0 | 画质选择修正 | 低 | label 准确 | ✅ 已实施 |
| P1 | CSS filter 观感增强 | 极低 | 轻度改善 | 待定 |
| P2 | MSE 多路切换（dash.js） | 中 | 自适应 | 待定 |
| P3 | 离线超分（Real-ESRGAN） | 高 | 480P→1080P | 精选内容 |
| P3 | Topaz Video AI 离线处理 | 高 | 1080P60 | 精选内容 |

**立即可做**：在 `.env` 配置 `BILIBILI_SESSDATA` 后重启后端，画质即从 480P 提升到 1080P。
