<template>
  <div class="listening-page">
    <PageHeader title="听力" subtitle="来自全球的听力素材" />

    <!-- Filters -->
    <section class="filters-section">
      <div class="filter-group">
        <label class="filter-label">难度</label>
        <div class="filter-options">
          <button
            v-for="level in difficultyLevels"
            :key="level.value"
            :class="['filter-btn', { active: selectedDifficulty === level.value }]"
            @click="selectedDifficulty = selectedDifficulty === level.value ? null : level.value"
          >
            {{ level.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Loading Skeleton -->
    <section v-if="loading" class="materials-list">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </section>

    <!-- Empty State -->
    <EmptyState
      v-else-if="materials.length === 0"
      title="暂无听力素材"
      description="稍后再来试试吧，或从「内容」页面添加音频资源"
      action-text="去浏览内容"
      @action="$router.push('/content')"
    />

    <!-- Material List -->
    <section v-else class="materials-list">
      <div
        v-for="material in materials"
        :key="material.id"
        :class="['material-card', { active: selectedMaterial?.id === material.id }]"
        @click="selectMaterial(material)"
      >
        <div class="material-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div class="material-content">
          <h3 class="material-title">{{ material.title }}</h3>
          <div class="material-meta">
            <span class="material-source">{{ material.source }}</span>
            <span :class="['material-difficulty', `difficulty-${material.difficulty}`]">
              {{ material.difficulty }}
            </span>
            <span class="material-duration">{{ formatDuration(material.duration) }}</span>
          </div>
          <div class="material-tags">
            <span v-for="tag in material.tags" :key="tag" class="material-tag">
              {{ tag }}
            </span>
          </div>
        </div>
        <div class="material-play">
          <button class="play-btn" @click.stop="togglePlay(material)">
            <svg v-if="playingId !== material.id" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Player Section -->
    <section v-if="selectedMaterial" class="player-section">
      <div class="player-card">
        <div class="player-header">
          <div class="player-title-row">
            <h3>{{ selectedMaterial.title }}</h3>
            <PronunciationBtn :text="selectedMaterial.title" size="sm" />
          </div>
          <span class="player-source">{{ selectedMaterial.source }}</span>
        </div>

        <!-- Audio Player -->
        <AudioPlayer
          :playing="isPlaying"
          :current-time="currentTime"
          :duration="selectedMaterial.duration"
          :current-speed="currentSpeed"
          @toggle-play="togglePlay(selectedMaterial)"
          @skip-backward="skipBackward"
          @skip-forward="skipForward"
          @update:speed="(s: number) => currentSpeed = s"
        />

        <!-- Transcript -->
        <div class="transcript-section">
          <div class="transcript-header">
            <h4 class="transcript-title">原文</h4>
            <button
              :class="['dictation-toggle', { active: dictationMode }]"
              @click="dictationMode = !dictationMode"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              精听模式
            </button>
          </div>

          <div v-if="dictationMode" class="dictation-list">
            <div
              v-for="(line, index) in selectedMaterial.transcript.split('\n')"
              :key="index"
              :class="['dictation-item', { active: activeSentenceIndex === index }]"
              @click="activeSentenceIndex = index"
            >
              <span class="sentence-number">{{ index + 1 }}</span>
              <DictationMode :sentence="line" />
            </div>
          </div>

          <div v-else class="transcript-content">
            <TranscriptHighlight
              :text="selectedMaterial.transcript"
              :highlight-words="selectedMaterial.tags || []"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useContentStore } from '../stores/content'
import { PageHeader, AudioPlayer, Skeleton, EmptyState, DictationMode, TranscriptHighlight, PronunciationBtn } from '../components'
import { useToast } from '../composables/useToast'
import type { ListeningMaterial, CEFRLevel } from '../types'

const contentStore = useContentStore()
const materials = computed(() => contentStore.listeningMaterials)
const selectedMaterial = ref<ListeningMaterial | null>(null)
const selectedDifficulty = ref<CEFRLevel | null>(null)
const playingId = ref<string | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const currentSpeed = ref(1)
const loading = computed(() => contentStore.loading)
const toast = useToast()
const dictationMode = ref(false)
const activeSentenceIndex = ref(-1)

const difficultyLevels = [
  { value: 'A1' as CEFRLevel, label: 'A1 入门' },
  { value: 'A2' as CEFRLevel, label: 'A2 基础' },
  { value: 'B1' as CEFRLevel, label: 'B1 中级' },
  { value: 'B2' as CEFRLevel, label: 'B2 中高级' },
  { value: 'C1' as CEFRLevel, label: 'C1 高级' },
  { value: 'C2' as CEFRLevel, label: 'C2 精通' }
]

async function fetchMaterials() {
  await contentStore.fetchListeningMaterials({
    difficulty: selectedDifficulty.value || undefined
  })
}

watch(selectedDifficulty, fetchMaterials)

onMounted(fetchMaterials)

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function selectMaterial(material: ListeningMaterial) {
  selectedMaterial.value = material
  currentTime.value = 0
  dictationMode.value = false
  activeSentenceIndex.value = -1
  toast.success('已选择听力素材')
}

function togglePlay(material: ListeningMaterial) {
  if (playingId.value === material.id) {
    isPlaying.value = !isPlaying.value
  } else {
    playingId.value = material.id
    isPlaying.value = true
  }
  // TODO: Implement actual audio playback
}

function skipBackward() {
  currentTime.value = Math.max(0, currentTime.value - 10)
}

function skipForward() {
  if (selectedMaterial.value) {
    currentTime.value = Math.min(selectedMaterial.value.duration, currentTime.value + 10)
  }
}
</script>

<style scoped>
.listening-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* Filters */
.filters-section {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.filter-options {
  display: flex;
  gap: var(--space-1);
}

.filter-btn {
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

.filter-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* Materials List */
.materials-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.material-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.16s ease;
}

.material-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.material-card.active {
  border-color: var(--color-primary);
  background: var(--color-surface-muted);
}

.material-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.material-content {
  flex: 1;
  min-width: 0;
}

.material-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.material-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.material-source {
  font-weight: 600;
}

.material-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 1px 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.difficulty-A1 { background: var(--color-success-50); color: var(--color-success-700); }
.difficulty-A2 { background: var(--color-success-50); color: var(--color-success-600); }
.difficulty-B1 { background: #fef3c7; color: #d97706; }
.difficulty-B2 { background: #fef3c7; color: #b45309; }
.difficulty-C1 { background: var(--color-danger-50); color: var(--color-danger-600); }
.difficulty-C2 { background: var(--color-danger-50); color: var(--color-danger-700); }

.material-tags {
  display: flex;
  gap: var(--space-1);
}

.material-tag {
  padding: 2px 6px;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.material-play {
  flex-shrink: 0;
}

.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  cursor: pointer;
  transition: filter 0.16s ease;
}

.play-btn:hover {
  filter: brightness(0.9);
}

/* Player Section */
.player-section {
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.player-card {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.player-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.player-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.player-source {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* Transcript */
.transcript-section {
  max-height: 300px;
  overflow-y: auto;
}

.transcript-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.transcript-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.dictation-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.dictation-toggle:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.dictation-toggle.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.dictation-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dictation-item {
  position: relative;
  padding-left: var(--space-6);
}

.dictation-item.active {
  border-left: 2px solid var(--color-primary);
}

.sentence-number {
  position: absolute;
  left: 0;
  top: var(--space-4);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  width: 20px;
  text-align: center;
}

.transcript-content {
  font-size: 0.9375rem;
  line-height: 1.8;
  color: var(--color-text);
}
</style>
