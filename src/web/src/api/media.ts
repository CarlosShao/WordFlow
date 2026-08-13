import client from './client'

export interface BilibiliPlayData {
  videoUrl: string
  title: string
  bvid: string
  aid: number
  cid: number
  duration: number
  format: string
  quality: number
  cover: string
  owner: string
  pages: Array<{ cid: number; page: number; part: string }>
}

export const mediaApi = {
  /**
   * Get the actual video stream URL for a Bilibili video.
   * The backend proxy extracts the real .mp4 URL from Bilibili's API,
   * allowing the frontend to use a native <video> element with full playback control.
   */
  async getBilibiliPlayUrl(url: string, page?: number): Promise<BilibiliPlayData> {
    // Use manual URL construction to ensure the Bilibili URL is properly encoded
    // (it may contain query params like ?bvid=...&page=... which need special handling)
    const queryParts = [`url=${encodeURIComponent(url)}`]
    if (page !== undefined) {
      queryParts.push(`page=${page}`)
    }
    const apiUrl = `/api/v1/media/bilibili?${queryParts.join('&')}`
    const data = await client.get(apiUrl)
    return data as BilibiliPlayData
  },
}
