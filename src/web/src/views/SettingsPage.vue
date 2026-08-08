<template>
  <div class="settings-page">
    <!-- Settings Sections -->
    <div class="settings-sections">
      <!-- Daily Goals -->
      <section class="settings-section">
        <h2 class="section-title">每日目标</h2>
        <div class="setting-item">
          <div class="setting-label">
            <h3>学习时长目标</h3>
            <p>每天计划学习的分钟数</p>
          </div>
          <div class="setting-control">
            <BaseInput v-model="settings.dailyGoalMinutes" type="number" />
            <span class="setting-unit">分钟</span>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <h3>新词目标</h3>
            <p>每天计划学习的新单词数</p>
          </div>
          <div class="setting-control">
            <BaseInput v-model="settings.dailyGoalWords" type="number" />
            <span class="setting-unit">个</span>
          </div>
        </div>
      </section>

      <!-- Reminders -->
      <section class="settings-section">
        <h2 class="section-title">提醒</h2>
        <div class="setting-item">
          <div class="setting-label">
            <h3>学习提醒</h3>
            <p>开启每日学习提醒通知</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="settings.reminderEnabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div v-if="settings.reminderEnabled" class="setting-item">
          <div class="setting-label">
            <h3>提醒时间</h3>
            <p>设置每日提醒的时间</p>
          </div>
          <div class="setting-control">
            <BaseInput v-model="settings.reminderTime" type="time" />
          </div>
        </div>
      </section>

      <!-- Content Preferences -->
      <section class="settings-section">
        <h2 class="section-title">内容偏好</h2>
        <div class="setting-item">
          <div class="setting-label">
            <h3>难度偏好</h3>
            <p>选择适合你水平的内容难度</p>
          </div>
          <div class="setting-control">
            <div class="difficulty-options">
              <button
                v-for="level in difficultyLevels"
                :key="level.value"
                :class="['difficulty-btn', { active: settings.difficultyPreference.includes(level.value) }]"
                @click="toggleDifficulty(level.value)"
              >
                {{ level.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <h3>内容来源</h3>
            <p>选择你偏好的内容来源</p>
          </div>
          <div class="setting-control">
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
          </div>
        </div>
      </section>

      <!-- Display -->
      <section class="settings-section">
        <h2 class="section-title">显示</h2>

        <!-- Visual Style -->
        <div class="setting-item setting-item--full">
          <div class="setting-label">
            <h3>界面风格</h3>
            <p>选择你喜欢的视觉风格</p>
          </div>
          <div class="style-grid">
            <button
              v-for="style in styleOptions"
              :key="style.value"
              :class="['style-card', { active: themeStyle === style.value }]"
              @click="handleStyleChange(style.value)"
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

        <div class="setting-item">
          <div class="setting-label">
            <h3>字体大小</h3>
            <p>调整内容显示的字体大小</p>
          </div>
          <div class="setting-control">
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
          </div>
        </div>
      </section>

      <!-- AI Settings -->
      <section class="settings-section">
        <h2 class="section-title">AI 智能助手</h2>

        <div class="setting-item">
          <div class="setting-label">
            <h3>启用 AI 功能</h3>
            <p>开启后将使用 AI 生成题目、分析错误、提供个性化学习建议</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="aiSettings.enabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <template v-if="aiSettings.enabled">
          <div class="setting-item setting-item--full">
            <div class="setting-label">
              <h3>API 端点</h3>
              <p>AI 后端服务地址，例如 https://api.example.com/v1</p>
            </div>
            <div class="setting-control setting-control--full">
              <BaseInput
                v-model="aiSettings.endpoint"
                placeholder="https://api.openai.com/v1"
                :disabled="!aiSettings.enabled"
              />
            </div>
          </div>

          <div class="setting-item setting-item--full">
            <div class="setting-label">
              <h3>API 密钥</h3>
              <p>用于身份验证的密钥，将安全存储在本地</p>
            </div>
            <div class="setting-control setting-control--full">
              <BaseInput
                v-model="aiSettings.apiKey"
                type="password"
                placeholder="sk-..."
                :disabled="!aiSettings.enabled"
              />
            </div>
          </div>

          <div class="setting-item setting-item--full">
            <div class="setting-label">
              <h3>当前模式</h3>
              <p>未配置 API 时将使用模拟数据进行演示</p>
            </div>
            <div class="setting-control">
              <span :class="['ai-mode-badge', aiMode]">
                {{ aiMode === 'mock' ? '模拟模式' : '真实 API' }}
              </span>
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- Save Button -->
    <div class="settings-footer">
      <BaseButton variant="secondary" @click="resetSettings">重置</BaseButton>
      <BaseButton @click="saveSettings">保存设置</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect } from 'vue'
import { BaseInput, BaseButton } from '../components'
import { useToast } from '../composables/useToast'
import { useTheme } from '../composables/useTheme'
import { configureAI } from '../api/ai'
import type { ThemeStyle } from '../composables/useTheme'
import type { CEFRLevel, ContentSource } from '../types'

const toast = useToast()
const { themeStyle, setTheme } = useTheme()

const settings = reactive({
  dailyGoalMinutes: '30',
  dailyGoalWords: '10',
  reminderEnabled: true,
  reminderTime: '09:00',
  difficultyPreference: ['B1', 'B2'] as CEFRLevel[],
  preferredSources: ['BBC', 'CNN', 'NYT'] as ContentSource[],
  fontSize: 'md' as 'sm' | 'md' | 'lg'
})

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

const difficultyLevels = [
  { value: 'A1' as CEFRLevel, label: 'A1 入门' },
  { value: 'A2' as CEFRLevel, label: 'A2 基础' },
  { value: 'B1' as CEFRLevel, label: 'B1 中级' },
  { value: 'B2' as CEFRLevel, label: 'B2 中高级' },
  { value: 'C1' as CEFRLevel, label: 'C1 高级' },
  { value: 'C2' as CEFRLevel, label: 'C2 精通' }
]

const sources: ContentSource[] = ['BBC', 'CNN', 'NYT', 'Reddit', 'X', 'Medium', 'TED', 'YouTube']

const styleOptions: Array<{ value: ThemeStyle; label: string; description: string; colors: string[] }> = [
  { value: 'minimalist', label: '极简', description: '中性灰调，适度圆角', colors: ['#18181b', '#71717a', '#fafafa', '#e4e4e7'] },
  { value: 'vercel', label: 'Vercel', description: '纯黑白，锐利边角', colors: ['#000000', '#666666', '#ffffff', '#eaeaea'] },
  { value: 'apple', label: 'Apple', description: '毛玻璃，超大圆角', colors: ['#007AFF', '#86868b', '#f5f5f7', '#1d1d1f'] },
  { value: 'golden-time', label: 'Golden Time', description: '暖金色，深色优雅', colors: ['#C9A84C', '#A89B85', '#1A1612', '#F5F0E8'] },
  { value: 'vibe-camp', label: 'Vibe Camp', description: '明亮彩色，活泼年轻', colors: ['#FF6B35', '#8B7E74', '#FFFBF5', '#2D2A26'] },
  { value: 'barbie', label: 'Barbie', description: '粉色渐变，可爱圆润', colors: ['#E91E8C', '#9B6E9B', '#FFF0F5', '#4A154B'] },
  { value: 'google', label: 'Google', description: 'Material Design，彩色按钮', colors: ['#1A73E8', '#5F6368', '#FFFFFF', '#202124'] }
]

const fontSizes: Array<{ value: 'sm' | 'md' | 'lg'; label: string }> = [
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '大' }
]

function handleStyleChange(style: ThemeStyle) {
  setTheme(style)
  toast.success(`已切换到 ${styleOptions.find(s => s.value === style)?.label} 风格`)
}

function toggleDifficulty(level: CEFRLevel) {
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
  // Apply AI configuration
  if (aiSettings.enabled && aiSettings.endpoint && aiSettings.apiKey) {
    configureAI({
      endpoint: aiSettings.endpoint,
      apiKey: aiSettings.apiKey,
      debug: true
    })
    toast.success('AI 配置已保存，将使用真实 API')
  } else {
    // Reset to mock mode
    configureAI({
      endpoint: '/api/ai',
      apiKey: ''
    })
    if (aiSettings.enabled) {
      toast.warning('AI 已启用但未配置完整，使用模拟模式')
    } else {
      toast.info('AI 已关闭，使用模拟模式')
    }
  }

  // TODO: Save other settings to localStorage or API
  console.log('Settings saved:', { settings, aiSettings })
  toast.success('设置已保存')
}

function resetSettings() {
  // TODO: Reset to defaults
  console.log('Settings reset')
  toast.info('设置已重置')
}
</script>

<style scoped>
.settings-page {
  padding: var(--space-6);
  max-width: 800px;
  margin: 0 auto;
}

/* Settings Sections */
.settings-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
}

.settings-section {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.setting-label {
  flex: 1;
}

.setting-label h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.setting-label p {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.setting-unit {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
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

/* Difficulty & Source Options */
.difficulty-options,
.source-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.difficulty-btn,
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

.difficulty-btn:hover,
.source-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.difficulty-btn.active,
.source-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* Setting item full width variant */
.setting-item--full {
  flex-direction: column;
  align-items: flex-start;
}

/* Style Grid */
.style-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
  width: 100%;
  margin-top: var(--space-3);
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

/* Font Size Options */
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

/* Footer */
.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

/* AI Mode Badge */
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

@media (max-width: 480px) {
  .auth-prompt {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-info {
    flex-wrap: wrap;
  }

  .user-actions {
    width: 100%;
    margin-top: var(--space-2);
  }
}
</style>
