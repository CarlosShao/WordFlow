import type { ContentType } from '../types'

/**
 * Format seconds as MM:SS or HH:MM:SS.
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Format minutes (number of minutes) as a short human label. */
export function formatMinutes(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return ''
  const m = Math.floor(minutes)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return h > 0 ? `${h}h${mm > 0 ? ` ${mm}m` : ''}` : `${mm}m`
}

/** Format seconds as a duration label like "3m 25s". */
export function formatDurationLabel(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return ''
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const ss = s % 60
  if (m === 0) return `${ss}s`
  if (m < 60) return `${m}m ${ss}s`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}h ${mm}m`
}

/** Content-type label used across pages. */
export function getTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    article: '文章',
    video: '视频',
    podcast: '播客',
  }
  return labels[type] || type
}

/** Difficulty label (DB value → human label). */
export function getDifficultyLabel(difficulty?: string): string {
  if (!difficulty) return ''
  const map: Record<string, string> = {
    BEGINNER: 'A1 入门',
    ELEMENTARY: 'A2 基础',
    INTERMEDIATE: 'B1 中级',
    UPPER_INTERMEDIATE: 'B2 中高级',
    ADVANCED: 'C1 高级',
    PROFICIENT: 'C2 精通',
  }
  return map[difficulty] || difficulty
}
