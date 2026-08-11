<template>
  <div class="settings-page">
    <PageHeader title="设置" subtitle="自定义你的学习体验" />

    <div class="settings-sections">
      <!-- Daily Goals -->
      <SettingsSection title="每日目标">
        <SettingItem title="学习时长目标" description="每天计划学习的分钟数">
          <BaseInput v-model="settings.dailyGoalMinutes" type="number" />
          <span class="setting-unit">分钟</span>
        </SettingItem>
        <SettingItem title="新词目标" description="每天计划学习的新单词数">
          <BaseInput v-model="settings.dailyGoalWords" type="number" />
          <span class="setting-unit">个</span>
        </SettingItem>
      </SettingsSection>

      <!-- Reminders -->
      <SettingsSection title="提醒">
        <SettingItem title="学习提醒" description="开启每日学习提醒通知">
          <Toggle v-model="settings.reminderEnabled" />
        </SettingItem>
        <SettingItem v-if="settings.reminderEnabled" title="提醒时间" description="设置每日提醒的时间">
          <BaseInput v-model="settings.reminderTime" type="time" />
        </SettingItem>
      </SettingsSection>

      <!-- Content Preferences -->
      <SettingsSection title="内容偏好">
        <SettingItem title="难度偏好" description="选择适合你水平的内容难度">
          <DifficultySelector :model-value="settings.difficultyPreference[0] || ''" @update:model-value="toggleDifficulty($event)" />
        </SettingItem>
        <SettingItem title="内容来源" description="选择你偏好的内容来源">
          <div class="source-options">
            <button
              v-for="source in sources"
              :key="source"
              :class="['source-btn', { active: settings.preferredSources.includes(source) }]"
              @click="toggleSource(source)"
            >
              {{ source }}
            </button>
          </div>
        </SettingItem>
      </SettingsSection>

      <!-- Display -->
      <SettingsSection title="显示">
        <SettingItem title="界面风格" description="选择你喜欢的视觉风格" full-width>
          <ThemeSelector :model-value="themeStyle" @update:model-value="handleStyleChange($event)" />
        </SettingItem>
        <SettingItem title="字体大小" description="调整内容显示的字体大小">
          <div class="font-size-options">
            <button
              v-for="size in fontSizes"
              :key="size.value"
              :class="['size-btn', { active: settings.fontSize === size.value }]"
              @click="settings.fontSize = size.value"
            >
              {{ size.label }}
            </button>
          </div>
        </SettingItem>
      </SettingsSection>

      <!-- Profile -->
      <SettingsSection title="个人资料">
        <SettingItem title="头像" description="上传你的头像图片" full-width>
          <div class="avatar-upload">
            <img v-if="avatarUrl" :src="avatarUrl" alt="头像" class="avatar-preview" />
            <span v-else class="avatar-placeholder">未设置</span>
            <input ref="avatarInput" type="file" accept="image/*" hidden @change="handleAvatarUpload" />
            <BaseButton variant="secondary" size="sm" @click="avatarInput?.click()">
              选择图片
            </BaseButton>
          </div>
        </SettingItem>
      </SettingsSection>

      <!-- AI Settings -->
      <SettingsSection title="AI 智能助手">
        <SettingItem title="启用 AI 功能" description="开启后将使用 AI 生成题目、分析错误、提供个性化学习建议">
          <Toggle v-model="aiSettings.enabled" />
        </SettingItem>
        <template v-if="aiSettings.enabled">
          <SettingItem title="API 端点" description="AI 后端服务地址" full-width>
            <BaseInput v-model="aiSettings.endpoint" placeholder="https://api.openai.com/v1" />
          </SettingItem>
          <SettingItem title="API 密钥" description="用于身份验证的密钥，将安全存储在本地" full-width>
            <BaseInput v-model="aiSettings.apiKey" type="password" placeholder="sk-..." />
          </SettingItem>
          <SettingItem title="当前模式" description="未配置 API 时将使用模拟数据进行演示">
            <span :class="['ai-mode-badge', aiMode]">
              {{ aiMode === 'mock' ? '模拟模式' : '真实 API' }}
            </span>
          </SettingItem>
        </template>
      </SettingsSection>
    </div>

    <!-- Save Button -->
    <div class="settings-footer">
      <BaseButton variant="secondary" @click="resetSettings">重置</BaseButton>
      <BaseButton @click="saveSettings">保存设置</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect, watch } from 'vue'
import {
  PageHeader,
  SettingsSection,
  SettingItem,
  Toggle,
  BaseInput,
  BaseButton,
  DifficultySelector,
  ThemeSelector
} from '../components'
import { useToast } from '../composables/useToast'
import { useTheme } from '../composables/useTheme'
import { configureAI } from '../api/ai'
import { uploadApi } from '../api/upload'
import type { ThemeStyle } from '../composables/useTheme'
import type { CEFRLevel, ContentSource } from '../types'

const toast = useToast()
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUrl = ref<string>('')

async function handleAvatarUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const result = await uploadApi.uploadFile(file, 'avatar')
    avatarUrl.value = result.url
    toast.success('头像上传成功')
  } catch {
    toast.error('头像上传失败，请稍后重试')
  } finally {
    target.value = ''
  }
}

const { themeStyle, setTheme } = useTheme()

const FONT_SIZE_KEY = 'wordflow-font-size'
const savedFontSize = localStorage.getItem(FONT_SIZE_KEY) as 'sm' | 'md' | 'lg' | null

const settings = reactive({
  dailyGoalMinutes: '30',
  dailyGoalWords: '10',
  reminderEnabled: true,
  reminderTime: '09:00',
  difficultyPreference: ['B1', 'B2'] as CEFRLevel[],
  preferredSources: ['BBC', 'CNN', 'NYT'] as ContentSource[],
  fontSize: (savedFontSize || 'md') as 'sm' | 'md' | 'lg'
})

// Apply font size to DOM + persist
function applyFontSize(size: 'sm' | 'md' | 'lg') {
  document.documentElement.setAttribute('data-font-size', size)
  localStorage.setItem(FONT_SIZE_KEY, size)
}

// Watch fontSize changes and apply immediately
watch(() => settings.fontSize, (newSize) => {
  applyFontSize(newSize)
}, { immediate: true })

const aiSettings = reactive({
  enabled: false,
  endpoint: '',
  apiKey: ''
})

const aiMode = ref<'mock' | 'real'>('mock')

watchEffect(() => {
  if (!aiSettings.enabled || !aiSettings.endpoint || !aiSettings.apiKey) {
    aiMode.value = 'mock'
  } else {
    aiMode.value = 'real'
  }
})

const sources: ContentSource[] = ['BBC', 'CNN', 'NYT', 'Reddit', 'X', 'Medium', 'TED', 'YouTube']

const fontSizes: Array<{ value: 'sm' | 'md' | 'lg'; label: string }> = [
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '大' }
]

function handleStyleChange(style: ThemeStyle) {
  setTheme(style)
  toast.success(`已切换主题`)
}

function toggleDifficulty(level: CEFRLevel | '') {
  if (!level) return
  const index = settings.difficultyPreference.indexOf(level)
  if (index === -1) {
    settings.difficultyPreference.push(level)
  } else if (settings.difficultyPreference.length > 1) {
    settings.difficultyPreference.splice(index, 1)
  }
}

function toggleSource(source: ContentSource) {
  const index = settings.preferredSources.indexOf(source)
  if (index === -1) {
    settings.preferredSources.push(source)
  } else {
    settings.preferredSources.splice(index, 1)
  }
}

function saveSettings() {
  // Persist font size (already applied via watch, but ensure it's saved)
  applyFontSize(settings.fontSize)

  if (aiSettings.enabled && aiSettings.endpoint && aiSettings.apiKey) {
    configureAI({
      endpoint: aiSettings.endpoint,
      apiKey: aiSettings.apiKey,
      debug: true
    })
    toast.success('设置已保存')
  } else {
    configureAI({
      endpoint: '/api/ai',
      apiKey: ''
    })
    toast.success('设置已保存')
  }
}

function resetSettings() {
  settings.fontSize = 'md'
  settings.dailyGoalMinutes = '30'
  settings.dailyGoalWords = '10'
  settings.reminderEnabled = true
  settings.reminderTime = '09:00'
  settings.difficultyPreference = ['B1', 'B2']
  settings.preferredSources = ['BBC', 'CNN', 'NYT']
  applyFontSize('md')
  toast.info('设置已重置为默认值')
}
</script>

<style scoped>
.settings-page {
  padding: var(--space-6);
  max-width: 800px;
  margin: 0 auto;
}

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
}

.setting-unit {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.source-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.source-btn {
  padding: var(--space-1) var(--space-2);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.source-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.source-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.font-size-options {
  display: flex;
  gap: var(--space-1);
}

.size-btn {
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.size-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.size-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.ai-mode-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
}

.ai-mode-badge.mock {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border-color: var(--color-border);
}

.ai-mode-badge.real {
  color: #ffffff;
  background: var(--color-success-600, #16a34a);
  border-color: transparent;
}
</style>
