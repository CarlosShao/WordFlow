<template>
  <label class="toggle">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="toggle-slider"></span>
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: false
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  transition: 0.2s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: var(--color-text-muted);
  border-radius: 50%;
  transition: 0.2s;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle input:checked + .toggle-slider:before {
  background-color: var(--color-primary-foreground);
  transform: translateX(24px);
}

.toggle input:focus-visible + .toggle-slider {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
</style>
