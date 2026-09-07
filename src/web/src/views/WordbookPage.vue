<template>
  <div class="wordbook-page">
    <PageHeader
      title="生词本"
      :subtitle="`已收藏 ${total.toLocaleString()} 词 · 点击卡片查看详情或编辑`"
    />

    <section class="stats-section">
      <div class="stat-card">
        <span class="stat-value">{{ total }}</span>
        <span class="stat-label">总词数</span>
      </div>
      <div class="stat-card">
        <span class="stat-value stat-danger">{{ stats.due }}</span>
        <span class="stat-label">待复习</span>
      </div>
      <div class="stat-card">
        <span class="stat-value stat-warning">{{ stats.learning }}</span>
        <span class="stat-label">复习中</span>
      </div>
      <div class="stat-card">
        <span class="stat-value stat-success">{{ stats.mastered }}</span>
        <span class="stat-label">已掌握</span>
      </div>
    </section>

    <section class="toolbar">
      <div class="toolbar-row">
        <BaseInput v-model="searchQuery" placeholder="搜索单词 / 翻译 / 备注..." @input="onSearchInput">
          <template #prefix>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </template>
        </BaseInput>
        <BaseButton variant="secondary" size="sm" @click="router.push('/vocabulary')">
          + 去词典库添加
        </BaseButton>
      </div>

      <div class="toolbar-row">
        <BaseTabs :model-value="statusFilter" :tabs="statusTabs" @update:model-value="setStatusFilter" />

        <div class="toolbar-right">
          <label class="sort-label">排序</label>
          <select v-model="sortBy" class="sort-select" @change="reload">
            <option value="createdAt">添加时间</option>
            <option value="word">字母</option>
            <option value="nextReviewDate">下次复习</option>
          </select>
          <button class="sort-order-btn" :title="sortOrder === 'desc' ? '降序' : '升序'" @click="toggleSortOrder">
            <svg v-if="sortOrder === 'desc'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 15 12 9 18 15"/></svg>
          </button>
        </div>
      </div>
    </section>

    <section v-if="selectedIds.size > 0" class="bulk-bar">
      <span class="bulk-info">已选 {{ selectedIds.size }} 项</span>
      <div class="bulk-actions">
        <BaseButton variant="secondary" size="sm" @click="clearSelection">取消</BaseButton>
        <BaseButton variant="danger" size="sm" @click="batchDelete">批量删除</BaseButton>
      </div>
    </section>

    <Skeleton v-if="loading" variant="table" />
    <ErrorState v-else-if="error" title="加载失败" :message="error" @retry="reload" />
    <EmptyState
      v-else-if="items.length === 0 && !searchQuery && statusFilter === 'ALL'"
      title="生词本是空的"
      description="去词典库选词收藏，或在阅读时随手收藏生词"
    />
    <EmptyState
      v-else-if="items.length === 0"
      title="未找到匹配的词汇"
      description="试试切换状态筛选或更换关键词"
    />

    <div v-else class="word-grid">
      <div
        v-for="entry in items"
        :key="entry.id"
        :class="['word-card', { selected: selectedIds.has(entry.id) }]"
      >
        <label class="word-card-checkbox" @click.stop>
          <input type="checkbox" :checked="selectedIds.has(entry.id)" @change="toggleSelect(entry.id)" />
        </label>
        <div class="word-card-body" @click="openEdit(entry)">
          <div class="word-card-header">
            <span class="word-card-text">{{ entry.word }}</span>
            <span v-if="entry.phonetic" class="word-card-phonetic">/{{ entry.phonetic }}/</span>
            <BaseTag :variant="statusVariant(entry.masteryStatus)" size="sm">
              {{ statusLabel(entry.masteryStatus) }}
            </BaseTag>
          </div>
          <p v-if="entry.translation" class="word-card-translation">
            {{ entry.translation }}
          </p>
          <div v-if="entry.tags && (entry.tags as string[]).length" class="word-card-tags">
            <BaseTag v-for="t in (entry.tags as string[]).slice(0, 4)" :key="t" variant="muted" size="sm">
              {{ t }}
            </BaseTag>
          </div>
          <div v-if="entry.note" class="word-card-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>{{ entry.note }}</span>
          </div>
          <div v-if="entry.nextReviewDate" class="word-card-review">
            下次复习：{{ formatDate(entry.nextReviewDate) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="changePage(page - 1)">上一页</BaseButton>
      <span class="page-numbers">
        <button
          v-for="p in visiblePages"
          :key="p"
          :class="['page-btn', { active: p === page }]"
          @click="changePage(p)"
        >{{ p }}</button>
      </span>
      <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</BaseButton>
    </div>

    <BaseModal v-model="editVisible" :title="editingEntry ? `编辑 · ${editingEntry.word}` : '编辑生词'" size="md">
      <div v-if="editingEntry" class="edit-form">
        <div class="form-row">
          <label>单词</label>
          <BaseInput v-model="editForm.word" placeholder="word" />
        </div>
        <div class="form-row">
          <label>音标</label>
          <BaseInput v-model="editForm.phonetic" placeholder="/phonetic/" />
        </div>
        <div class="form-row">
          <label>中文释义 <span class="required">*</span></label>
          <BaseInput v-model="editForm.translation" placeholder="释义（必填）" />
        </div>
        <div class="form-row">
          <label>英文释义</label>
          <textarea v-model="editForm.definition" class="form-textarea" placeholder="英文 definition（可选）" rows="3" />
        </div>
        <div class="form-row">
          <label>例句 <span class="hint">（一行一句）</span></label>
          <textarea
            v-model="editForm.examplesText"
            class="form-textarea"
            placeholder="例句 1&#10;例句 2"
            rows="4"
          />
        </div>
        <div class="form-row">
          <label>标签 <span class="hint">（逗号或换行分隔）</span></label>
          <BaseInput v-model="editForm.tagsText" placeholder="CET4, 雅思, 高频" />
        </div>
        <div class="form-row">
          <label>个人备注</label>
          <textarea v-model="editForm.note" class="form-textarea" placeholder="学习笔记、记忆口诀、相关联想..." rows="3" />
        </div>

        <div v-if="editingEntry.lastReviewDate" class="review-info">
          <div class="review-info-row">
            <span>掌握状态</span>
            <BaseTag :variant="statusVariant(editingEntry.masteryStatus)" size="sm">
              {{ statusLabel(editingEntry.masteryStatus) }}
            </BaseTag>
          </div>
          <div class="review-info-row">
            <span>复习次数</span>
            <span>{{ editingEntry.repetitions }}</span>
          </div>
          <div class="review-info-row">
            <span>当前间隔</span>
            <span>{{ editingEntry.interval }} 天</span>
          </div>
          <div class="review-info-row">
            <span>下次复习</span>
            <span>{{ formatDate(editingEntry.nextReviewDate) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="editVisible = false">取消</BaseButton>
        <BaseButton variant="danger" @click="deleteCurrent">删除</BaseButton>
        <BaseButton variant="primary" :disabled="!editForm.translation.trim()" @click="saveEdit">保存</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="confirmVisible" title="确认删除" size="sm">
      <p class="confirm-text">
        {{ confirmMessage }}
        <br />该操作不可撤销。
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="confirmVisible = false">取消</BaseButton>
        <BaseButton variant="danger" @click="executeConfirm">确认删除</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  PageHeader, BaseInput, BaseButton, BaseModal, BaseTag, BaseTabs,
  Skeleton, EmptyState, ErrorState
} from '../components'
import { vocabularyApi, type VocabularyEntry, type MasteryStatus } from '../api/vocabulary'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()

const items = ref<VocabularyEntry[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const totalPages = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)

const searchQuery = ref('')
const statusFilter = ref<MasteryStatus | 'ALL'>('ALL')
const sortBy = ref<'createdAt' | 'word' | 'nextReviewDate'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const statusTabs = [
  { value: 'ALL', label: '全部' },
  { value: 'NOT_REVIEWED', label: '未复习' },
  { value: 'NEW', label: '新词' },
  { value: 'LEARNING', label: '需复习' },
  { value: 'REVIEWING', label: '学习中' },
  { value: 'MASTERED', label: '已掌握' },
]

const stats = reactive({ due: 0, learning: 0, mastered: 0 })

let searchTimer: ReturnType<typeof setTimeout> | null = null

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 3)
  const end = Math.min(totalPages.value, page.value + 3)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function reload() {
  loading.value = true
  error.value = null
  try {
    const res = await vocabularyApi.getList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchQuery.value || undefined,
      mastery: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
    items.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages
    page.value = res.page
    stats.due = items.value.filter(i => i.nextReviewDate && new Date(i.nextReviewDate) <= new Date()).length
    stats.learning = items.value.filter(i => i.masteryStatus === 'LEARNING' || i.masteryStatus === 'REVIEWING').length
    stats.mastered = items.value.filter(i => i.masteryStatus === 'MASTERED').length
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载生词本失败'
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    reload()
  }, 300)
}

function setStatusFilter(v: string | number) {
  statusFilter.value = v as MasteryStatus | 'ALL'
  page.value = 1
  reload()
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  reload()
}

function changePage(p: number) {
  page.value = p
  reload()
}

const selectedIds = reactive(new Set<string>())

function toggleSelect(id: string) {
  if (selectedIds.has(id)) selectedIds.delete(id)
  else selectedIds.add(id)
}

function clearSelection() {
  selectedIds.clear()
}

async function batchDelete() {
  const ids = Array.from(selectedIds)
  confirmMessage = `确定要删除选中的 ${ids.length} 个生词？`
  confirmAction = async () => {
    try {
      await vocabularyApi.deleteMany(ids)
      items.value = items.value.filter(i => !selectedIds.has(i.id))
      total.value = Math.max(0, total.value - ids.length)
      selectedIds.clear()
      toast.success(`已删除 ${ids.length} 个生词`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批量删除失败')
    }
  }
  confirmVisible.value = true
}

const editVisible = ref(false)
const editingEntry = ref<VocabularyEntry | null>(null)
const editForm = reactive({
  word: '',
  phonetic: '',
  translation: '',
  definition: '',
  examplesText: '',
  tagsText: '',
  note: '',
})

function openEdit(entry: VocabularyEntry) {
  editingEntry.value = entry
  editForm.word = entry.word
  editForm.phonetic = entry.phonetic ?? ''
  editForm.translation = entry.translation ?? ''
  editForm.definition = entry.definition ?? ''
  const ex = entry.examples
  if (Array.isArray(ex)) {
    if (ex.length === 0) {
      editForm.examplesText = ''
    } else if (typeof ex[0] === 'string') {
      editForm.examplesText = (ex as string[]).join('\n')
    } else {
      editForm.examplesText = (ex as { en?: string; cn?: string }[]).map(e => e.en || e.cn || '').join('\n')
    }
  } else {
    editForm.examplesText = ''
  }
  editForm.tagsText = Array.isArray(entry.tags) ? entry.tags.join(', ') : ''
  editForm.note = entry.note ?? ''
  editVisible.value = true
}

async function saveEdit() {
  if (!editingEntry.value) return
  if (!editForm.translation.trim()) {
    toast.error('中文释义不能为空')
    return
  }
  try {
    const examples = editForm.examplesText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const tags = editForm.tagsText
      .split(/[,,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const updated = await vocabularyApi.updateWord(editingEntry.value.id, {
      word: editForm.word.trim() || editingEntry.value.word,
      phonetic: editForm.phonetic.trim() || undefined,
      translation: editForm.translation.trim(),
      definition: editForm.definition.trim() || undefined,
      examples,
      tags,
      note: editForm.note.trim() || undefined,
    })
    const idx = items.value.findIndex(i => i.id === updated.id)
    if (idx !== -1) items.value[idx] = updated
    toast.success('保存成功')
    editVisible.value = false
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  }
}

function deleteCurrent() {
  if (!editingEntry.value) return
  const word = editingEntry.value.word
  confirmMessage = `确定要删除「${word}」？`
  confirmAction = async () => {
    if (!editingEntry.value) return
    try {
      await vocabularyApi.delete(editingEntry.value.id)
      items.value = items.value.filter(i => i.id !== editingEntry.value!.id)
      total.value = Math.max(0, total.value - 1)
      selectedIds.delete(editingEntry.value.id)
      toast.success(`已删除「${word}」`)
      editVisible.value = false
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }
  confirmVisible.value = true
}

const confirmVisible = ref(false)
let confirmMessage = ''
let confirmAction: () => Promise<void> = async () => {}
async function executeConfirm() {
  confirmVisible.value = false
  await confirmAction()
}

function statusVariant(s: MasteryStatus): 'muted' | 'primary' | 'warning' | 'success' {
  switch (s) {
    case 'MASTERED': return 'success'
    case 'REVIEWING': return 'primary'
    case 'LEARNING': return 'warning'
    default: return 'muted'
  }
}

function statusLabel(s: MasteryStatus): string {
  switch (s) {
    case 'MASTERED': return '已掌握'
    case 'REVIEWING': return '学习中'
    case 'LEARNING': return '需复习'
    case 'NEW': return '新词'
    default: return '未复习'
  }
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  const now = new Date()
  const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff > 1 && diff <= 7) return `${diff} 天后`
  if (diff < -1 && diff >= -7) return `${-diff} 天前`
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  reload()
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.wordbook-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.stat-danger { color: var(--color-danger-600); }
.stat-warning { color: var(--color-warning-600); }
.stat-success { color: var(--color-success-600); }

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.toolbar-row:first-child :deep(.input-wrapper) {
  flex: 1;
  max-width: 360px;
}

.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.sort-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.sort-select {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: 0.8125rem;
  cursor: pointer;
}

.sort-order-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.sort-order-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.bulk-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-md);
}

.bulk-info {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary-700);
}

.bulk-actions {
  display: flex;
  gap: var(--space-2);
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);
}

.word-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.word-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.word-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-50);
}

.word-card-checkbox {
  display: inline-flex;
  align-items: center;
  padding-top: 2px;
  flex-shrink: 0;
}

.word-card-checkbox input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.word-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.word-card-header {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.word-card-text {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text);
}

.word-card-phonetic {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.word-card-translation {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.word-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.word-card-note {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-warning-700);
  background: var(--color-warning-50);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  margin-top: 2px;
}

.word-card-note svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.word-card-review {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-top: 2px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.page-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.required {
  color: var(--color-danger-600);
}

.hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-muted);
}

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 0.875rem;
  background: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
  min-height: 60px;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.review-info {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
}

.review-info-row > span:first-child {
  color: var(--color-text-muted);
}

.confirm-text {
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .wordbook-page { padding: var(--space-3); }
  .word-grid { grid-template-columns: 1fr; }
  .toolbar-row { flex-wrap: wrap; }
  .toolbar-right { margin-left: 0; }
}
</style>