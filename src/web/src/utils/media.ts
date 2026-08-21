/**
 * Extract TED talk slug from various URL patterns.
 * Normalizes hyphens to underscores since TED uses underscores in page URLs.
 */
export function extractTedSlug(url: string): string | null {
  // Pattern 1: Standard TED talk page URL
  if (url.includes('ted.com/talks/')) {
    const m = url.match(/ted\.com\/talks\/(?:embed\/)?([a-z0-9_]+)/i)
    if (m) return m[1]
  }

  // Pattern 2: py.tedcdn.com / download.ted.com CDN download URL
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
 * Convert expired CDN download URLs to stable embed URLs.
 * TED talks and YouTube videos use temporary CDN URLs that expire within
 * hours. This runs as a safety net until the database is reprocessed.
 */
export function fixMediaUrl(url: string | undefined): string | undefined {
  if (!url) return url

  // TED CDN download URL → extract slug from URL/DB and convert to embed
  if (url.includes('tedcdn.com') || url.includes('download.ted.com') || url.includes('ted.com/talks/')) {
    const slug = extractTedSlug(url)
    if (slug) return `https://embed.ted.com/talks/${slug}`
  }

  // YouTube watch URL → embed URL
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    const ytId =
      url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1] ||
      url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1]
    if (ytId) return `https://www.youtube.com/embed/${ytId}`
  }

  // Bilibili URLs — keep as-is, we'll proxy through backend and use the
  // native video player. Do NOT convert to the player.bilibili.com iframe.
  return url
}

/** True when a URL should be embedded via iframe (YouTube/Vimeo/TED). */
export function isEmbedUrl(url: string): boolean {
  // Bilibili URLs are handled via the native video player, not iframe.
  if (url.includes('bilibili.com')) return false
  return (
    url.includes('youtube.com/embed') ||
    url.includes('player.vimeo') ||
    url.includes('ted.com/talks/embed') ||
    url.includes('embed.ted.com/talks')
  )
}

/** Add YouTube CC (closed captions) params to an embed URL. */
export function getEmbedUrlWithCaptions(url: string): string {
  if (!url.includes('youtube.com')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}cc_load_policy=1&cc_lang_pref=zh-CN`
}
