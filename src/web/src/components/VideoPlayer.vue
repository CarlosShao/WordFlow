<template>
  <div class="video-player">
    <!-- Video container -->
    <div class="video-container" @mouseenter="showControls" @mouseleave="hideControls">
      <div class="video-placeholder">
        <div class="video-poster" v-if="poster">
          <img :src="poster" :alt="title" />
        </div>
        <div class="video-overlay">
          <button class="play-overlay" @click="$emit('toggle-play')" :title="playing ? '暂停' : '播放'">
            <svg v-if="!playing" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="3" width="5" height="18" rx="1" />
              <rect x="14" y="3" width="5" height="18" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Subtitle display -->
      <div v-if="currentSubtitle" class="video-subtitle">
        <span class="subtitle-en">{{ currentSubtitle.english }}</span>
        <span v-if="showBilingual" class="subtitle-cn">{{ currentSubtitle.chinese }}</span>
      </div>

      <!-- Controls overlay -->
      <Transition name="fade">
        <div v-show="controlsVisible" class="video-controls">
          <!-- Progress -->
          <div class="video-progress" @click="seekTo" ref="progressRef">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
              <div class="progress-thumb" :style="{ left: `${progressPercent}%` }" />
            </div>
          </div>

          <!-- Bottom bar -->
          <div class="controls-bar">
            <div class="controls-left">
              <button class="ctrl-btn" @click="$emit('toggle-play')" :title="playing ? '暂停' : '播放'">
                <svg v-if="!playing" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="3" width="5" height="18" rx="1" />
                  <rect x="14" y="3" width="5" height="18" rx="1" />
                </svg>
              </button>
              <button class="ctrl-btn" @click="$emit('skip-backward')" title="后退10秒">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 4v6h6" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
              <button class="ctrl-btn" @click="$emit('skip-forward')" title="前进10秒">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <span class="time-display font-mono">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
            </div>

            <div class="controls-right">
              <!-- Bilingual toggle -->
              <button
                v-if="hasSubtitles"
                :class="['ctrl-btn', 'sub-btn', { active: showBilingual }]"
                @click="$emit('toggle-bilingual')"
                title="双语字幕"
              >
                字
              </button>
              <!-- Speed control -->
              <div class="speed-control">
                <button
                  v-for="speed in speeds"
                  :key="speed"
                  :class="['speed-btn', { active: currentSpeed === speed }]"
                  @click="$emit('update:speed', speed)"
                >
                  {{ speed }}x
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SubtitleLine } from '../types'

interface Props {
  title?: string
  poster?: string
  playing?: boolean
  currentTime?: number
  duration?: number
  currentSpeed?: number
  subtitles?: SubtitleLine[]
  showBilingual?: boolean
  hasSubtitles?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  playing: false,
  currentTime: 0,
  duration: 0,
  currentSpeed: 1,
  showBilingual: false,
  hasSubtitles: false
})

defineEmits<{
  'toggle-play': []
  'skip-backward': []
  'skip-forward': []
  'update:speed': [speed: number]
  'toggle-bilingual': []
  seek: [percent: number]
}>()

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
const controlsVisible = ref(true)
const progressRef = ref<HTMLElement | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const progressPercent = computed(() => {
  if (props.duration <= 0) return 0
  return (props.currentTime / props.duration) * 100
})

const currentSubtitle = computed(() => {
  if (!props.subtitles || props.subtitles.length === 0) return null
  return props.subtitles.find(
    s => props.currentTime >= s.startTime && props.currentTime < s.endTime
  ) || null
})

function showControls() {
  controlsVisible.value = true
  if (hideTimer) clearTimeout(hideTimer)
}

function hideControls() {
  if (props.playing) {
    hideTimer = setTimeout(() => {
      controlsVisible.value = false
    }, 3000)
  }
}

function seekTo(_event: MouseEvent) {
  if (!progressRef.value) return
  // Emit seek event (parent handles actual seek)
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.video-player {
  width: 100%;
}

.video-container {
  position: relative;
  width: 100%;
  background: var(--color-background-900);
  border-radius: var(--radius-md);
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.video-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-poster {
  width: 100%;
  height: 100%;
}

.video-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.2s ease;
}

.video-overlay:hover {
  background: rgba(0, 0, 0, 0.4);
}

.play-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease;
  box-shadow: var(--shadow-lg);
}

.play-overlay:hover {
  transform: scale(1.08);
  background: #ffffff;
}

/* Subtitles */
.video-subtitle {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  padding: var(--space-2) var(--space-4);
  background: rgba(0, 0, 0, 0.75);
  border-radius: var(--radius-sm);
  max-width: 80%;
  z-index: 5;
}

.subtitle-en {
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.4;
}

.subtitle-cn {
  display: block;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: var(--space-1);
  line-height: 1.4;
}

/* Controls */
.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: var(--space-4) var(--space-3) var(--space-2);
  z-index: 10;
}

.video-progress {
  position: relative;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-bottom: var(--space-1);
}

.video-progress .progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: visible;
}

.video-progress:hover .progress-track {
  height: 6px;
}

.video-progress .progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--color-primary-foreground);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.video-progress .progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.16s ease;
}

.video-progress:hover .progress-thumb {
  opacity: 1;
}

.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.sub-btn {
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  width: auto;
  padding: 0 var(--space-2);
}

.sub-btn.active {
  background: rgba(255, 255, 255, 0.25);
}

.time-display {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

.speed-control {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
}

.speed-btn {
  padding: 2px 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.speed-btn:hover {
  color: #ffffff;
}

.speed-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.font-mono {
  font-family: var(--font-mono);
}
</style>
