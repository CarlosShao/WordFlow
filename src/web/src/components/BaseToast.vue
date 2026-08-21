<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', toast.variant]"
        role="alert"
      >
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="$emit('dismiss', toast.id)" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
export interface Toast {
  id: string
  message: string
  variant?: 'default' | 'success' | 'danger'
}

interface Props {
  toasts: Toast[]
}

defineProps<Props>()

defineEmits<{
  dismiss: [id: string]
}>()
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 380px;
}

.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.toast-message {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
}

.toast.success {
  border-color: var(--color-success-200);
  background: var(--color-success-50);
}

.toast.danger {
  border-color: var(--color-danger-200);
  background: var(--color-danger-50);
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  flex-shrink: 0;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.toast-close:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

/* Transition */
.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
