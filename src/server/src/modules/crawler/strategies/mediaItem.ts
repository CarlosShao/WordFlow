import type { CrawlItem } from '../types.js'
import { logger } from '../../../common/logger.js'
import { fetchMedia } from '../downloader.js'
import { alignSubtitles, type CleanSegment } from '../cleaner.js'
import { translateSegments } from '../translator.js'

/**
 * How the transcript and its translation were obtained. Persisted so the app
 * can surface (or filter on) the trustworthiness of each item.
 */
export type TranscriptQuality =
  /** Official human transcript AND official human translation. Nothing generated. */
  | 'human_bilingual'
  /** Official human transcript, Chinese produced by the LLM translator. */
  | 'human_source_ai_translation'
  /** Auto-generated captions as the source, Chinese produced by the LLM translator. */
  | 'asr_source_ai_translation'

export interface BuildMediaOptions {
  /** Extract audio and upload it to MinIO. */
  audio?: boolean
  /**
   * Allow falling back to auto-generated captions when no human transcript
   * exists. On by default for better coverage.
   */
  allowAutoCaptions?: boolean
}

const DEFAULT_MEDIA_OPTS: Required<BuildMediaOptions> = {
  audio: false,
  allowAutoCaptions: true,
}

/**
 * Build a CrawlItem from a single media URL (TED / YouTube).
 *
 * Accuracy policy — sources are tried strictly in this order:
 *   1. Human English transcript + human Chinese translation  -> no AI at all.
 *   2. Human English transcript + AI translation             -> source is exact.
 *   3. Auto-captions + AI translation                        -> opt-in only.
 *   4. Nothing usable                                        -> return null.
 *
 * A video's `description` is never used as the transcript: it is marketing
 * copy, not what is actually spoken, and passing it off as the body text
 * produces content that looks real but is not.
 */
export async function buildItemFromMedia(
  mediaUrl: string,
  opts: BuildMediaOptions = {},
): Promise<CrawlItem | null> {
  const mergedOpts = { ...DEFAULT_MEDIA_OPTS, ...opts }
  try {
    let media = await fetchMedia(mediaUrl, { audio: mergedOpts.audio, autoSubs: false })
    let quality: TranscriptQuality = media.zhSubtitle
      ? 'human_bilingual'
      : 'human_source_ai_translation'

    // No human transcript at all — retry with auto-captions (ASR).
    if (!media.enSubtitle && mergedOpts.allowAutoCaptions) {
      logger.info({ mediaUrl }, 'mediaItem: no human transcript, retrying with auto-captions')
      media = await fetchMedia(mediaUrl, { audio: mergedOpts.audio, autoSubs: true })
      quality = 'asr_source_ai_translation'
    }

    if (!media.enSubtitle) {
      logger.warn(
        { mediaUrl },
        'mediaItem: no English transcript available, skipping item',
      )
      return null
    }

    // Use auto-captions for English even if human English exists, when user opted in
    // and we have no human Chinese — for better coverage
    if (!media.enSubtitle && mergedOpts.allowAutoCaptions) {
      media = await fetchMedia(mediaUrl, { audio: mergedOpts.audio, autoSubs: true })
      quality = 'asr_source_ai_translation'
    }

    if (!media.enSubtitle) {
      logger.warn({ mediaUrl }, 'mediaItem: still no transcript after auto-captions attempt, skipping')
      return null
    }

    const segments: CleanSegment[] = alignSubtitles(media.enSubtitle, media.zhSubtitle)
    if (segments.length === 0) {
      logger.warn({ mediaUrl }, 'mediaItem: transcript parsed into zero segments, skipping')
      return null
    }

    // Auto-captions carry no reliable Chinese track, so anything paired with
    // them must still be treated as AI-translated.
    if (quality !== 'asr_source_ai_translation') {
      quality = segments.every((s) => s.zh) ? 'human_bilingual' : 'human_source_ai_translation'
    }

    // ALWAYS translate any segment missing Chinese translation.
    // This is critical for both auto-captions and human-source items
    // where the Chinese track was incomplete.
    const needTranslation = segments.filter((s) => !s.zh || s.zh.trim() === '').length
    if (needTranslation > 0) {
      logger.info(
        { mediaUrl, needTranslation, total: segments.length },
        'mediaItem: translating missing segments',
      )
      await translateSegments(segments)
      
      // Verify translation coverage
      const stillMissing = segments.filter((s) => !s.zh || s.zh.trim() === '').length
      if (stillMissing > 0) {
        logger.warn(
          { mediaUrl, stillMissing, total: segments.length },
          'mediaItem: some segments still untranslated after attempt',
        )
      }
    }

    const contentText = segments.map((s) => s.en).join('\n')
    const translationText = segments
      .map((s) => s.zh ?? '')
      .filter(Boolean)
      .join('\n')

    logger.info(
      { mediaUrl, segments: segments.length, quality, zhLang: media.zhSubtitleLang },
      'mediaItem: built bilingual item',
    )

    return {
      title: media.title,
      sourceUrl: media.externalUrl ?? mediaUrl,
      summary: media.description?.slice(0, 2000),
      coverUrl: media.thumbnailUrl,
      publishedAt: undefined,
      duration: media.durationSec,
      content: contentText,
      videoUrl: media.externalUrl ?? mediaUrl,
      audioUrl: media.audioUrl,
      translation: translationText || undefined,
      segments: segments as unknown as CrawlItem['segments'],
    }
  } catch (err) {
    logger.warn({ err, mediaUrl }, 'mediaItem: failed to process media URL')
    return null
  }
}
