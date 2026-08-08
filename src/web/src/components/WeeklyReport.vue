<template>
  <div class="report">
    <div class="report-header">
      <span class="report-icon">&#128218;</span>
      <div class="report-header-text">
        <span class="report-title">周报</span>
        <span class="report-week">{{ weekLabel }}</span>
      </div>
    </div>

    <div class="report-grid">
      <div class="report-stat">
        <span class="stat-value">{{ studyDays }}</span>
        <span class="stat-unit">天</span>
        <span class="stat-label">学习天数</span>
      </div>
      <div class="report-stat">
        <span class="stat-value">{{ totalMinutes }}</span>
        <span class="stat-unit">分</span>
        <span class="stat-label">学习时长</span>
      </div>
      <div class="report-stat">
        <span class="stat-value">{{ wordsLearned }}</span>
        <span class="stat-unit">个</span>
        <span class="stat-label">新学单词</span>
      </div>
      <div class="report-stat">
        <span class="stat-value">{{ articlesRead }}</span>
        <span class="stat-unit">篇</span>
        <span class="stat-label">阅读文章</span>
      </div>
    </div>

    <div class="report-accuracy">
      <span class="accuracy-label">正确率</span>
      <div class="accuracy-bar-track">
        <div
          class="accuracy-bar-fill"
          :style="{ width: accuracy + '%' }"
        />
      </div>
      <span class="accuracy-value">{{ accuracy }}%</span>
    </div>

    <button class="report-share" @click="$emit('share')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M6 10l4-4M6 10l4 4M10 6L6 2M10 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      分享
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  weekLabel: string
  studyDays: number
  totalMinutes: number
  wordsLearned: number
  articlesRead: number
  accuracy: number
}

defineProps<Props>()
defineEmits<{
  share: []
}>()
</script>

<style scoped>
.report {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 360px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* Decorative gradient bar at top */
.report::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), #71717a, var(--color-primary));
}

/* Header */
.report-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-1);
}

.report-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.report-header-text {
  display: flex;
  flex-direction: column;
}

.report-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}

.report-week {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

/* Stats grid */
.report-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.report-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3);
  background: var(--color-surface-subtle);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.stat-unit {
  font-size: 0.625rem;
  color: var(--color-text-300);
  margin-top: 1px;
}

.stat-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

/* Accuracy */
.report-accuracy {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.accuracy-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.accuracy-bar-track {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}

.accuracy-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 999px;
  transition: width 0.6s ease;
}

.accuracy-value {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
}

/* Share button */
.report-share {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-foreground);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: opacity 0.16s ease;
}

.report-share:hover {
  opacity: 0.9;
}
</style>
