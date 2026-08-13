/**
 * Media Reprocess Script
 * 
 * Re-process VIDEO and PODCAST content to:
 * 1. Re-fetch subtitles via yt-dlp (human + auto-generated)
 * 2. Re-segment content with proper timestamp alignment
 * 3. Translate all segments
 * 4. Fix media URLs
 * 
 * Run with: npx tsx src/modules/crawler/reprocess_media.ts
 */

import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { fetchMedia } from './downloader.js'
import { alignSubtitles, type CleanSegment } from './cleaner.js'
import { translateSegments } from './translator.js'
import { config } from '../../config/index.js'

interface MediaItem {
  id: string
  type: string
  title: string
  sourceUrl?: string | null
  videoUrl?: string | null
  audioUrl?: string | null
  content?: string | null
  translation?: string | null
  segments?: any | null
  duration?: number | null
  coverUrl?: string | null
}

/**
 * Extract URL from a media item for fetching subtitles.
 * Priority: sourceUrl > videoUrl > audioUrl
 */
function getCrawlUrl(item: MediaItem): string | null {
  // sourceUrl is the original page URL (e.g., TED talk page)
  if (item.sourceUrl && item.sourceUrl.trim()) {
    return item.sourceUrl.trim()
  }
  
  // videoUrl might be an embed URL or CDN URL
  if (item.videoUrl && item.videoUrl.trim()) {
    const url = item.videoUrl.trim()
    // Convert embed URL back to page URL for yt-dlp
    if (url.includes('ted.com/talks/embed/')) {
      const slug = url.replace('https://www.ted.com/talks/embed/', '')
      return `https://www.ted.com/talks/${slug}`
    }
    if (url.includes('youtube.com/embed/')) {
      const id = url.replace('https://www.youtube.com/embed/', '')
      return `https://www.youtube.com/watch?v=${id}`
    }
    return url
  }
  
  return null
}

/**
 * Rebuild a single media item with fresh subtitles.
 */
async function reprocessMediaItem(item: MediaItem): Promise<{ success: boolean; segments: number; action: string }> {
  const prisma = getPrisma()
  const crawlUrl = getCrawlUrl(item)
  
  if (!crawlUrl) {
    logger.warn({ id: item.id, title: item.title }, 'reprocess_media: no URL to fetch')
    return { success: false, segments: 0, action: 'no_url' }
  }
  
  logger.info(
    { id: item.id, type: item.type, title: item.title, url: crawlUrl },
    'reprocess_media: fetching subtitles',
  )
  
  try {
    // Step 1: Fetch media with subtitles (autoSubs fallback enabled)
    const media = await fetchMedia(crawlUrl, {
      autoSubs: true,
      cookie: config.bilibiliCookie,
    })
    
    if (!media.enSubtitle || media.enSubtitle.trim().length === 0) {
      logger.warn({ id: item.id }, 'reprocess_media: no English subtitle found')
      
      // If no subtitle, try to use existing content as a single segment
      if (item.content && item.content.trim()) {
        logger.info({ id: item.id }, 'reprocess_media: using existing content as fallback')
        const segments: CleanSegment[] = [{ en: item.content.trim() }]
        await translateSegments(segments)
        
        const newSegments = segments.map((s) => ({ en: s.en, zh: s.zh || '' }))
        const newTranslation = segments.map((s) => s.zh || '').filter(Boolean).join('\n')
        
        await prisma.content.update({
          where: { id: item.id },
          data: {
            segments: newSegments as any,
            translation: newTranslation || null,
            updatedAt: new Date(),
          },
        })
        
        return { success: true, segments: 1, action: 'content_fallback' }
      }
      
      return { success: false, segments: 0, action: 'no_subtitle' }
    }
    
    // Step 2: Align subtitles into segments
    const segments: CleanSegment[] = alignSubtitles(media.enSubtitle, media.zhSubtitle)
    
    if (segments.length === 0) {
      logger.warn({ id: item.id }, 'reprocess_media: subtitle alignment produced no segments')
      return { success: false, segments: 0, action: 'no_segments' }
    }
    
    logger.info(
      { id: item.id, segmentsCount: segments.length, hasZh: segments.filter(s => s.zh).length },
      'reprocess_media: segments created from subtitles',
    )
    
    // Step 3: Translate any missing segments
    const needTranslation = segments.filter((s) => !s.zh || s.zh.trim() === '').length
    if (needTranslation > 0) {
      logger.info(
        { id: item.id, needTranslation, total: segments.length },
        'reprocess_media: translating missing segments',
      )
      await translateSegments(segments)
      
      const stillMissing = segments.filter((s) => !s.zh || s.zh.trim() === '').length
      if (stillMissing > 0) {
        logger.warn({ id: item.id, stillMissing }, 'reprocess_media: some segments still untranslated')
      }
    }
    
    // Step 4: Build content and translation text
    const contentText = segments.map((s) => s.en).join('\n')
    const translationText = segments.map((s) => s.zh || '').filter(Boolean).join('\n')
    
    // Step 5: Determine media URL
    let mediaUrl = item.videoUrl || item.audioUrl || crawlUrl
    if (media.externalUrl) {
      mediaUrl = media.externalUrl
    }
    
    // Step 6: Update database
    const newSegments = segments.map((s) => ({
      en: s.en,
      zh: s.zh || '',
      start: s.start,
      end: s.end,
    }))
    
    const updateData: any = {
      segments: newSegments as any,
      content: contentText,
      translation: translationText || null,
      updatedAt: new Date(),
    }
    
    // Update media URLs
    if (item.type === 'VIDEO') {
      updateData.videoUrl = mediaUrl
      if (media.audioUrl) {
        updateData.audioUrl = media.audioUrl
      }
    } else if (item.type === 'PODCAST') {
      updateData.audioUrl = media.audioUrl || mediaUrl
    }
    
    // Update cover image if missing
    if (!item.coverUrl && media.thumbnailUrl) {
      updateData.coverUrl = media.thumbnailUrl
    }
    
    // Update duration if available
    if (media.durationSec && !item.duration) {
      updateData.duration = media.durationSec
    }
    
    await prisma.content.update({
      where: { id: item.id },
      data: updateData,
    })
    
    logger.info(
      { id: item.id, segments: segments.length, translated: segments.filter(s => s.zh).length },
      'reprocess_media: item reprocessed successfully',
    )
    
    return { success: true, segments: segments.length, action: 'reprocessed' }
  } catch (err) {
    logger.error({ err, id: item.id, title: item.title }, 'reprocess_media: failed to reprocess')
    return { success: false, segments: 0, action: 'error' }
  }
}

/**
 * True when a content's segments already carry real start/end timestamps and
 * therefore do NOT need backfilling.
 */
function alreadyHasTimestamps(item: MediaItem): boolean {
  const segs: any[] = Array.isArray(item.segments) ? item.segments : []
  if (segs.length === 0) return false
  return segs.some(
    (s) => s && typeof s.start === 'number' && typeof s.end === 'number',
  )
}

/**
 * Main function
 */
async function main() {
  const prisma = getPrisma()
  
  const args = process.argv.slice(2)
  const processVideos = !args.includes('--podcasts-only')
  const processPodcasts = !args.includes('--videos-only')
  const force = args.includes('--force')
  
  logger.info({ processVideos, processPodcasts, force }, 'reprocess_media: starting')
  
  // Collect items to process
  const items: MediaItem[] = []
  
  if (processVideos) {
    const videos = await prisma.content.findMany({
      where: { type: 'VIDEO', isPublished: true },
      select: {
        id: true, type: true, title: true,
        sourceUrl: true, videoUrl: true, audioUrl: true,
        content: true, translation: true, segments: true,
        duration: true, coverUrl: true,
      },
    })
    items.push(...videos)
    logger.info({ count: videos.length }, 'reprocess_media: videos loaded')
  }
  
  if (processPodcasts) {
    const podcasts = await prisma.content.findMany({
      where: { type: 'PODCAST', isPublished: true },
      select: {
        id: true, type: true, title: true,
        sourceUrl: true, videoUrl: true, audioUrl: true,
        content: true, translation: true, segments: true,
        duration: true, coverUrl: true,
      },
    })
    items.push(...podcasts)
    logger.info({ count: podcasts.length }, 'reprocess_media: podcasts loaded')
  }
  
  // Only backfill items missing real timestamps (unless --force).
  const pending = force ? items : items.filter((it) => !alreadyHasTimestamps(it))
  logger.info(
    { total: items.length, pending: pending.length, skipped: items.length - pending.length },
    'reprocess_media: filtered to items needing backfill',
  )
  
  let totalSuccess = 0
  let totalSegments = 0
  let totalFailed = 0
  
  for (let i = 0; i < pending.length; i++) {
    const item = pending[i]
    
    logger.info(
      { progress: `${i + 1}/${pending.length}`, id: item.id, title: item.title },
      'reprocess_media: processing item',
    )
    
    const result = await reprocessMediaItem(item)
    
    if (result.success) {
      totalSuccess++
      totalSegments += result.segments
    } else {
      totalFailed++
    }
  }
  
  logger.info(
    { totalProcessed: pending.length, totalSuccess, totalFailed, totalSegments },
    'reprocess_media: completed',
  )
  
  await prisma.$disconnect()
}

// Run if called directly
const isMain = process.argv[1]?.includes('reprocess_media.ts') || process.argv[1]?.includes('reprocess_media')
if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'reprocess_media: fatal error')
    process.exit(1)
  })
}

export { reprocessMediaItem }
