<template>
  <div class="summary">
    <!-- Score Circle -->
    <div class="summary-score">
      <svg class="score-ring" width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" stroke-width="8" />
        <circle
          cx="50" cy="50" r="42"
          fill="none"
          :stroke="scoreColor"
          stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="scoreCirc"
          :stroke-dashoffset="scoreDash"
          transform-origin="center"
          class="score-arc"
        />
      </svg>
      <div class="score-text">
        <span class="score-pct">{{ scorePct }}%</span>
        <span class="score-frac">{{ correctAnswers }}/{{ totalQuestions }}</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="summary-stats">
      <div class="stat">
        <span class="stat-icon">&#9201;</span>
        <div class="stat-content">
          <span class="stat-value">{{ formattedTime }}</span>
          <span class="stat-label">用时</span>
        </div>
      </div>
      <div class="stat">
        <span class="stat-icon">&#11088;</span>
        <div class="stat-content">
          <span class="stat-value">+{{ points }}</span>
          <span class="stat-label">积分</span>
        </div>
      </div>
    </div>

    <!-- Weak tags -->
    <div v-if="weakTags.length > 0" class="summary-weak">
      <span class="weak-title">薄弱标签</span>
      <div class="weak-tags">
        <span v-for="tag in weakTags" :key="tag" class="weak-tag">{{ tag }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="summary-actions">
      <button class="btn btn-primary" @click="$emit('retry')">再练一次</button>
      <button class="btn btn-outline" @click="$emit('view-mistakes')">查看错题</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  totalQuestions: number
  correctAnswers: number
  totalTime: number
  points: number
  weakTags: string[]
}

const props = defineProps<Props>()

defineEmits<{
  retry: []
  'view-mistakes': []
}>()

const scorePct = computed(() => {
  if (props.totalQuestions <= 0) return 0
  return Math.round((props.correctAnswers / props.totalQuestions) * 100)
})

const scoreColor = computed(() => {
  if (scorePct.value >= 80) return 'var(--color-success-600)'
  if (scorePct.value >= 50) return '#eab308'
  return 'var(--color-danger-600)'
})

const scoreCirc = 2 * Math.PI * 42
const scoreDash = computed(() => scoreCirc * (1 - scorePct.value / 100))

const formattedTime = computed(() => {
  const m = Math.floor(props.totalTime / 60)
  const s = props.totalTime % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
</script>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  max-width: 320px;
  width: 100%;
}

/* Score circle */
.summary-score {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-ring {
  transform: rotate(-90deg);
}

.score-arc {
  transition: stroke-dashoffset 0.8s ease;
}

.score-text {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-pct {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.score-frac {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

/* Stats */
.summary-stats {
  display: flex;
  gap: var(--space-6);
  width: 100%;
  justify-content: center;
}

.stat {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.stat-icon {
  font-size: 1.125rem;
  line-height: 1;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

/* Weak tags */
.summary-weak {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.weak-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.weak-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.weak-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-danger-700);
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  border-radius: 999px;
}

/* Actions */
.summary-actions {
  display: flex;
  gap: var(--space-3);
  width: 100%;
}

.btn {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.16s ease;
  font-family: var(--font-sans);
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-outline {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn-outline:hover {
  background: var(--color-surface-subtle);
  border-color: var(--color-border-strong);
}
</style>
