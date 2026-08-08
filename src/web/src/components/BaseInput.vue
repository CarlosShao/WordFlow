<template>
  <div :class="['input-wrapper', { 'is-disabled': disabled, 'is-focused': focused }]">
    <span v-if="$slots.prefix" class="input-prefix">
      <slot name="prefix" />
    </span>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="input-field"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="focused = true"
      @blur="focused = false"
    />
    <span v-if="$slots.suffix" class="input-suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  readonly: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const focused = ref(false)
</script>

<style scoped>
.input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: var(--input-border-width) solid var(--color-border);
  border-radius: var(--input-radius);
  background: var(--color-surface);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.input-wrapper:hover:not(.is-disabled) {
  border-color: var(--color-border-strong);
}

.input-wrapper.is-focused {
  border-color: var(--color-primary);
  box-shadow: var(--input-focus-shadow);
}

.input-wrapper.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-field {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text);
}

.input-field::placeholder {
  color: var(--color-text-muted);
}

.input-field:disabled {
  cursor: not-allowed;
}

.input-prefix,
.input-suffix {
  display: flex;
  align-items: center;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
</style>
