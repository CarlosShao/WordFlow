<template>
  <div class="theme-selector">
    <div class="style-grid">
      <button
        v-for="style in styleOptions"
        :key="style.value"
        :class="['style-card', { active: modelValue === style.value }]"
        @click="$emit('update:modelValue', style.value)"
      >
        <div class="style-preview">
          <span
            v-for="(color, i) in style.colors"
            :key="i"
            class="style-dot"
            :style="{ background: color }"
          />
        </div>
        <span class="style-name">{{ style.label }}</span>
        <span class="style-desc">{{ style.description }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ThemeStyle } from '../composables/useTheme'

interface StyleOption {
  value: ThemeStyle
  label: string
  description: string
  colors: string[]
}

interface Props {
  modelValue?: ThemeStyle
  styleOptions?: StyleOption[]
}

withDefaults(defineProps<Props>(), {
  modelValue: 'minimalist',
  styleOptions: () => [
    { value: 'minimalist', label: '极简', description: '中性灰调，适度圆角', colors: ['#18181b', '#71717a', '#fafafa', '#e4e4e7'] },
    { value: 'vercel', label: 'Vercel', description: '纯黑白，锐利边角', colors: ['#000000', '#666666', '#ffffff', '#eaeaea'] },
    { value: 'apple', label: 'Apple', description: '毛玻璃，超大圆角', colors: ['#007AFF', '#86868b', '#f5f5f7', '#1d1d1f'] },
    { value: 'golden-time', label: 'Golden Time', description: '暖金色，深色优雅', colors: ['#C9A84C', '#A89B85', '#1A1612', '#F5F0E8'] },
    { value: 'vibe-camp', label: 'Vibe Camp', description: '明亮彩色，活泼年轻', colors: ['#FF6B35', '#8B7E74', '#FFFBF5', '#2D2A26'] },
    { value: 'barbie', label: 'Barbie', description: '粉色渐变，可爱圆润', colors: ['#E91E8C', '#9B6E9B', '#FFF0F5', '#4A154B'] },
    { value: 'google', label: 'Google', description: 'Material Design，彩色按钮', colors: ['#1A73E8', '#5F6368', '#FFFFFF', '#202124'] }
  ]
})

defineEmits<{
  'update:modelValue': [value: ThemeStyle]
}>()
</script>

<style scoped>
.style-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
  width: 100%;
}

.style-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.style-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.style-card.active {
  border-color: var(--color-primary);
  background: var(--color-surface-muted);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.style-preview {
  display: flex;
  gap: 4px;
  margin-bottom: var(--space-1);
}

.style-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.1);
}

.style-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.style-desc {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
