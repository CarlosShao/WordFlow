<template>
  <div class="audio-player">
    <!-- Progress Bar -->
    <div class="player-progress" @click="seekTo" ref="progressRef">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
        <div class="progress-thumb" :style="{ left: `${progressPercent}%` }" />
      </div>
      <div class="progress-buffer" :style="{ width: `${bufferPercent}%` }" />
    </div>

    <!-- Controls -->
    <div class="player-controls">
      <!-- Time -->
      <span class="player-time font-mono">{{ formatTime(currentTime) }}</span>

      <!-- Center Controls -->
      <div class="control-center">
        <button class="ctrl-btn" @click="$emit('skip-backward')" title="后退10秒">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
        <button class="play-btn" @click="$emit('toggle-play')" :title="playing ? '暂停' : '播放'">
          <svg v-if="!playing" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3"/>
          </svg>
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="3" width="5" height="18" rx="1"/>
            <rect x="14" y="3" width="5" height="18" rx="1"/>
          </svg>
        </button>
        <button class="ctrl-btn" @click="$emit('skip-forward')" title="前进10秒">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      <!-- Right Controls -->
      <div class="control-right">
        <!-- Speed -->
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
        <!-- Duration -->
        <span class="player-time font-mono">{{ formatTime(duration) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  playing?: boolean
  currentTime?: number
  duration?: number
  bufferPercent?: number
  currentSpeed?: number
}

const props = withDefaults(defineProps<Props>(), {
  playing: false,
  currentTime: 0,
  duration: 0,
  bufferPercent: 0,
  currentSpeed: 1
})

const emit = defineEmits<{
  'toggle-play': []
  'skip-backward': []
  'skip-forward': []
  'update:speed': [speed: number]
  seek: [percent: number]
}>()

const progressRef = ref<HTMLElement | null>(null)

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

const progressPercent = computed(() => {
  if (props.duration <= 0) return 0
  return (props.currentTime / props.duration) * 100
})

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function seekTo(event: MouseEvent) {
  if (!progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const percent = ((event.clientX - rect.left) / rect.width) * 100
  emit('seek', Math.max(0, Math.min(100, percent)))
}
</script>

<style scoped>
.audio-player {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

/* Progress Bar */
.player-progress {
  position: relative;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: var(--color-surface-muted);
  border-radius: 2px;
  overflow: visible;
}

.player-progress:hover .progress-track {
  height: 6px;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-buffer {
  position: absolute;
  top: 50%;
  left: 0;
  height: 4px;
  transform: translateY(-50%);
  background: var(--color-brand-300);
  border-radius: 2px;
  opacity: 0.4;
  pointer-events: none;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.16s ease;
  box-shadow: var(--shadow-sm);
}

.player-progress:hover .progress-thumb {
  opacity: 1;
}

/* Controls */
.player-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.player-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  min-width: 36px;
}

.control-center {
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
  color: var(--color-text-muted);
  transition: background-color 0.16s ease, color 0.16s ease;
}

.ctrl-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  transition: filter 0.16s ease;
  box-shadow: var(--shadow-sm);
}

.play-btn:hover {
  filter: brightness(0.92);
}

.control-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.speed-control {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.speed-btn {
  padding: 2px 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  border-radius: 4px;
  transition: all 0.16s ease;
  cursor: pointer;
}

.speed-btn:hover {
  color: var(--color-text);
}

.speed-btn.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-xs);
}
</style>
