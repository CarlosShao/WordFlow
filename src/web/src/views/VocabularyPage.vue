<template>
  <div class="vocabulary-page">
    <PageHeader title="词汇" subtitle="生词本与词卡复习" />

    <!-- Tabs -->
    <BaseTabs v-model="activeTab" :tabs="tabs" />

    <!-- Word List Tab -->
    <section v-if="activeTab === 'list'" class="word-list-section">
      <div class="list-header">
        <BaseInput v-model="vocab.searchQuery" placeholder="搜索单词...">
          <template #prefix>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </template>
        </BaseInput>
        <BaseButton variant="secondary" @click="startReview">
          开始复习 ({{ vocab.reviewList.length }})
        </BaseButton>
      </div>

      <!-- Loading Skeleton -->
      <Skeleton v-if="vocab.loading" variant="table" />

      <!-- Empty State -->
      <EmptyState
        v-else-if="vocab.words.length === 0"
        title="暂无词汇"
        description="开始阅读和听力练习，自动收集生词"
      />

      <BaseTable
        v-else
        :columns="tableColumns"
        :data="filteredWords as any"
        @row-click="showWordDetailFromRow"
      >
        <template #word="{ row }">
          <div class="word-cell">
            <span class="word-text">{{ row.word }}</span>
            <span class="word-phonetic">{{ row.phonetic }}</span>
            <PronunciationBtn :text="row.word" size="sm" />
          </div>
        </template>
        <template #definition="{ row }">
          <span class="word-definition">{{ row.chineseDefinition }}</span>
        </template>
        <template #masteryLevel="{ row }">
          <div class="mastery-bar">
            <div class="mastery-fill" :style="{ width: `${row.masteryLevel}%` }" :class="getMasteryClass(row.masteryLevel)" />
          </div>
        </template>
        <template #actions="{ row }">
          <BaseButton size="sm" variant="ghost" @click.stop="showWordDetail(row)">
            详情
          </BaseButton>
        </template>
      </BaseTable>
    </section>

    <!-- Flashcard Tab -->
    <section v-if="activeTab === 'flashcard'" class="flashcard-section">
      <div v-if="currentCard" class="flashcard-container">
        <FlashCard
          ref="flashCardRef"
          :front="{
            word: currentCard.word,
            phonetic: currentCard.phonetic,
            partOfSpeech: currentCard.partOfSpeech
          }"
          :back="{
            definition: currentCard.definition,
            chineseDefinition: currentCard.chineseDefinition,
            example: currentCard.examples.length > 0 ? currentCard.examples[0] : undefined
          }"
        />

        <div class="flashcard-controls">
          <BaseButton variant="danger" @click="markAsHard">
            再看看
          </BaseButton>
          <BaseButton variant="secondary" @click="markAsGood">
            记住了
          </BaseButton>
          <BaseButton variant="primary" @click="markAsEasy">
            很简单
          </BaseButton>
        </div>

        <div class="flashcard-progress">
          <span>{{ currentIndex + 1 }} / {{ vocab.reviewList.length }}</span>
          <BaseProgress :value="((currentIndex + 1) / vocab.reviewList.length) * 100" :show-value="false" />
        </div>
      </div>

      <div v-else class="empty-state">
        <p>没有需要复习的单词</p>
        <BaseButton @click="activeTab = 'list'">查看词库</BaseButton>
      </div>
    </section>

    <!-- Word Detail Modal -->
    <BaseModal v-model="showDetail" :title="selectedWord?.word || ''" size="md">
      <div v-if="selectedWord" class="word-detail">
        <div class="detail-header">
          <div class="detail-word">
            <div class="detail-word-title">
              <h2>{{ selectedWord.word }}</h2>
              <PronunciationBtn :text="selectedWord.word" size="md" />
            </div>
            <p class="detail-phonetic">{{ selectedWord.phonetic }}</p>
            <p class="detail-pos">{{ selectedWord.partOfSpeech }}</p>
          </div>
          <div class="detail-mastery">
            <div class="mastery-circle" :class="getMasteryClass(selectedWord.masteryLevel)">
              {{ selectedWord.masteryLevel }}%
            </div>
            <span class="mastery-label">掌握度</span>
          </div>
        </div>

        <div class="detail-definitions">
          <div class="definition-item">
            <h4>中文释义</h4>
            <p>{{ selectedWord.chineseDefinition }}</p>
          </div>
          <div class="definition-item">
            <h4>英文释义</h4>
            <p>{{ selectedWord.definition }}</p>
          </div>
        </div>

        <div v-if="selectedWord.examples.length > 0" class="detail-examples">
          <h4>例句</h4>
          <div v-for="example in selectedWord.examples" :key="example.id" class="example-item">
            <p class="example-en">"{{ example.english }}"</p>
            <p class="example-zh">{{ example.chinese }}</p>
            <span class="example-source">{{ example.source }}</span>
          </div>
        </div>

        <div v-if="selectedWord.wordFamily.length > 0" class="detail-family">
          <h4>词族</h4>
          <div class="family-list">
            <div v-for="family in selectedWord.wordFamily" :key="family.word" class="family-item">
              <span class="family-word">{{ family.word }}</span>
              <span class="family-pos">{{ family.partOfSpeech }}</span>
              <span class="family-def">{{ family.definition }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedWord.etymology" class="detail-etymology">
          <h4>词源</h4>
          <WordEtymology
            :word="selectedWord.word"
            :parts="parseEtymology(selectedWord.etymology)"
          />
        </div>

        <div class="detail-reviews">
          <h4>复习曲线</h4>
          <ForgettingCurve :reviews="selectedWord.reviewHistory || []" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showDetail = false">关闭</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PageHeader, BaseTabs, BaseInput, BaseButton, BaseTable, BaseProgress, BaseModal, FlashCard, Skeleton, EmptyState, PronunciationBtn, WordEtymology, ForgettingCurve } from '../components'
import { useVocabularyStore } from '../stores/vocabulary'
import { useToast } from '../composables/useToast'
import type { Vocabulary } from '../types'

const vocab = useVocabularyStore()
const toast = useToast()

const activeTab = ref('list')
const currentIndex = ref(0)
const showDetail = ref(false)
const selectedWord = ref<Vocabulary | null>(null)
const flashCardRef = ref()

const tabs = [
  { value: 'list', label: '词库' },
  { value: 'flashcard', label: '词卡复习' }
]

const tableColumns = [
  { key: 'word', label: '单词', width: '200px' },
  { key: 'definition', label: '释义' },
  { key: 'masteryLevel', label: '掌握度', width: '120px' },
  { key: 'actions', label: '', width: '80px' }
]

const filteredWords = computed(() => {
  if (!vocab.searchQuery) return vocab.words
  const query = vocab.searchQuery.toLowerCase()
  return vocab.words.filter(w =>
    w.word.toLowerCase().includes(query) ||
    w.chineseDefinition.includes(vocab.searchQuery)
  )
})

const currentCard = computed(() => {
  if (vocab.reviewList.length === 0) return null
  return vocab.reviewList[currentIndex.value]
})

onMounted(() => {
  vocab.fetchList()
  vocab.fetchReviewList()
})

function getMasteryClass(level: number): string {
  if (level >= 80) return 'mastery-high'
  if (level >= 50) return 'mastery-medium'
  return 'mastery-low'
}

function showWordDetail(row: Record<string, any>) {
  const word = vocab.words.find(w => w.id === row.id)
  if (word) {
    selectedWord.value = word
    showDetail.value = true
  }
}

function showWordDetailFromRow(row: Record<string, any>) {
  const word = vocab.words.find(w => w.id === row.id)
  if (word) {
    selectedWord.value = word
    showDetail.value = true
  }
}

function startReview() {
  if (vocab.reviewList.length > 0) {
    activeTab.value = 'flashcard'
    currentIndex.value = 0
  }
}

function markAsHard() {
  // TODO: Update mastery level
  toast.info('继续加油')
  nextCard()
}

function markAsGood() {
  // TODO: Update mastery level
  toast.success('已掌握')
  nextCard()
}

function markAsEasy() {
  // TODO: Update mastery level
  toast.success('已掌握')
  nextCard()
}

function nextCard() {
  if (currentIndex.value < vocab.reviewList.length - 1) {
    currentIndex.value++
    flashCardRef.value?.reset()
  } else {
    currentIndex.value = 0
  }
}

function parseEtymology(etymology: string): { text: string; type: 'prefix' | 'root' | 'suffix'; meaning: string }[] {
  // Simple parsing: split by common separators and try to extract parts
  // For mock purposes, create basic parts from the etymology string
  if (!etymology) return []
  const words = etymology.split(/[\s,;]+/).filter(Boolean)
  if (words.length === 0) return [{ text: etymology, type: 'root', meaning: etymology }]
  
  return words.map((word, i) => ({
    text: word,
    type: (i === 0 ? 'prefix' : i === words.length - 1 ? 'suffix' : 'root') as 'prefix' | 'root' | 'suffix',
    meaning: word
  }))
}
</script>

<style scoped>
.vocabulary-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* Search & Filter */
.word-list-section {
  margin-top: var(--space-4);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.word-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.word-text {
  font-weight: 600;
  color: var(--color-text);
}

.word-phonetic {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.word-definition {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.mastery-bar {
  width: 80px;
  height: 6px;
  background: var(--color-surface-muted);
  border-radius: 3px;
  overflow: hidden;
}

.mastery-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.mastery-high { background: var(--color-success-600); }
.mastery-medium { background: var(--color-warning-600); }
.mastery-low { background: var(--color-danger-600); }

/* Flashcard Section */
.flashcard-section {
  margin-top: var(--space-4);
}

.flashcard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.flashcard-controls {
  display: flex;
  gap: var(--space-3);
}

.flashcard-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  max-width: 400px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
  text-align: center;
}

.empty-state p {
  font-size: 1rem;
  color: var(--color-text-muted);
}

/* Word Detail */
.word-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.detail-word-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.detail-word h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.detail-phonetic {
  font-size: 1rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.detail-pos {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.detail-mastery {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.mastery-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
}

.mastery-circle.mastery-high {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.mastery-circle.mastery-medium {
  background: var(--color-warning-100);
  color: var(--color-warning-600);
}

.mastery-circle.mastery-low {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.mastery-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.detail-definitions,
.detail-examples,
.detail-family,
.detail-etymology,
.detail-reviews {
  margin-bottom: var(--space-4);
}

.detail-definitions h4,
.detail-examples h4,
.detail-family h4,
.detail-etymology h4,
.detail-reviews h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.definition-item {
  margin-bottom: var(--space-2);
}

.definition-item p {
  font-size: 0.9375rem;
  color: var(--color-text);
}

.example-item {
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.example-item .example-en {
  font-size: 0.9375rem;
  color: var(--color-text);
  font-style: italic;
  margin-bottom: var(--space-1);
}

.example-item .example-zh {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.example-source {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.family-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.family-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
}

.family-word {
  font-weight: 600;
  color: var(--color-text);
}

.family-pos {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.family-def {
  color: var(--color-text-muted);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .vocab-container { padding: var(--space-3); }
  .vocab-grid { grid-template-columns: 1fr !important; gap: var(--space-3) !important; }
  .vocab-sidebar { width: 100% !important; max-height: 200px; overflow-y: auto; }
}
</style>
