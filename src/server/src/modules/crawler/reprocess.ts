/**
 * Reprocess existing content that has missing translations or cover images.
 * 
 * Run with: npx tsx src/modules/crawler/reprocess.ts
 */

import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'
import { translateSegments } from './translator.js'
import { cleanToSegments, type CleanSegment } from './cleaner.js'

interface ContentItem {
  id: string
  type: string
  title: string
  content?: string | null
  translation?: string | null
  segments?: any | null
  coverUrl?: string | null
  sourceUrl?: string | null
  audioUrl?: string | null
  videoUrl?: string | null
}

/**
 * Count untranslated segments
 */
function countUntranslatedSegments(segments: any[]): number {
  return segments.filter(
    (s: any) => !s.zh || String(s.zh).trim() === '',
  ).length
}

/**
 * Rebuild translation text from segments
 */
function rebuildTranslation(segments: any[]): string {
  return segments
    .map((s) => s.zh ?? '')
    .filter((zh) => zh && zh.trim())
    .join('\n')
}

/**
 * Rebuild segments from raw content text, then translate
 */
async function rebuildSegmentsFromContent(item: ContentItem): Promise<{ success: boolean; translated: number }> {
  const prisma = getPrisma()
  
  if (!item.content || !item.content.trim()) {
    return { success: false, translated: 0 }
  }

  logger.info(
    { id: item.id, type: item.type, title: item.title, contentLen: item.content.length },
    'reprocess: rebuilding segments from content',
  )

  try {
    // Step 1: Parse content into segments
    const segments: CleanSegment[] = cleanToSegments(item.content)
    
    if (segments.length === 0) {
      logger.warn({ id: item.id }, 'reprocess: cleanToSegments returned empty')
      return { success: false, translated: 0 }
    }

    logger.info(
      { id: item.id, segmentsCount: segments.length },
      'reprocess: segments created, starting translation',
    )

    // Step 2: Translate all segments
    await translateSegments(segments)

    const translated = segments.filter((s) => s.zh && s.zh.trim()).length
    const stillMissing = segments.filter((s) => !s.zh || !s.zh.trim()).length

    logger.info(
      { id: item.id, total: segments.length, translated, stillMissing },
      'reprocess: translation completed',
    )

    // Step 3: Update database
    const newSegments = segments.map((s) => ({ en: s.en, zh: s.zh || '' }))
    const newTranslation = rebuildTranslation(newSegments)

    await prisma.content.update({
      where: { id: item.id },
      data: {
        segments: newSegments as any,
        translation: newTranslation || null,
        updatedAt: new Date(),
      },
    })

    logger.info(
      { id: item.id, translated, total: segments.length },
      'reprocess: item rebuilt and updated successfully',
    )

    return { success: true, translated }
  } catch (err) {
    logger.error({ err, id: item.id, title: item.title }, 'reprocess: failed to rebuild from content')
    return { success: false, translated: 0 }
  }
}

/**
 * Reprocess a single content item
 */
async function reprocessItem(item: ContentItem): Promise<{ success: boolean; translated: number; action: string }> {
  const prisma = getPrisma()
  
  // Case 1: Has segments but some missing translation
  if (item.segments && Array.isArray(item.segments) && (item.segments as any[]).length > 0) {
    const segmentsArr = item.segments as any[]
    const needCount = countUntranslatedSegments(segmentsArr)
    
    if (needCount === 0) {
      return { success: true, translated: 0, action: 'already_complete' }
    }

    logger.info(
      { id: item.id, title: item.title, need: needCount, total: segmentsArr.length },
      'reprocess: translating missing segments',
    )

    try {
      const segments: CleanSegment[] = segmentsArr.map((s: any) => ({
        en: s.en || '',
        zh: s.zh || undefined,
      }))

      await translateSegments(segments)

      const translated = segments.filter((s) => s.zh && s.zh.trim()).length
      const stillMissing = segments.filter((s) => !s.zh || !s.zh.trim()).length

      if (stillMissing > 0) {
        logger.warn({ id: item.id, stillMissing }, 'reprocess: some segments still untranslated')
      }

      const newSegments = segments.map((s) => ({ en: s.en, zh: s.zh || '' }))
      const newTranslation = rebuildTranslation(newSegments)

      await prisma.content.update({
        where: { id: item.id },
        data: {
          segments: newSegments as any,
          translation: newTranslation || null,
          updatedAt: new Date(),
        },
      })

      logger.info({ id: item.id, translated, stillMissing }, 'reprocess: item updated successfully')
      return { success: true, translated, action: 'translated_missing' }
    } catch (err) {
      logger.error({ err, id: item.id, title: item.title }, 'reprocess: failed to translate')
      return { success: false, translated: 0, action: 'translate_failed' }
    }
  }

  // Case 2: No segments at all, but has content - rebuild from content
  if (item.content && item.content.trim()) {
    const result = await rebuildSegmentsFromContent(item)
    return { ...result, action: 'rebuilt_from_content' }
  }

  // Case 3: Nothing to work with
  return { success: false, translated: 0, action: 'no_content' }
}

/**
 * Extract TED talk slug from various URL patterns.
 */
function extractTedSlug(url: string): string | null {
  // Pattern 1: Standard TED talk page URL
  if (url.includes('ted.com/talks/')) {
    const m = url.match(/ted\.com\/talks\/(?:embed\/)?([a-z0-9_]+)/i)
    if (m) return m[1]
  }

  // Pattern 2: py.tedcdn.com CDN download URL
  // URL: /consus/projects/00/78/36/products/downloads/2025-hamish-mckenzie-4fc48b98-...
  const cdnMatch = url.match(/\/downloads\/\d{4}-([a-z][a-z0-9_-]+?)-[0-9a-f-]{8,}-download/i)
  if (cdnMatch) {
    return cdnMatch[1].replace(/-/g, '_')
  }

  // Pattern 3: download.ted.com with talk slug
  const dlMatch = url.match(/download\.ted\.com\/[^/]+\/(?:[^/]+\/)?([a-z0-9_]+)/i)
  if (dlMatch) return dlMatch[1]

  return null
}

/**
 * Fix broken video AND audio URLs — convert expired CDN download URLs to stable embed URLs.
 */
async function fixMediaUrls(): Promise<void> {
  const prisma = getPrisma()

  // Fix video URLs
  const videos = await prisma.content.findMany({
    where: { type: 'VIDEO', isPublished: true },
    select: { id: true, title: true, videoUrl: true, sourceUrl: true },
  })

  let videoFixed = 0
  for (const v of videos) {
    if (!v.videoUrl) continue
    const originalUrl = v.videoUrl
    let newUrl = originalUrl

    const isCdnUrl =
      originalUrl.includes('download.ted.com') ||
      originalUrl.includes('py.tedcdn.com') ||
      originalUrl.includes('youtube.com/watch') ||
      originalUrl.includes('youtu.be/')

    if (!isCdnUrl) continue

    const sourceUrl = v.sourceUrl || ''
    const slug = extractTedSlug(originalUrl) || extractTedSlug(sourceUrl)

    if (slug) {
      newUrl = `https://www.ted.com/talks/embed/${slug}`
    } else {
      const ytIdMatch =
        originalUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
        originalUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
      if (ytIdMatch) {
        newUrl = `https://www.youtube.com/embed/${ytIdMatch[1]}`
      }
    }

    if (newUrl !== originalUrl) {
      await prisma.content.update({
        where: { id: v.id },
        data: { videoUrl: newUrl, updatedAt: new Date() },
      })
      videoFixed++
      logger.info({ id: v.id, title: v.title, to: newUrl }, 'reprocess: fixed video URL')
    }
  }

  // Fix audio URLs (same patterns)
  const audios = await prisma.content.findMany({
    where: { type: 'PODCAST', isPublished: true },
    select: { id: true, title: true, audioUrl: true, sourceUrl: true },
  })

  let audioFixed = 0
  for (const a of audios) {
    if (!a.audioUrl) continue
    const originalUrl = a.audioUrl
    let newUrl = originalUrl

    const isCdnUrl =
      originalUrl.includes('download.ted.com') ||
      originalUrl.includes('py.tedcdn.com')

    if (!isCdnUrl) continue

    const sourceUrl = a.sourceUrl || ''
    const slug = extractTedSlug(originalUrl) || extractTedSlug(sourceUrl)

    if (slug) {
      newUrl = `https://www.ted.com/talks/embed/${slug}`
    }

    if (newUrl !== originalUrl) {
      await prisma.content.update({
        where: { id: a.id },
        data: { audioUrl: newUrl, updatedAt: new Date() },
      })
      audioFixed++
      logger.info({ id: a.id, title: a.title, to: newUrl }, 'reprocess: fixed audio URL')
    }
  }

  logger.info({ videoTotal: videos.length, videoFixed, audioTotal: audios.length, audioFixed }, 'reprocess: media URL fix complete')
}

/**
 * Main reprocessing function
 */
async function main() {
  const prisma = getPrisma()

  const args = process.argv.slice(2)
  const fixUrlsOnly = args.includes('--fix-urls') || args.includes('--fix-video-urls')

  if (fixUrlsOnly) {
    logger.info('reprocess: fixing media URLs only')
    await fixMediaUrls()
    await prisma.$disconnect()
    return
  }

  logger.info('reprocess: starting content reprocessing')

  // Always fix media URLs first
  await fixMediaUrls()

  const allContent = await prisma.content.findMany({
    where: {
      isPublished: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      translation: true,
      segments: true,
      coverUrl: true,
      sourceUrl: true,
      audioUrl: true,
      videoUrl: true,
      duration: true,
    },
  })

  let totalProcessed = 0
  let totalTranslated = 0
  let totalRebuilt = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const item of allContent) {
    const hasSegments = item.segments && Array.isArray(item.segments) && (item.segments as any[]).length > 0
    const segmentsArr = hasSegments ? (item.segments as any[]) : []
    const untranslatedCount = hasSegments ? countUntranslatedSegments(segmentsArr) : 0

    // Check if segments are too sparse for the content duration
    // (e.g., 5 segments for a 600s video = 120s per segment, too coarse)
    const duration = (item as any).duration || 0
    const segmentsTooSparse = hasSegments && duration > 0 && segmentsArr.length > 0 && (duration / segmentsArr.length) > 60

    // Skip if already complete AND segments aren't too sparse
    if (hasSegments && untranslatedCount === 0 && !segmentsTooSparse) {
      totalSkipped++
      continue
    }

    // Skip if no content at all
    if (!item.content || !item.content.trim()) {
      if (!hasSegments || segmentsArr.length === 0) {
        totalSkipped++
        continue
      }
    }

    logger.info(
      { id: item.id, type: item.type, title: item.title, hasSegments, untranslated: untranslatedCount, segmentsTooSparse, contentLen: item.content?.length ?? 0, duration },
      'reprocess: processing item',
    )

    const result = await reprocessItem(item)
    
    if (result.success) {
      totalProcessed++
      totalTranslated += result.translated
      if (result.action === 'rebuilt_from_content') totalRebuilt++
    } else {
      totalFailed++
    }
  }

  logger.info(
    {
      totalProcessed,
      totalTranslated,
      totalRebuilt,
      totalFailed,
      totalSkipped,
      totalScanned: allContent.length,
    },
    'reprocess: completed',
  )

  await prisma.$disconnect()
}

// Run if called directly
const isMain = process.argv[1]?.includes('reprocess.ts') || process.argv[1]?.includes('reprocess')
if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'reprocess: fatal error')
    process.exit(1)
  })
}

export { reprocessItem, countUntranslatedSegments }
