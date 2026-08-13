import { logger } from '../../common/logger.js'
import { config } from '../../config/index.js'

/**
 * Bilibili video proxy — extract actual video stream URL for native playback.
 *
 * Bilibili's iframe player is cross-origin and does not expose timeupdate / seek APIs.
 * By proxying the real video stream through the backend, the frontend can use
 * a native <video> element with full playback control and perfect transcript sync.
 */

const BILIBILI_API = 'https://api.bilibili.com'

/**
 * Build request headers for Bilibili API calls.
 *
 * Without a SESSDATA cookie, Bilibili only returns 480P/360P streams even when
 * `accept_quality` lists 1080P+. Injecting a logged-in SESSDATA (configured via
 * the BILIBILI_SESSDATA env var) unlocks 1080P / 1080P60 / 4K streams.
 */
function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
  }
  // Prefer the full cookie string (BILIBILI_COOKIE) which carries SESSDATA,
  // buvid3, etc. — required to unlock HD streams and to pass .m4s CDN
  // anti-hotlinking. Fall back to the standalone BILIBILI_SESSDATA var.
  const cookie = config.bilibiliCookie || process.env.BILIBILI_SESSDATA
  if (cookie) {
    // BILIBILI_SESSDATA stores only the raw SESSDATA value
    h['Cookie'] = process.env.BILIBILI_SESSDATA && !config.bilibiliCookie
      ? `SESSDATA=${cookie}`
      : cookie
  }
  return h
}

export interface BiliVideoInfo {
  title: string
  bvid: string
  aid: number
  cid: number
  pages: Array<{ cid: number; page: number; part: string }>
  duration: number
  cover: string
  owner: string
}

export interface BiliPlayUrl {
  url: string
  cid: number
  quality: number
  format: string
  length: number
  size: number
}

export interface BiliDashVideo {
  id: number
  url: string
  codec: string
  mimeType: string
  bandwidth: number
  width: number
  height: number
  frameRate: string
}

export interface BiliDashAudio {
  id: number
  url: string
  codec: string
  mimeType: string
  bandwidth: number
}

export interface BiliDashInfo {
  video: BiliDashVideo[]
  audio: BiliDashAudio[]
  qualityDescriptions: Array<{ quality: number; desc: string }>
}

/**
 * Quality ID to resolution mapping
 */
export const QUALITY_MAP: Record<number, string> = {
  127: '4K+ (杜比视界)',
  126: '4K',
  125: '720P60',
  120: '1080P60',
  116: '1080P+',
  112: '1080P60',
  80: '1080P',
  74: '720P60',
  64: '720P',
  48: '720P',
  32: '480P',
  16: '360P',
}

/**
 * Get the best available quality ID for a video
 */
export function getBestQuality(availableQualities: number[]): number {
  const preferredOrder = [127, 126, 120, 116, 112, 80, 74, 64, 48, 32, 16]
  for (const q of preferredOrder) {
    if (availableQualities.includes(q)) return q
  }
  return availableQualities[0] || 80
}

export async function fetchVideoInfo(bvid: string): Promise<BiliVideoInfo> {
  const res = await fetch(`${BILIBILI_API}/x/web-interface/view?bvid=${bvid}`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(`Bilibili API error: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Bilibili API: ${data.message}`)

  const d = data.data
  return {
    title: d.title,
    bvid: d.bvid,
    aid: d.aid,
    cid: d.cid,
    pages: (d.pages || []).map((p: any) => ({ cid: p.cid, page: p.page, part: p.part })),
    duration: d.duration,
    cover: d.pic,
    owner: d.owner?.name || '',
  }
}

export async function fetchPlayUrl(bvid: string, cid: number, quality = 80): Promise<BiliPlayUrl> {
  const params = new URLSearchParams({ bvid, cid: String(cid), q: String(quality) })
  const res = await fetch(`${BILIBILI_API}/x/player/wbi/playurl?${params}`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(`Bilibili playurl error: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Bilibili playurl: ${data.message}`)

  const d = data.data
  const url = d.durl?.[0]?.url || ''
  if (!url) throw new Error('No video URL in response')

  return {
    url,
    cid,
    quality: d.quality,
    format: d.format,
    length: d.duration,
    size: d.durl?.[0]?.size || 0,
  }
}

/**
 * Fetch DASH info for higher quality options
 * Bilibili supports DASH format which allows selecting specific video quality
 */
export async function fetchDashInfo(bvid: string, cid: number, quality = 80): Promise<BiliDashInfo> {
  const params = new URLSearchParams({ bvid, cid: String(cid), q: String(quality), fnval: '16' })
  const res = await fetch(`${BILIBILI_API}/x/player/wbi/playurl?${params}`, {
    headers: buildHeaders(),
  })
  if (!res.ok) throw new Error(`Bilibili DASH API error: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Bilibili DASH: ${data.message}`)

  const d = data.data
  const dash = d.dash

  if (!dash) {
    // Fall back to durl format
    const playUrl = await fetchPlayUrl(bvid, cid, quality)
    return {
      video: [{
        id: playUrl.quality,
        url: playUrl.url,
        codec: 'avc1',
        mimeType: 'video/mp4',
        bandwidth: playUrl.size * 8 / (playUrl.length || 1),
        width: 0,
        height: 0,
        frameRate: '30',
      }],
      audio: [],
      qualityDescriptions: [{ quality: playUrl.quality, desc: QUALITY_MAP[playUrl.quality] || '未知' }],
    }
  }

  const videos: BiliDashVideo[] = (dash.video || []).map((v: any) => ({
    id: v.id,
    url: v.baseUrl,
    codec: v.codecs || 'avc1',
    mimeType: v.mimeType || 'video/mp4',
    bandwidth: v.bandwidth || 0,
    width: v.width || 0,
    height: v.height || 0,
    frameRate: v.frameRate || '30',
  }))

  const audios: BiliDashAudio[] = (dash.audio || []).map((a: any) => ({
    id: a.id,
    url: a.baseUrl,
    codec: a.codecs || 'mp4a.40.2',
    mimeType: a.mimeType || 'audio/mp4',
    bandwidth: a.bandwidth || 0,
  }))

  const qualityDescriptions = (dash.supportFormats || []).map((f: any) => ({
    quality: f.quality,
    desc: f.newDescription || QUALITY_MAP[f.quality] || '未知',
  }))

  return { video: videos, audio: audios, qualityDescriptions }
}

/**
 * Get the best video URL from DASH info
 */
export function getBestVideoUrl(dashInfo: BiliDashInfo, preferredQuality?: number): string {
  const videos = dashInfo.video
  if (videos.length === 0) return ''

  if (preferredQuality) {
    const exact = videos.find(v => v.id === preferredQuality)
    if (exact) return exact.url
  }

  // Sort by resolution (height) descending
  const sorted = [...videos].sort((a, b) => b.height - a.height)
  return sorted[0].url
}

/**
 * Extract BV ID and page number from various Bilibili URL formats.
 * Supports:
 *   https://www.bilibili.com/video/BV1xx4y1y7wc
 *   https://www.bilibili.com/video/BV1xx4y1y7wc?p=2
 *   https://player.bilibili.com/player.html?bvid=BV1xx4y1y7wc&page=2
 */
export function parseBilibiliUrl(url: string): { bvid: string; page?: number } | null {
  // player.bilibili.com URL
  const playerMatch = url.match(/bvid=(BV[0-9A-Za-z]+)/i)
  if (playerMatch) {
    const pageMatch = url.match(/[?&]page=(\d+)/)
    return { bvid: playerMatch[1], page: pageMatch ? parseInt(pageMatch[1]) : 1 }
  }

  // www.bilibili.com/video/ URL
  const videoMatch = url.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i)
  if (videoMatch) {
    const pageMatch = url.match(/[?&]p=(\d+)/)
    return { bvid: videoMatch[1], page: pageMatch ? parseInt(pageMatch[1]) : 1 }
  }

  return null
}

/**
 * Get the playable video URL for a Bilibili video.
 * This is the main entry point used by the API route.
 *
 * Prefers the **merged MP4** stream returned by the standard playurl endpoint
 * because the native <video> element cannot stitch together DASH video/audio
 * segments itself. DASH is only used as a fallback for qualities that are
 * DASH-only (e.g. 1080P60 / 4K), in which case we expose the video track URL
 * and rely on the browser to play it without audio (rare for TED content).
 */
export async function getBilibiliVideoUrl(
  url: string,
  requestedPage?: number
): Promise<{ playUrl: BiliPlayUrl; info: BiliVideoInfo; dashInfo?: BiliDashInfo }> {
  const parsed = parseBilibiliUrl(url)
  if (!parsed) throw new Error('无法解析 B 站视频链接')

  const page = requestedPage || parsed.page || 1

  logger.info({ bvid: parsed.bvid, page }, 'Fetching Bilibili video info')

  const info = await fetchVideoInfo(parsed.bvid)

  // Find the cid for the requested page
  const targetPage = info.pages.find(p => p.page === page)
  const cid = targetPage?.cid || info.cid

  // 1) Prefer the merged MP4 (durl) stream — has both audio and video in one
  // container, playable by a native <video> tag.
  try {
    const playUrl = await fetchPlayUrl(parsed.bvid, cid)
    logger.info(
      { bvid: parsed.bvid, cid, quality: playUrl.quality, url: playUrl.url },
      'Bilibili video URL extracted (merged MP4)',
    )
    return { playUrl, info }
  } catch (mergedErr) {
    logger.warn(
      { error: (mergedErr as Error).message },
      'Merged MP4 playurl failed, falling back to DASH video track',
    )
  }

  // 2) Fallback: DASH video-only track (no audio in this branch).
  const dashInfo = await fetchDashInfo(parsed.bvid, cid, 127)
  const sorted = [...dashInfo.video].sort((a, b) => b.height - a.height)
  const bestVideo = sorted[0]
  if (!bestVideo) throw new Error('No playable stream returned by Bilibili')

  const playUrl: BiliPlayUrl = {
    url: bestVideo.url,
    cid,
    quality: bestVideo.id,
    format: 'dash',
    length: info.duration,
    size: (bestVideo.bandwidth * info.duration) / 8,
  }
  logger.warn(
    { bvid: parsed.bvid, cid, quality: bestVideo.id },
    'Bilibili DASH video-only fallback (no audio)',
  )
  return { playUrl, info, dashInfo }
}
