<template>
  <div :class="['timer', { 'timer--pulse': isPulsing }]">
    <svg
      class="timer-ring"
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
    >
      <!-- Background ring -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="trackColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
      />
      <!-- Progress ring -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="ringColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :style="{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }"
        transform-origin="center"
        class="timer-progress"
      />
    </svg>
    <div class="timer-text">
      <span class="timer-value">{{ formatted }}</span>
      <span v-if="isPulsing" class="timer-label">!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'

interface Props {
  seconds: number
  running: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'time-up': []
  'update:remaining': [value: number]
}>()

const size = 120
const strokeWidth = 8
const center = size / 2
const radius = center - strokeWidth

const remaining = ref(props.seconds)
const circumference = 2 * Math.PI * radius
let timer: ReturnType<typeof setInterval> | null = null

const progress = computed(() => {
  if (props.seconds <= 0) return 0
  return remaining.value / props.seconds
})

const dashOffset = computed(() => circumference * (1 - progress.value))

const trackColor = computed(() => 'var(--color-border)')

const ringColor = computed(() => {
  if (progress.value > 0.5) return '#22c55e'
  if (progress.value > 0.25) return '#eab308'
  return '#ef4444'
})

const isPulsing = computed(() => remaining.value <= 10 && remaining.value > 0)

const formatted = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    if (remaining.value > 0) {
      remaining.value--
      emit('update:remaining', remaining.value)
      if (remaining.value <= 0) {
        stopTimer()
        emit('time-up')
      }
    }
  }, 1000)
}

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

watch(
  () => props.seconds,
  (val) => {
    remaining.value = val
  }
)

watch(
  () => props.running,
  (val) => {
    if (val) startTimer()
    else stopTimer()
  },
  { immediate: true }
)

onBeforeUnmount(stopTimer)
</script>

<style scoped>
.timer {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: v-bind(size + 'px');
  height: v-bind(size + 'px');
}

.timer-ring {
  transform: rotate(-90deg);
}

.timer-progress {
  transform-origin: center;
}

.timer-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.timer-value {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.timer-label {
  font-size: 0.75rem;
  color: var(--color-danger-600);
  font-weight: 600;
  margin-top: 2px;
}

/* Pulse animation when < 10 seconds */
.timer--pulse {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}
</style>
