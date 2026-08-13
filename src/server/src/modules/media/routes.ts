import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getBilibiliVideoUrl, fetchDashInfo, QUALITY_MAP } from './bilibili.js'
import { AppError } from '../../common/errors.js'
import { logger } from '../../common/logger.js'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { config } from '../../config/index.js'

const bilibiliQuerySchema = z.object({
  url: z.string().url(),
  page: z.coerce.number().optional(),
})

const bilibiliDashSchema = z.object({
  bvid: z.string(),
  cid: z.coerce.number(),
  quality: z.coerce.number().optional(),
})

export async function mediaRoutes(app: FastifyInstance) {
  // Proxy Bilibili video stream for native playback
  // Used by the frontend to get a direct video URL instead of embedding an iframe
  app.get('/api/v1/media/bilibili', async (request, reply) => {
    const { url, page } = bilibiliQuerySchema.parse(request.query)

    const { playUrl, info, dashInfo } = await getBilibiliVideoUrl(url, page)

    return reply.send({
      success: true,
      data: {
        videoUrl: playUrl.url,
        title: info.title,
        bvid: info.bvid,
        aid: info.aid,
        cid: playUrl.cid,
        duration: playUrl.length,
        format: playUrl.format,
        quality: playUrl.quality,
        qualityLabel: QUALITY_MAP[playUrl.quality] || '未知',
        cover: info.cover,
        owner: info.owner,
        pages: info.pages,
        // Include DASH info for quality switching
        dashInfo: dashInfo ? {
          videos: dashInfo.video.map(v => ({
            id: v.id,
            url: v.url,
            width: v.width,
            height: v.height,
            codec: v.codec,
            frameRate: v.frameRate,
            bandwidth: v.bandwidth,
          })),
          audios: dashInfo.audio.map(a => ({
            id: a.id,
            url: a.url,
            codec: a.codec,
            bandwidth: a.bandwidth,
          })),
          availableQualities: dashInfo.qualityDescriptions,
        } : undefined,
      },
    })
  })

  // Get DASH info for a specific video
  app.get('/api/v1/media/bilibili/dash', async (request, reply) => {
    const { bvid, cid, quality } = bilibiliDashSchema.parse(request.query)
    const dashInfo = await fetchDashInfo(bvid, cid, quality || 127)
    
    return reply.send({
      success: true,
      data: {
        videos: dashInfo.video.map(v => ({
          id: v.id,
          url: v.url,
          width: v.width,
          height: v.height,
          codec: v.codec,
          frameRate: v.frameRate,
          bandwidth: v.bandwidth,
        })),
        audios: dashInfo.audio.map(a => ({
          id: a.id,
          url: a.url,
          codec: a.codec,
          bandwidth: a.bandwidth,
        })),
        availableQualities: dashInfo.qualityDescriptions,
      },
    })
  })

  // Proxy video stream with CORS headers for native <video> playback
  // Bilibili CDN doesn't send CORS headers, so we proxy the video through our server
  app.get('/api/v1/media/proxy', async (request, reply) => {
    const { url } = z.object({ url: z.string().url() }).parse(request.query)

    // Only allow proxying from known video CDN domains
    const allowedDomains = ['bilivideo.com', 'bilibili.com', 'upos-sz']
    const urlObj = new URL(url)
    const isAllowed = allowedDomains.some(d => urlObj.hostname.includes(d))
    if (!isAllowed) {
      throw new AppError('FORBIDDEN', '不允许代理此域名的视频', 403)
    }

    // Check for range request (video seeking)
    const rangeHeader = request.headers.range as string | undefined

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com',
      'Accept': '*/*',
    }

    // Bilibili CDN (.m4s DASH streams) enforces referer + login-state cookie
    // anti-hotlinking. The playurl API call that produced this URL carried
    // SESSDATA, but the actual segment download must too, otherwise the CDN
    // returns 403. Forward the full cookie (preferred) or SESSDATA when configured.
    const cookie = config.bilibiliCookie || process.env.BILIBILI_SESSDATA
    if (cookie) {
      headers['Cookie'] = process.env.BILIBILI_SESSDATA && !config.bilibiliCookie
        ? `SESSDATA=${cookie}`
        : cookie
    }

    if (rangeHeader) {
      headers['Range'] = rangeHeader
    }

    let response: Response
    try {
      response = await fetch(url, { headers })
    } catch (fetchErr) {
      logger.error({ err: (fetchErr as Error).message, url }, 'media proxy upstream fetch failed')
      throw new AppError('BAD_GATEWAY', `视频上游请求失败: ${(fetchErr as Error).message}`, 502)
    }

    if (!response.ok) {
      throw new AppError('BAD_GATEWAY', `视频获取失败: ${response.status}`, 502)
    }

    // Forward essential headers
    const contentLength = response.headers.get('content-length')
    const acceptRanges = response.headers.get('accept-ranges')
    const contentRange = response.headers.get('content-range')

    // Bilibili DASH segments (.m4s) come back as `application/octet-stream`,
    // which the <video> element (and WebView kernels) refuse to load as a
    // playable source. Always present them as video/mp4 (fMP4 segments are
    // MP4 container fragments, so this MIME is correct).
    const contentType = 'video/mp4'

    // NOTE: `reply.send(Readable.fromWeb(upstream))` was observed to deliver
    // a `0`-byte body even though the upstream web stream reads fine. Fastify's
    // reply pipeline does not play well with the web ReadableStream adapter in
    // this setup. Instead of relying on Fastify's stream handling, we hijack
    // the reply, write the headers directly to the raw HTTP response, and pipe
    // the adapted Node stream straight through. This keeps memory bounded for
    // large DASH segments while guaranteeing the bytes actually reach the
    // client.
    const status = contentRange ? 206 : response.status
    reply.hijack()
    const outHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
      'Cache-Control': 'public, max-age=3600',
    }
    // Do NOT forward the upstream Content-Length: on 206 partial responses the
    // CDN reports a length for the full resource, not the requested range, and
    // a mismatched length makes clients treat the body as truncated/corrupt.
    // Let Node's chunked transfer-encoding carry the streamed data.
    if (acceptRanges) outHeaders['Accept-Ranges'] = acceptRanges
    if (contentRange) outHeaders['Content-Range'] = contentRange

    const upstream = response.body
    if (upstream) {
      reply.raw.writeHead(status, outHeaders)
      const nodeStream = Readable.fromWeb(upstream as Parameters<typeof Readable.fromWeb>[0])
      nodeStream.on('error', (err) => {
        logger.error({ err: (err as Error).message }, 'media proxy stream error')
        reply.raw.destroy(err as Error)
      })
      await pipeline(nodeStream, reply.raw)
    } else {
      const buffer = Buffer.from(await response.arrayBuffer())
      reply.raw.writeHead(status, outHeaders)
      reply.raw.end(buffer)
    }
  })
}
