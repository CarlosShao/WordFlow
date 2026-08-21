/**
 * StepFun cloud ASR (stepaudio-2.5-asr) via the Step Plan SSE endpoint.
 *
 * The Step Plan subscription only exposes ASR through HTTP + SSE
 * (`POST /step_plan/v1/audio/asr/sse`); the synchronous transcriptions
 * endpoint is not available on the plan path. Audio is submitted as
 * base64 PCM (16 kHz, 16-bit, mono) and the final text arrives in the
 * `transcript.text.done` SSE event.
 *
 * NOTE: the SSE API does NOT return word/sentence timestamps (all
 * start_time/end_time are 0), so callers must obtain timing from another
 * source (e.g. an existing Chinese subtitle track) or accept untimed text.
 */

import { spawn } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { config } from '../../config/index.js'
import { logger } from '../../common/logger.js'

export interface AsrResult {
  /** Full transcribed English text. */
  text: string
  /** Duration of the transcribed audio in seconds (from ffprobe). */
  durationSec: number
  /** Number of SSE delta events received. */
  deltas: number
  /** Per-chunk transcript with real time bounds (seconds), when chunked. */
  chunks?: Array<{ start: number; end: number; text: string }>
}

const ASR_MODEL = 'stepaudio-2.5-asr'
/** Chunk length in seconds. Chunking gives every transcript chunk a real
 *  time range, which silencedetect cannot provide on music/noise-heavy
 *  content (talk shows, SNL). */
const CHUNK_SECONDS = 25

/**
 * Convert an audio file to raw PCM (16 kHz, 16-bit, mono) via ffmpeg.
 * Returns the path to the temporary PCM file.
 */
async function toPcm(inputPath: string): Promise<string> {
  const pcmPath = join(tmpdir(), `wordflow-asr-${randomUUID()}.pcm`)
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      'ffmpeg',
      ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 's16le', pcmPath],
      { windowsHide: true },
    )
    let stderr = ''
    proc.stderr.on('data', (d) => (stderr += d))
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg PCM conversion failed (${code}): ${stderr.slice(-300)}`))
      } else {
        resolve()
      }
    })
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn failed: ${err.message}`)))
  })
  return pcmPath
}

/**
 * Probe audio duration (seconds) with ffprobe.
 */
async function probeDuration(inputPath: string): Promise<number> {
  try {
    const { spawnSync } = await import('node:child_process')
    const res = spawnSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', inputPath],
      { encoding: 'utf8', windowsHide: true },
    )
    const dur = parseFloat(res.stdout?.trim() ?? '')
    return Number.isFinite(dur) ? dur : 0
  } catch {
    return 0
  }
}

export interface SpeechSegment {
  start: number
  end: number
}

/**
 * Detect speech segments in an audio file using ffmpeg's silencedetect.
 * Returns a list of { start, end } (seconds) where speech is present.
 * `minSpeechSec` merges very short detections into neighbors.
 */
export async function detectSpeechSegments(
  inputPath: string,
  opts: { silenceThresholdDb?: number; minSilenceSec?: number; minSpeechSec?: number } = {},
): Promise<SpeechSegment[]> {
  const threshold = opts.silenceThresholdDb ?? -25
  const minSilence = opts.minSilenceSec ?? 0.25
  const minSpeech = opts.minSpeechSec ?? 1.0

  const { spawnSync } = await import('node:child_process')
  const res = spawnSync(
    'ffmpeg',
    [
      '-y', '-i', inputPath,
      '-af', `silencedetect=noise=${threshold}dB:d=${minSilence}`,
      '-f', 'null', '-',
    ],
    { encoding: 'utf8', windowsHide: true },
  )
  const stderr = res.stderr ?? ''
  const events: Array<{ type: 'silence_start' | 'silence_end'; at: number }> = []
  for (const line of stderr.split('\n')) {
    const m = line.match(/silence_(start|end):\s+([\d.]+)/)
    if (m) {
      events.push({ type: m[1] as 'silence_start' | 'silence_end', at: parseFloat(m[2]) })
    }
  }

  // Build speech segments: speech = [silence_end_prev .. silence_start_next]
  const segments: SpeechSegment[] = []
  let speechStart = 0
  let inSpeech = true
  for (const ev of events) {
    if (ev.type === 'silence_start') {
      if (inSpeech) {
        const dur = ev.at - speechStart
        if (dur >= minSpeech) segments.push({ start: speechStart, end: ev.at })
        inSpeech = false
      }
    } else {
      if (!inSpeech) {
        speechStart = ev.at
        inSpeech = true
      }
    }
  }
  if (inSpeech) {
    const dur = (await probeDuration(inputPath)) - speechStart
    if (dur >= minSpeech) segments.push({ start: speechStart, end: speechStart + dur })
  }
  return segments
}

/** Transcribe one PCM buffer via the Step Plan SSE endpoint. */
async function transcribePcm(b64: string): Promise<{ text: string; deltas: number }> {
  const payload = {
    audio: {
      data: b64,
      input: {
        transcription: {
          model: ASR_MODEL,
          language: 'en',
          enable_itn: true,
        },
        format: {
          type: 'pcm',
          codec: 'pcm_s16le',
          rate: 16000,
          bits: 16,
          channel: 1,
        },
      },
    },
  }

  const url = `${config.ai.apiBaseUrl.replace(/\/+$/, '')}/audio/asr/sse`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText)
    throw new Error(`ASR API error: ${response.status} - ${errText.slice(0, 300)}`)
  }

  // Read SSE stream: accumulate deltas, wait for transcript.text.done
  let text = ''
  let deltas = 0
  const reader = response.body?.getReader()
  if (!reader) throw new Error('ASR: no response body')

  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (!raw) continue
        let ev: Record<string, unknown>
        try {
          ev = JSON.parse(raw)
        } catch {
          continue
        }
        const type = ev.type
        if (type === 'transcript.text.delta') {
          deltas += 1
          const delta = typeof ev.delta === 'string' ? ev.delta : ''
          text += delta
        } else if (type === 'transcript.text.done') {
          const full = typeof ev.text === 'string' ? ev.text : text
          if (full) text = full
        } else if (type === 'error' || type === 'transcript.error') {
          throw new Error(`ASR stream error: ${JSON.stringify(ev).slice(0, 300)}`)
        }
      }
    }
  }
  return { text: text.trim(), deltas }
}

/**
 * Transcribe an audio file to English text via the Step Plan SSE ASR endpoint.
 *
 * The audio is processed in fixed-length chunks (CHUNK_SECONDS), so every
 * chunk of transcript carries a REAL time range. This gives accurate subtitle
 * timing even on music/noise-heavy content (talk shows, SNL) where silence
 * detection fails. Chunk boundaries land mid-word occasionally; that is fine
 * because alignment only needs monotonic timing.
 *
 * @param audioPath Local path to an audio file (m4a/mp3/wav/etc — ffmpeg converts).
 */
export async function transcribeAudio(audioPath: string): Promise<AsrResult> {
  const pcmPath = await toPcm(audioPath)
  try {
    const pcm = await readFile(pcmPath)
    const durationSec = await probeDuration(audioPath)
    const bytesPerSec = 16000 * 2 // 16kHz * 16-bit mono
    const chunkBytes = CHUNK_SECONDS * bytesPerSec

    if (pcm.length <= chunkBytes) {
      // Short audio: single shot, no chunking needed.
      const { text, deltas } = await transcribePcm(pcm.toString('base64'))
      const result: AsrResult = { text, durationSec, deltas }
      logger.info({ deltas, chars: text.length, durationSec }, 'ASR: transcription complete (single)')
      return result
    }

    // Chunked: iterate over 25s PCM slices.
    const chunks: Array<{ start: number; end: number; text: string }> = []
    let totalText = ''
    let totalDeltas = 0
    const n = Math.ceil(pcm.length / chunkBytes)
    for (let i = 0; i < n; i++) {
      const startSec = i * CHUNK_SECONDS
      const slice = pcm.subarray(i * chunkBytes, Math.min((i + 1) * chunkBytes, pcm.length))
      const { text, deltas } = await transcribePcm(slice.toString('base64'))
      totalText += (totalText ? ' ' : '') + text
      totalDeltas += deltas
      if (text.trim()) {
        chunks.push({ start: startSec, end: Math.min(startSec + CHUNK_SECONDS, durationSec || startSec + CHUNK_SECONDS), text })
      }
      logger.info({ chunk: i + 1, of: n, chars: text.length }, 'ASR: chunk transcribed')
    }

    const result: AsrResult = {
      text: totalText.trim(),
      durationSec,
      deltas: totalDeltas,
      chunks: chunks.length > 0 ? chunks : undefined,
    }
    logger.info({ deltas: totalDeltas, chars: result.text.length, durationSec, chunks: chunks.length }, 'ASR: transcription complete (chunked)')
    return result
  } finally {
    await unlink(pcmPath).catch(() => {})
  }
}
