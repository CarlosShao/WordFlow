<template>
  <Transition name="streak">
    <div v-if="show && count > 0" class="streak">
      <!-- Burst particles (visible only during celebration) -->
      <div v-if="shouldCelebrate" class="streak-burst">
        <span v-for="i in 8" :key="i" class="burst-particle" :style="particleStyle(i)" />
      </div>

      <div :class="['streak-content', { 'streak-celebrate': shouldCelebrate }]">
        <span class="streak-emoji">{{ shouldCelebrate ? '\uD83D\uDD25' : '\u2B50' }}</span>
        <span class="streak-count">{{ count }}</span>
        <span class="streak-label">天连续</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  count: number
  show: boolean
}

const props = defineProps<Props>()

const shouldCelebrate = computed(() => props.count >= 3)

function particleStyle(i: number) {
  const angle = (i - 1) * 45
  const rad = (angle * Math.PI) / 180
  const dist = 28 + Math.random() * 12
  const tx = Math.cos(rad) * dist
  const ty = Math.sin(rad) * dist
  return {
    '--tx': `${tx}px`,
    '--ty': `${ty}px`,
    animationDelay: `${(i - 1) * 0.04}s`,
  } as Record<string, string>
}
</script>

<style scoped>
.streak {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
}

.streak-content {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.streak-celebrate {
  background: linear-gradient(135deg, var(--color-warning-50), var(--color-warning-100));
  border-color: var(--color-warning-400);
  box-shadow: var(--shadow-md), 0 0 16px rgba(251, 191, 36, 0.2);
  animation: glow 1.5s ease-in-out 1;
}

.streak-emoji {
  font-size: 1.25rem;
  line-height: 1;
}

.streak-count {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.streak-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Burst particles */
.streak-burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.burst-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-warning-500);
  animation: burst 0.6s ease-out forwards;
  opacity: 0;
}

.burst-particle:nth-child(even) {
  background: var(--color-danger-500);
}

.burst-particle:nth-child(3n) {
  background: var(--color-warning-400);
}

@keyframes burst {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  60% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
    opacity: 0;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: var(--shadow-md), 0 0 8px rgba(251, 191, 36, 0.15);
  }
  50% {
    box-shadow: var(--shadow-lg), 0 0 24px rgba(251, 191, 36, 0.35);
  }
}

/* Transition: auto-hides when show becomes false */
.streak-enter-active {
  animation: streakIn 0.3s ease-out;
}

.streak-leave-active {
  animation: streakOut 0.25s ease-in forwards;
}

@keyframes streakIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes streakOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}
</style>
