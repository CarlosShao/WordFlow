<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  text: string
  /** increment this key to re-trigger the transition */
  triggerKey: number
  active?: boolean
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let raf = 0
let ctx: CanvasRenderingContext2D | null = null
let w = 0, h = 0

function sampleGlyphPoints(text: string, fontPx: number, cw: number, ch: number, density = 3): Array<{ x: number; y: number }> {
  const off = document.createElement('canvas')
  off.width = cw
  off.height = ch
  const octx = off.getContext('2d', { willReadFrequently: true })
  if (!octx) return []
  octx.clearRect(0, 0, cw, ch)
  octx.font = '700 ' + fontPx + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  octx.textAlign = 'center'
  octx.textBaseline = 'middle'
  octx.fillStyle = '#fff'
  let size = fontPx
  const metrics = octx.measureText(text)
  const maxW = cw * 0.95
  if (metrics.width > maxW) {
    size = fontPx * (maxW / metrics.width)
    octx.font = '700 ' + size + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
  octx.fillText(text, cw / 2, ch / 2)
  const img = octx.getImageData(0, 0, cw, ch).data
  const pts: Array<{ x: number; y: number }> = []
  for (let y = 0; y < ch; y += density) {
    for (let x = 0; x < cw; x += density) {
      if (img[(y * cw + x) * 4 + 3] > 128) pts.push({ x, y })
    }
  }
  return pts
}

interface DP { x: number; y: number; px: number; py: number; tx: number; ty: number; r: number; seed: number }

function runDrop(text: string, durationMs = 1500) {
  if (!canvasRef.value || !ctx) return
  if (raf) cancelAnimationFrame(raf)

  const targets = sampleGlyphPoints(text, Math.floor(h * 0.6), w, h, 3)
  if (targets.length === 0) return
  const N = Math.min(700, targets.length)
  const drops: DP[] = []
  const cx = w / 2, cy = h / 2
  for (let i = 0; i < N; i++) {
    const target = targets[i % targets.length]
    const ang = Math.random() * Math.PI * 2
    const rad = Math.sqrt(Math.random()) * 10
    drops.push({
      x: cx + Math.cos(ang) * rad,
      y: cy + Math.sin(ang) * rad,
      px: cx + Math.cos(ang) * rad,
      py: cy + Math.sin(ang) * rad,
      tx: target.x,
      ty: target.y,
      r: 1.1 + Math.random() * 2,
      seed: Math.random() * 1000,
    })
  }

  const CELLP = 9
  const buckets = new Map<number, number[]>()
  const start = performance.now()
  const dur = durationMs

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur)
    ctx!.clearRect(0, 0, w, h)

    const GRAVITY = 0.045
    const DAMP = 0.9

    buckets.clear()
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      const key = Math.floor(d.x / CELLP) + Math.floor(d.y / CELLP) * 103
      const arr = buckets.get(key)
      if (arr) arr.push(i); else buckets.set(key, [i])
    }

    for (const d of drops) {
      let vx = (d.x - d.px) * DAMP
      let vy = (d.y - d.py) * DAMP + GRAVITY

      const kx = Math.floor(d.x / CELLP), ky = Math.floor(d.y / CELLP)
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const arr = buckets.get((kx + ox) + (ky + oy) * 103)
          if (!arr) continue
          for (const j of arr) {
            const o = drops[j]
            if (o === d) continue
            const dx = o.x - d.x, dy = o.y - d.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > 0.001 && dist < 30) {
              const f = dist < 8 ? -(1 - dist / 8) * 0.05 : (dist - 8) / 22 * 0.02
              vx += (dx / dist) * f
              vy += (dy / dist) * f
            }
          }
        }
      }

      if (t < 0.4) {
        const tt = t / 0.4
        vy += 0.18 * tt
        vx += Math.sin(d.seed * 7 + tt * 11) * 0.1 * tt
      } else {
        const tt = (t - 0.4) / 0.6
        const ease = tt * tt * (3 - 2 * tt)
        const pull = 0.055 * (0.4 + ease)
        vx += (d.tx - d.x) * pull
        vy += (d.ty - d.y) * pull
        vx += Math.sin(now / 60 + d.seed) * 0.09 * (1 - ease)
        vy += Math.cos(now / 80 + d.seed) * 0.07 * (1 - ease)
      }

      const px = d.x, py = d.y
      d.x += vx
      d.y += vy
      d.px = px
      d.py = py
      if (d.x < d.r) { d.x = d.r; d.px = d.r }
      if (d.x > w - d.r) { d.x = w - d.r; d.px = w - d.r }
      if (d.y < d.r) { d.y = d.r; d.py = d.r }
      if (d.y > h - d.r) { d.y = h - d.r; d.py = h - d.r }
    }

    ctx!.globalCompositeOperation = 'lighter'
    for (const d of drops) {
      const progressAlpha = Math.min(1, t * 8)
      const alpha = progressAlpha * (0.65 + 0.35 * Math.min(1, (1 - Math.abs(t - 0.55) * 2.2) * 2))

      const halo = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 3)
      halo.addColorStop(0, 'rgba(99,102,241,' + (alpha * 0.18) + ')')
      halo.addColorStop(1, 'rgba(99,102,241,0)')
      ctx!.fillStyle = halo
      ctx!.beginPath()
      ctx!.arc(d.x, d.y, d.r * 3, 0, Math.PI * 2)
      ctx!.fill()

      const body = ctx!.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.1, d.x, d.y, d.r * 1.15)
      body.addColorStop(0, 'rgba(226,231,255,' + alpha + ')')
      body.addColorStop(0.4, 'rgba(147,158,252,' + (alpha * 0.95) + ')')
      body.addColorStop(0.8, 'rgba(79,70,229,' + (alpha * 0.8) + ')')
      body.addColorStop(1, 'rgba(67,56,202,' + (alpha * 0.4) + ')')
      ctx!.fillStyle = body
      ctx!.beginPath()
      ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx!.fill()

      ctx!.fillStyle = 'rgba(255,255,255,' + (alpha * 0.7) + ')'
      ctx!.beginPath()
      ctx!.arc(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.22, 0, Math.PI * 2)
      ctx!.fill()

      ctx!.fillStyle = 'rgba(220,225,255,' + (alpha * 0.35) + ')'
      ctx!.beginPath()
      ctx!.arc(d.x + d.r * 0.3, d.y + d.r * 0.35, d.r * 0.12, 0, Math.PI * 2)
      ctx!.fill()
    }
    ctx!.globalCompositeOperation = 'source-over'

    if (t < 1) {
      raf = requestAnimationFrame(step)
    } else {
      ctx!.clearRect(0, 0, w, h)
    }
  }
  raf = requestAnimationFrame(step)
}

watch(() => props.triggerKey, (key) => {
  if (key > 0 && props.active) {
    runDrop(props.text)
  }
})

onMounted(async () => {
  await nextTick()
  const c = canvasRef.value
  if (!c) return
  const dpr = window.devicePixelRatio || 1
  w = c.clientWidth || c.parentElement?.clientWidth || 300
  h = c.clientHeight || c.parentElement?.clientHeight || 80
  c.width = w * dpr
  c.height = h * dpr
  ctx = c.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (props.active && props.triggerKey > 0) runDrop(props.text)
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <canvas ref="canvasRef" class="liquid-transition-canvas"></canvas>
</template>

<style scoped>
.liquid-transition-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}
</style>
