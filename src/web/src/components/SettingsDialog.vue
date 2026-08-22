<template>
  <BaseModal v-model="visible" size="lg" :close-on-overlay="true" class="settings-dialog-root">
    <template #header>
      <div class="dialog-header">
        <h3 class="dialog-title">设置</h3>
        <p class="dialog-subtitle">自定义你的学习体验</p>
      </div>
    </template>

    <div class="dialog-body-layout">
      <!-- 左侧分类导航 -->
      <nav class="settings-nav">
        <ul class="nav-list">
          <li
            v-for="(cat, idx) in categories"
            :key="cat.key"
            :class="['nav-item', { active: activeKey === cat.key }]"
            @click="activeKey = cat.key"
          >
            <span class="nav-icon" v-html="cat.icon" />
            <span class="nav-label">{{ cat.label }}</span>
            <span v-if="idx === 4 && providers.length > 0" class="nav-badge">{{ providers.length }}</span>
          </li>
        </ul>
      </nav>

      <!-- 右侧细项内容 -->
      <div class="settings-content">
        <div class="content-scroll">
          <!-- 1. 学习目标 -->
          <div v-show="activeKey === 'goals'" class="panel">
            <h4 class="panel-title">每日目标</h4>
            <SettingsSection>
              <SettingItem title="学习时长目标" description="每天计划学习的分钟数">
                <input
                  :value="settings.dailyGoalMinutes"
                  type="number"
                  min="5"
                  max="480"
                  class="native-number-input"
                  @input="(e: any) => (settings.dailyGoalMinutes = Math.min(480, Math.max(5, Number(e.target.value) || 0)))"
                />
                <span class="setting-unit">分钟</span>
              </SettingItem>
              <SettingItem title="新词目标" description="每天计划学习的新单词数">
                <input
                  :value="settings.dailyGoalWords"
                  type="number"
                  min="1"
                  max="500"
                  class="native-number-input"
                  @input="(e: any) => (settings.dailyGoalWords = Math.min(500, Math.max(1, Number(e.target.value) || 0)))"
                />
                <span class="setting-unit">个</span>
              </SettingItem>
            </SettingsSection>
          </div>

          <!-- 2. 提醒通知 -->
          <div v-show="activeKey === 'reminders'" class="panel">
            <h4 class="panel-title">提醒</h4>
            <SettingsSection>
              <SettingItem title="学习提醒" description="开启每日学习提醒通知">
                <Toggle v-model="settings.reminderEnabled" />
              </SettingItem>
              <SettingItem v-if="settings.reminderEnabled" title="提醒时间" description="设置每日提醒的时间">
                <BaseInput v-model="settings.reminderTime" type="time" />
              </SettingItem>
            </SettingsSection>
          </div>

          <!-- 3. 内容偏好 -->
          <div v-show="activeKey === 'content'" class="panel">
            <h4 class="panel-title">内容偏好</h4>
            <SettingsSection>
              <SettingItem title="难度偏好" description="选择适合你水平的内容难度" full-width>
                <DifficultySelector :model-value="settings.difficultyPreference[0] || ''" @update:model-value="toggleDifficulty($event)" />
              </SettingItem>
              <SettingItem title="内容来源" description="选择你偏好的内容来源" full-width>
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
          </div>

          <!-- 4. 外观显示 -->
          <div v-show="activeKey === 'display'" class="panel">
            <h4 class="panel-title">显示</h4>
            <SettingsSection>
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
          </div>

          <!-- 5. 个人资料 -->
          <div v-show="activeKey === 'profile'" class="panel">
            <h4 class="panel-title">个人资料</h4>
            <SettingsSection>
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
          </div>

          <!-- 6. AI与系统 -->
          <div v-show="activeKey === 'ai'" class="panel">
            <h4 class="panel-title">AI 服务商（系统级）</h4>
            <p class="panel-desc">翻译、摘要、AI 问答等所有后台任务按优先级轮换使用这些服务商；某个被限流（429）时自动切换并在 60 秒后重试。修改后立即对前后台生效。</p>
            <SettingsSection>
              <SettingItem full-width>
                <div class="provider-list">
                  <div v-if="providersLoading" class="provider-hint">加载中…</div>
                  <div v-else-if="providers.length === 0" class="provider-hint">
                    暂无服务商，后台将回退到环境变量配置
                  </div>
                  <div v-for="p in providers" :key="p.id" :class="['provider-card', { 'provider-disabled': !p.enabled }]">
                    <div class="provider-head">
                      <span class="provider-name">{{ p.name }}</span>
                      <span v-if="p.enabled && isPrimary(p)" class="provider-role role-primary">主力</span>
                      <span v-else class="provider-role">优先级 {{ p.priority }}</span>
                      <span v-if="testResults[p.id]" :class="['provider-test', testResults[p.id]!.ok ? 'test-ok' : 'test-fail']">
                        {{ testResults[p.id]!.ok ? `✓ ${testResults[p.id]!.latencyMs}ms` : `✗ ${(testResults[p.id]!.message || '失败').slice(0, 40)}` }}
                      </span>
                      <span class="provider-spacer"></span>
                      <Toggle :model-value="p.enabled" @update:model-value="(v: boolean) => toggleProvider(p, v)" />
                    </div>
                    <div class="provider-meta">
                      <span class="meta-item" :title="p.baseUrl">{{ p.baseUrl }}</span>
                      <span class="meta-item">模型：{{ p.model }}</span>
                      <span class="meta-item">Key：{{ p.apiKeyMasked }}</span>
                    </div>
                    <div class="provider-actions">
                      <BaseButton variant="secondary" size="sm" :disabled="testingId === p.id" @click="testProvider(p)">
                        {{ testingId === p.id ? '测试中…' : '测试连通' }}
                      </BaseButton>
                      <BaseButton variant="secondary" size="sm" @click="startEdit(p)">编辑</BaseButton>
                      <BaseButton variant="secondary" size="sm" @click="removeProvider(p)">删除</BaseButton>
                    </div>
                  </div>

                  <div v-if="editing" class="provider-editor">
                    <div class="editor-title">{{ editing.id ? '编辑服务商' : '新增服务商' }}</div>
                    <div class="editor-grid">
                      <label>名称<input v-model="editing.name" placeholder="agnes（主力）" /></label>
                      <label>Base URL<input v-model="editing.baseUrl" placeholder="https://api.example.com/v1" /></label>
                      <label>模型<input v-model="editing.model" placeholder="agnes-2.5-flash" /></label>
                      <label>优先级<input v-model.number="editing.priority" type="number" min="1" max="1000" /></label>
                      <label class="editor-key">
                        API Key（{{ editing.id ? '留空保持不变，当前 ' + editing.apiKeyMasked : '必填' }}）
                        <input v-model="editing.apiKey" type="password" placeholder="sk-..." />
                      </label>
                    </div>
                    <div class="editor-actions">
                      <BaseButton size="sm" :disabled="!editing.name || !editing.baseUrl || !editing.model || (!editing.id && !editing.apiKey)" @click="saveProvider">保存</BaseButton>
                      <BaseButton variant="secondary" size="sm" @click="editing = null">取消</BaseButton>
                    </div>
                  </div>

                  <BaseButton v-if="!editing" variant="secondary" size="sm" @click="startCreate">+ 新增服务商</BaseButton>
                </div>
              </SettingItem>
            </SettingsSection>

            <h4 class="panel-title mt-extra">AI 智能助手（个人覆盖，可选）</h4>
            <p class="panel-desc">填写后将优先用于 AI 问答/练习题；留空则始终走上方系统级服务商。数据管线翻译不受此影响。</p>
            <SettingsSection>
              <SettingItem title="启用个人覆盖" description="填写后将优先用于 AI 问答/练习题；留空则始终走上方系统级服务商。">
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
        </div>

        <!-- 底部操作栏 -->
        <div class="panel-footer">
          <BaseButton variant="secondary" @click="resetSettings">重置</BaseButton>
          <BaseButton @click="saveSettings">保存设置</BaseButton>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect, watch, onMounted } from 'vue'
import {
  BaseModal,
  SettingsSection,
  SettingItem,
  Toggle,
  BaseInput,
  BaseButton,
  DifficultySelector,
  ThemeSelector
} from '.'
import { useToast } from '../composables/useToast'
import { useTheme } from '../composables/useTheme'
import { configureAI, aiProvidersApi } from '../api/ai'
import type { AiProvider, AiProviderTestResult } from '../api/ai'
import { uploadApi } from '../api/upload'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/auth'
import type { ThemeStyle } from '../composables/useTheme'
import type { CEFRLevel, ContentSource } from '../types'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const visible = ref(props.modelValue)
watch(() => props.modelValue, (v) => (visible.value = v))
watch(visible, (v) => emit('update:modelValue', v))

// ── 左侧 6 个分类 ──────────────────────────────────────────────
const categories = [
  { key: 'goals',     label: '学习目标', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' },
  { key: 'reminders', label: '提醒通知', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
  { key: 'content',   label: '内容偏好', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
  { key: 'display',   label: '外观显示', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813h6.112l-4.943 3.587 1.887 5.813L12 14.626 7.032 18.213l1.887-5.813L3.976 8.813h6.112L12 3z"/></svg>' },
  { key: 'profile',   label: '个人资料', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { key: 'ai',        label: 'AI 与系统', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h.01M15 9h.01M9 15c.83.83 2.17.83 3 0s2.17-.83 3 0"/></svg>' },
]
const activeKey = ref<string>('goals')

// 对外切换到指定分类的方法（可选扩展）
defineExpose({ setActive: (k: string) => { if (categories.find(c => c.key === k)) activeKey.value = k } })

// ── 共享逻辑 ───────────────────────────────────────────────────
const toast = useToast()
const auth = useAuthStore()
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUrl = ref<string>('')
watch(() => auth.user?.avatar, (v) => { if (v) avatarUrl.value = uploadApi.normalizeAvatarUrl(v) || v }, { immediate: true })
watch(visible, (v) => { if (v && auth.user?.avatar) avatarUrl.value = uploadApi.normalizeAvatarUrl(auth.user.avatar) || auth.user.avatar })

async function handleAvatarUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const result = await uploadApi.uploadFile(file, 'avatar')
    avatarUrl.value = uploadApi.normalizeAvatarUrl(result.url, result.key) || result.url
    await auth.fetchProfile()
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
  dailyGoalMinutes: 30,
  dailyGoalWords: 10,
  reminderEnabled: true,
  reminderTime: '09:00',
  difficultyPreference: ['B1', 'B2'] as CEFRLevel[],
  preferredSources: ['BBC', 'CNN', 'NYT'] as ContentSource[],
  fontSize: (savedFontSize || 'md') as 'sm' | 'md' | 'lg'
})

function applyFontSize(size: 'sm' | 'md' | 'lg') {
  document.documentElement.setAttribute('data-font-size', size)
  localStorage.setItem(FONT_SIZE_KEY, size)
}

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

// ── 系统级 AI Provider ──────────────────────────────────────────
const providers = ref<AiProvider[]>([])
const providersLoading = ref(false)
const testResults = reactive<Record<string, AiProviderTestResult>>({})
const testingId = ref('')
const editing = ref<{
  id?: string
  nameOriginal?: string
  apiKeyMasked?: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  priority: number
} | null>(null)

function isPrimary(p: AiProvider): boolean {
  return providers.value.filter((x) => x.enabled).every((x) => x.priority >= p.priority)
}

async function loadProviders(): Promise<void> {
  providersLoading.value = true
  try {
    providers.value = await aiProvidersApi.list()
  } catch {
    toast.error('加载 AI 服务商失败')
  } finally {
    providersLoading.value = false
  }
}

onMounted(loadProviders)

async function loadSettings() {
  try {
    const saved = await authApi.getSettings() as Record<string, unknown>
    if (!saved || typeof saved !== 'object') return
    if (typeof saved.dailyGoalMinutes === 'number') settings.dailyGoalMinutes = saved.dailyGoalMinutes
    if (typeof saved.dailyGoalWords === 'number') settings.dailyGoalWords = saved.dailyGoalWords
    if (typeof saved.reminderEnabled === 'boolean') settings.reminderEnabled = saved.reminderEnabled
    if (typeof saved.reminderTime === 'string') settings.reminderTime = saved.reminderTime
    if (Array.isArray(saved.difficultyPreference)) settings.difficultyPreference = saved.difficultyPreference
    if (Array.isArray(saved.preferredSources)) settings.preferredSources = saved.preferredSources
    if (saved.fontSize === 'sm' || saved.fontSize === 'md' || saved.fontSize === 'lg') {
      settings.fontSize = saved.fontSize
      applyFontSize(saved.fontSize)
    }
  } catch {
    // silently fail — use defaults
  }
}

// 每次打开弹窗刷新 provider 列表 + 加载用户设置
watch(visible, (v) => { if (v) { loadProviders(); loadSettings() } })

function startEdit(p: AiProvider): void {
  editing.value = {
    id: p.id,
    nameOriginal: p.name,
    apiKeyMasked: p.apiKeyMasked,
    name: p.name,
    baseUrl: p.baseUrl,
    apiKey: '',
    model: p.model,
    priority: p.priority,
  }
}

function startCreate(): void {
  editing.value = {
    name: '',
    baseUrl: '',
    apiKey: '',
    model: '',
    priority: (providers.value.length + 1) * 10,
  }
}

async function saveProvider(): Promise<void> {
  const e = editing.value
  if (!e) return
  try {
    if (e.id) {
      await aiProvidersApi.update(e.id, {
        name: e.name,
        baseUrl: e.baseUrl,
        model: e.model,
        priority: e.priority,
        apiKey: e.apiKey.trim() ? e.apiKey.trim() : '',
      })
    } else {
      await aiProvidersApi.create({
        name: e.name,
        baseUrl: e.baseUrl,
        apiKey: e.apiKey.trim(),
        model: e.model,
        priority: e.priority,
      })
    }
    toast.success('已保存，前后台即时生效')
    editing.value = null
    await loadProviders()
  } catch (err: any) {
    toast.error(err?.response?.data?.error?.message || err?.message || '保存失败')
  }
}

async function toggleProvider(p: AiProvider, enabled: boolean): Promise<void> {
  try {
    await aiProvidersApi.update(p.id, { enabled })
    p.enabled = enabled
    toast.success(enabled ? `已启用 ${p.name}` : `已停用 ${p.name}`)
  } catch {
    toast.error('操作失败')
  }
}

async function removeProvider(p: AiProvider): Promise<void> {
  if (!confirm(`确定删除服务商「${p.name}」？`)) return
  try {
    await aiProvidersApi.remove(p.id)
    toast.success('已删除')
    await loadProviders()
  } catch {
    toast.error('删除失败')
  }
}

async function testProvider(p: AiProvider): Promise<void> {
  testingId.value = p.id
  try {
    testResults[p.id] = await aiProvidersApi.test({ id: p.id })
  } catch (err: any) {
    testResults[p.id] = { ok: false, status: 0, latencyMs: 0, message: err?.message ?? '请求失败' }
  } finally {
    testingId.value = ''
  }
}

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
  applyFontSize(settings.fontSize)
  authApi.updateSettings({
    dailyGoalMinutes: settings.dailyGoalMinutes,
    dailyGoalWords: settings.dailyGoalWords,
    reminderEnabled: settings.reminderEnabled,
    reminderTime: settings.reminderTime,
    difficultyPreference: settings.difficultyPreference,
    preferredSources: settings.preferredSources,
    fontSize: settings.fontSize,
  }).catch(() => {})

  if (aiSettings.enabled && aiSettings.endpoint && aiSettings.apiKey) {
    configureAI({
      endpoint: aiSettings.endpoint,
      apiKey: aiSettings.apiKey,
      debug: true
    })
  } else {
    configureAI({
      endpoint: '/api/ai',
      apiKey: ''
    })
  }
  toast.success('设置已保存')
  visible.value = false
}

function resetSettings() {
  settings.fontSize = 'md'
  settings.dailyGoalMinutes = 30
  settings.dailyGoalWords = 10
  settings.reminderEnabled = true
  settings.reminderTime = '09:00'
  settings.difficultyPreference = ['B1', 'B2']
  settings.preferredSources = ['BBC', 'CNN', 'NYT']
  applyFontSize('md')
  authApi.updateSettings({
    dailyGoalMinutes: 30,
    dailyGoalWords: 10,
    reminderEnabled: true,
    reminderTime: '09:00',
    difficultyPreference: ['B1', 'B2'],
    preferredSources: ['BBC', 'CNN', 'NYT'],
    fontSize: 'md',
  }).catch(() => {})
  toast.info('设置已重置为默认值')
}
</script>

<style scoped>
.settings-dialog-root :deep(.modal-body) {
  padding: 0;
  overflow: hidden;
}
.settings-dialog-root :deep(.modal-content.lg) {
  max-width: 960px;
  width: 92vw;
}

.dialog-header {
  padding: 0;
}
.dialog-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
}
.dialog-subtitle {
  margin: 4px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.dialog-body-layout {
  display: flex;
  min-height: 560px;
  max-height: 82vh;
}

/* ── 左侧导航 ────────────────────────────────────────────────── */
.settings-nav {
  width: 180px;
  flex-shrink: 0;
  padding: var(--space-4) 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px var(--space-4);
  margin: 0 var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.16s ease;
  position: relative;
}
.nav-item:hover {
  background: var(--color-surface);
  color: var(--color-text);
}
.nav-item.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  box-shadow: var(--shadow-xs);
}
.nav-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.88;
}
.nav-label {
  flex: 1;
}
.nav-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  background: rgba(255,255,255,0.18);
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.nav-item:not(.active) .nav-badge {
  background: var(--color-surface);
  color: var(--color-primary);
}

/* ── 右侧内容 ────────────────────────────────────────────────── */
.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
}
.panel + .panel { margin-top: var(--space-6); }
.panel-title {
  margin: 0 0 var(--space-3);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}
.panel-title.mt-extra { margin-top: var(--space-7); }
.panel-desc {
  margin: -8px 0 var(--space-3);
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.setting-unit {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
/* 原生 number input 统一样式（保持与 BaseInput 同风格） */
.native-number-input {
  width: 96px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.native-number-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-brand-subtle);
}
.native-number-input::-webkit-outer-spin-button,
.native-number-input::-webkit-inner-spin-button {
  opacity: 1;
}

.source-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
}
.source-btn {
  padding: 6px 14px;
  font-size: 0.8125rem;
  font-weight: 600;
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

.avatar-upload {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}
.avatar-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  border: 2px dashed var(--color-border);
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
  background: var(--color-success-600, var(--color-success-600));
}

/* ── Provider 卡片 ────────────────────────────────────────────── */
.provider-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}
.provider-hint {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  padding: var(--space-2) 0;
}
.provider-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--color-surface);
}
.provider-disabled {
  opacity: 0.55;
}
.provider-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.provider-name {
  font-weight: 600;
  font-size: 0.9375rem;
}
.provider-role {
  font-size: 0.75rem;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}
.provider-role.role-primary {
  background: var(--color-brand-50, var(--color-info-50));
  color: var(--color-primary);
}
.provider-test {
  font-size: 0.75rem;
}
.provider-test.test-ok { color: var(--color-success-600, var(--color-success-600)); }
.provider-test.test-fail { color: var(--color-danger-600, var(--color-danger-600)); }
.provider-spacer { flex: 1; }
.provider-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
.meta-item {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.provider-actions {
  display: flex;
  gap: var(--space-2);
}
.provider-editor {
  border: 1px dashed var(--color-border-strong, var(--color-border));
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.editor-title {
  font-weight: 600;
  font-size: 0.875rem;
}
.editor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}
.editor-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
.editor-grid input {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: var(--color-surface);
  color: var(--color-text);
}
.editor-key { grid-column: 1 / -1; }
.editor-actions {
  display: flex;
  gap: var(--space-2);
}

/* ── 底部操作栏 ───────────────────────────────────────────────── */
.panel-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

/* ── Mobile: stack the two-column layout into a top tab bar + scrollable
   content. The fixed 180px left nav would otherwise leave the content
   column only ~165px wide on a phone, crushing every setting. ── */
@media (max-width: 768px) {
  .settings-dialog-root :deep(.modal-content.lg) {
    width: 95vw;
  }

  .dialog-body-layout {
    flex-direction: column;
    min-height: 0;
    max-height: 82vh;
  }

  .settings-nav {
    width: 100%;
    flex-shrink: 0;
    padding: var(--space-2) 0;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .nav-list {
    flex-direction: row;
    gap: 4px;
    padding: 0 var(--space-2);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .nav-item {
    flex: 0 0 auto;
    margin: 0;
    padding: 8px 10px;
    white-space: nowrap;
  }

  .settings-content {
    min-height: 0;
  }

  .content-scroll {
    padding: var(--space-3);
  }

  .panel-footer {
    padding: var(--space-3);
  }
}
</style>
