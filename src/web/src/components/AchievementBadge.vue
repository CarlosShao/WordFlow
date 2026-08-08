<template>
  <div
    :class="['badge', { 'badge--locked': !unlocked }]"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
  >
    <!-- Glow ring for unlocked -->
    <div v-if="unlocked" class="badge-glow" />

    <div class="badge-icon">
      <span>{{ icon }}</span>
      <!-- Lock overlay -->
      <div v-if="!unlocked" class="badge-lock">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="7" width="10" height="8" rx="2" fill="currentColor" />
          <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
        </svg>
      </div>
    </div>

    <div class="badge-info">
      <span class="badge-title">{{ title }}</span>
      <span class="badge-desc">{{ description }}</span>
      <span v-if="unlocked && unlockedAt" class="badge-date">{{ unlockedAt }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  title: string
  description: string
  unlocked: boolean
  unlockedAt?: string
}

defineProps<Props>()
defineEmits<{
  click: []
}>()
</script>

<style scoped>
.badge {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.16s ease;
  overflow: hidden;
  outline: none;
}

.badge:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.badge:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Unlocked glow */
.badge-glow {
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  box-shadow: 0 0 12px 2px rgba(24, 24, 27, 0.08);
  pointer-events: none;
  animation: badgeGlow 3s ease-in-out infinite alternate;
}

@keyframes badgeGlow {
  0% { box-shadow: 0 0 8px 1px rgba(24, 24, 27, 0.06); }
  100% { box-shadow: 0 0 16px 3px rgba(24, 24, 27, 0.12); }
}

/* Locked state */
.badge--locked {
  opacity: 0.5;
  filter: grayscale(100%);
}

.badge--locked:hover {
  opacity: 0.6;
}

/* Icon */
.badge-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 1.75rem;
  line-height: 1;
  flex-shrink: 0;
  border-radius: var(--radius);
  background: var(--color-surface-subtle);
}

.badge-lock {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border-radius: inherit;
  color: #fff;
}

/* Info */
.badge-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.badge-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}

.badge-desc {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.badge-date {
  font-size: 0.625rem;
  color: var(--color-text-300);
  margin-top: 2px;
}
</style>
