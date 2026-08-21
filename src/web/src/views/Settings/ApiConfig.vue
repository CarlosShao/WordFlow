<template>
  <div class="api-config-page">
    <PageHeader title="AI API 配置" subtitle="配置你自己的 AI API Key，或使用后端默认配置" />

    <div class="config-sections">
      <!-- Status Banner -->
      <div v-if="hasCustomKey" class="status-banner status-banner--active">
        <span class="status-icon">&#10003;</span>
        <span>已启用自定义 API Key，所有 AI 功能将使用你的配置</span>
      </div>
      <div v-else class="status-banner status-banner--default">
        <span class="status-icon">&#9432;</span>
        <span>当前使用后端默认 AI 配置</span>
      </div>

      <!-- API Config Form -->
      <SettingsSection title="API 设置">
        <SettingItem title="API Base URL" description="AI 服务提供商的 API 地址" full-width>
          <BaseInput
            v-model="form.apiBaseUrl"
            placeholder="https://api.deepseek.com/v1"
          />
        </SettingItem>

        <SettingItem title="API Key" description="你的 API 密钥，本地存储不会上传到服务器" full-width>
          <div class="api-key-input-wrapper">
            <BaseInput
              v-model="form.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="sk-..."
            />
            <button
              type="button"
              class="toggle-visibility-btn"
              :title="showApiKey ? '隐藏' : '显示'"
              @click="showApiKey = !showApiKey"
            >
              {{ showApiKey ? '&#128065;' : '&#128064;' }}
            </button>
          </div>
        </SettingItem>

        <SettingItem title="模型" description="选择使用的 AI 模型" full-width>
          <div class="model-select-wrapper">
            <select v-model="form.model" class="model-select">
              <option value="deepseek-chat">DeepSeek Chat</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="moonshot-v1-8k">Moonshot v1 8K</option>
              <option value="qwen-turbo">通义千问 Turbo</option>
              <option value="glm-4">GLM-4</option>
            </select>
          </div>
        </SettingItem>
      </SettingsSection>

      <!-- Test Result -->
      <div v-if="testResult" :class="['test-result', testResult.success ? 'test-result--success' : 'test-result--error']">
        <span>{{ testResult.success ? '&#10003;' : '&#10007;' }}</span>
        <span>{{ testResult.message }}</span>
      </div>

      <!-- Actions -->
      <div class="config-actions">
        <BaseButton
          variant="secondary"
          :loading="testing"
          @click="handleTestConnection"
        >
          {{ testing ? '测试中...' : '测试连接' }}
        </BaseButton>
        <BaseButton variant="danger" @click="handleClear">清除配置</BaseButton>
        <BaseButton @click="handleSave">保存配置</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  PageHeader,
  SettingsSection,
  SettingItem,
  BaseInput,
  BaseButton,
} from '../../components'
import { useToast } from '../../composables/useToast'
import { useSettingsStore } from '../../stores/settings'

const toast = useToast()
const settings = useSettingsStore()

const showApiKey = ref(false)
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

const form = reactive({
  apiBaseUrl: settings.apiBaseUrl,
  apiKey: settings.apiKey,
  model: settings.model,
})

const hasCustomKey = settings.hasCustomKey

async function handleTestConnection() {
  testing.value = true
  testResult.value = null

  // Temporarily update store with current form values for testing
  settings.saveApiConfig({
    apiBaseUrl: form.apiBaseUrl,
    apiKey: form.apiKey,
    model: form.model,
  })

  const result = await settings.testConnection()
  testResult.value = result
  testing.value = false

  if (result.success) {
    toast.success('连接测试成功')
  } else {
    toast.error(`连接测试失败: ${result.message}`)
  }
}

function handleSave() {
  settings.saveApiConfig({
    apiBaseUrl: form.apiBaseUrl,
    apiKey: form.apiKey,
    model: form.model,
  })
  testResult.value = null
  toast.success('API 配置已保存')
}

function handleClear() {
  settings.clearApiConfig()
  form.apiBaseUrl = 'https://api.deepseek.com/v1'
  form.apiKey = ''
  form.model = 'deepseek-chat'
  testResult.value = null
  showApiKey.value = false
  toast.info('已清除自定义配置，将使用后端默认设置')
}
</script>

<style scoped>
.api-config-page {
  padding: var(--space-6);
  max-width: 800px;
  margin: 0 auto;
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.status-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
}

.status-banner--active {
  background: var(--color-success-50, var(--color-success-50));
  color: var(--color-success-700, var(--color-success-700));
  border: 1px solid var(--color-success-200, var(--color-success-200));
}

.status-banner--default {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.status-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.api-key-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.api-key-input-wrapper :deep(.input-wrapper) {
  flex: 1;
}

.toggle-visibility-btn {
  padding: var(--space-2);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
  transition: background-color 0.16s ease;
}

.toggle-visibility-btn:hover {
  background: var(--color-surface);
}

.model-select-wrapper {
  width: 100%;
}

.model-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: var(--input-border-width) solid var(--color-border);
  border-radius: var(--input-radius);
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.model-select:hover {
  border-color: var(--color-border-strong);
}

.model-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--input-focus-shadow);
}

.test-result {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
}

.test-result--success {
  background: var(--color-success-50, var(--color-success-50));
  color: var(--color-success-700, var(--color-success-700));
  border: 1px solid var(--color-success-200, var(--color-success-200));
}

.test-result--error {
  background: var(--color-danger-50, var(--color-danger-50));
  color: var(--color-danger-700, var(--color-danger-700));
  border: 1px solid var(--color-danger-200, var(--color-danger-200));
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
