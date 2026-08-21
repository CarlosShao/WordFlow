<template>
  <div class="exam-practice-page">
    <div class="topbar">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <h2 class="title">{{ data?.content.title }}</h2>
      <span class="progress">{{ answered }}/{{ questions.length }}</span>
    </div>

    <section v-if="loading" class="loading">加载中...</section>

    <template v-else-if="data">
      <!-- Audio player -->
      <div v-if="data.content.audioUrl" class="audio-box">
        <audio :src="data.content.audioUrl" controls class="audio-player"></audio>
      </div>

      <!-- 粘性文章区域 -->
      <div
        v-if="data.content.content"
        ref="articleWrapperRef"
        class="article-wrapper"
        :class="{
          'is-sticky': articleSticky,
          'is-collapsed': articleCollapsed,
        }"
        :style="wrapperStyle"
      >
        <article
          ref="articleRef"
          class="passage-article"
          :class="{ 'article-collapsed': articleCollapsed }"
        >
          <p
            v-for="(para, pi) in paragraphs"
            :key="pi"
            class="passage-paragraph"
          >{{ para }}</p>
        </article>
      </div>
      <!-- 占位符：文章 sticky 时保持文档流高度 -->
      <div
        v-if="articleSticky && articleSpacerHeight > 0"
        class="article-spacer"
        :style="{ height: articleSpacerHeight + 'px' }"
      ></div>

      <!-- 题目列表 -->
      <div class="question-list" ref="questionListRef">
        <div
          v-for="(q, qi) in questions"
          :key="q.id"
          class="question-card"
          :class="{ correct: answeredMap[q.id] === true, wrong: answeredMap[q.id] === false }"
        >
          <div class="q-head">
            <span class="q-no">{{ q.order ?? qi + 1 }}</span>
            <span class="q-type">{{ qTypeLabel(q) }}</span>
          </div>

          <!-- 选择题型 -->
          <template v-if="isChoice(q)">
            <div class="q-stem">{{ q.stem }}</div>
            <div class="q-options">
              <button
                v-for="(opt, oi) in q.options"
                :key="oi"
                class="option-btn"
                :class="{
                  selected: selections[q.id]?.includes(letter(oi)),
                  reveal_correct: revealed && q.answer.includes(letter(oi)),
                  reveal_wrong: revealed && selections[q.id]?.includes(letter(oi)) && !q.answer.includes(letter(oi)),
                }"
                @click="select(q, letter(oi))"
              >
                <span class="opt-letter">{{ letter(oi) }}</span>
                <span class="opt-text">{{ stripOptionPrefix(opt) }}</span>
              </button>
            </div>
          </template>

          <!-- 填空题型 -->
          <template v-if="isCompletion(q)">
            <div class="q-stem">{{ q.stem }}</div>
            <div class="q-completion">
              <input
                v-model="selections[q.id]"
                class="completion-input"
                type="text"
                placeholder="输入你的答案"
                :disabled="revealed"
                @input="onInput(q)"
              />
            </div>
          </template>

          <!-- 判断题型 -->
          <template v-if="isJudge(q)">
            <div class="q-stem">{{ q.stem }}</div>
            <div class="q-options">
              <button
                v-for="opt in ['TRUE', 'FALSE', 'NOT GIVEN']"
                :key="opt"
                class="option-btn judge-btn"
                :class="{
                  selected: selections[q.id] === opt,
                  reveal_correct: revealed && q.answer.includes(opt),
                  reveal_wrong: revealed && selections[q.id] === opt && !q.answer.includes(opt),
                }"
                @click="selectJudge(q, opt)"
              >
                <span class="opt-letter">{{ opt[0] }}</span>
                <span class="opt-text">{{ opt }}</span>
              </button>
            </div>
          </template>

          <!-- 口语/写作题型（简答/参考答案型） -->
          <template v-if="isShortAnswer(q)">
            <div class="q-stem">{{ q.stem }}</div>
            <div class="q-writing-area">
              <textarea
                v-model="selections[q.id]"
                class="writing-input"
                placeholder="在此输入你的回答..."
                :disabled="revealed"
                rows="6"
              ></textarea>
            </div>
          </template>

          <div v-if="revealed && q.explanation" class="q-explanation">
            <div class="q-explanation-title">📖 解析</div>
            <div class="q-explanation-body">{{ q.explanation }}</div>
          </div>
          
          <div v-if="revealed && isShortAnswer(q)" class="q-sample-answer">
            <div class="q-explanation-title">📝 参考答案</div>
            <div class="q-explanation-body">{{ q.answer.join('\n\n') }}</div>
          </div>
          <div v-else-if="revealed" class="q-answer" :class="{ ok: isCorrect(q) }">
            {{ isCorrect(q) ? '✓ 回答正确' : `✗ 正确答案: ${q.answer.join(' / ')}` }}
          </div>
        </div>
      </div>

      <div class="action-bar">
        <button class="submit-btn" @click="reveal">{{ revealed ? '已提交' : '提交答案' }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { examApi, type ExamQuestion } from '../api/exam'

const route = useRoute()
const data = ref<{ content: { title: string; audioUrl: string | null; content: string | null }; questions: ExamQuestion[] } | null>(null)
const loading = ref(true)
const selections = ref<Record<string, string[]>>({})
const answeredMap = ref<Record<string, boolean>>({})
const revealed = ref(false)

// refs for sticky logic
const articleRef = ref<HTMLElement | null>(null)
const articleWrapperRef = ref<HTMLElement | null>(null)
const questionListRef = ref<HTMLElement | null>(null)

// sticky state
const articleSticky = ref(false)
const articleCollapsed = ref(false)
const articleSpacerHeight = ref(0)

// 用于计算 fixed 定位的原始位置信息
let wrapperRect: DOMRect | null = null
let stickyLeft = 0
let stickyWidth = 0

// wrapper 的 inline style（用于 fixed 定位）
const wrapperStyle = computed(() => {
  if (!articleSticky.value) return {}
  return {
    position: 'fixed',
    top: TOPBAR_HEIGHT + 'px',
    left: stickyLeft + 'px',
    width: stickyWidth + 'px',
    zIndex: 'var(--z-sticky-under)',
  }
})

const questions = computed(() => data.value?.questions ?? [])
const paragraphs = computed(() => {
  const content = data.value?.content?.content ?? ''
  if (!content) return []
  if (content.includes('\n\n')) {
    return content.split(/\n+/).filter(p => p.trim().length > 0)
  }
  return [content]
})
const answered = computed(() => {
  let n = 0
  for (const q of questions.value) {
    if (isCompletion(q)) {
      const v = String(selections.value[q.id] ?? '').trim()
      if (v) n++
    } else if (selections.value[q.id] !== undefined && selections.value[q.id] !== null && selections.value[q.id] !== '') {
      n++
    }
  }
  return n
})

function letter(i: number) {
  return String.fromCharCode(65 + i)
}

function stripOptionPrefix(opt: string): string {
  // 先去掉 "A. A) " 或 "A. A) " 这样的双重前缀
  let s = opt.replace(/^[A-F][\.．、\s]+[A-F][\)）\.．、\s]+/, '').trim()
  // 如果没匹配到双重前缀，去单重前缀
  if (s === opt) {
    s = opt.replace(/^[A-F][\)）\.．、\s]+/, '').trim()
  }
  return s
}

function isCompletion(q: ExamQuestion) {
  return q.type === 'COMPLETION'
}

function isJudge(q: ExamQuestion) {
  return q.type === 'TRUE_FALSE_NOT_GIVEN' || q.type === 'YNNG'
}

function isChoice(q: ExamQuestion) {
  return q.options && q.options.length > 0 && !isJudge(q) && !isShortAnswer(q)
}

function isShortAnswer(q: ExamQuestion) {
  return q.type === 'SHORT_ANSWER'
}

function qTypeLabel(q: ExamQuestion) {
  if (q.type === 'COMPLETION') return '填空'
  if (q.type === 'TRUE_FALSE_NOT_GIVEN' || q.type === 'YNNG') return '判断'
  if (q.type === 'MATCHING') return '配对'
  if (q.type === 'SHORT_ANSWER') return '口语/写作'
  if (q.type === 'MCQ_MULTI') return '多选'
  if (q.answer && q.answer.length > 1) return '多选'
  return '单选'
}

function select(q: ExamQuestion, opt: string) {
  if (revealed.value) return
  const multi = qTypeLabel(q) === '多选' || q.type === 'MCQ_MULTI'
  const cur = selections.value[q.id] ?? []
  if (multi) {
    selections.value[q.id] = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]
  } else {
    selections.value[q.id] = [opt]
  }
}

function selectJudge(q: ExamQuestion, opt: string) {
  if (revealed.value) return
  selections.value[q.id] = opt
}

function onInput(q: ExamQuestion) {
  if (selections.value[q.id] && selections.value[q.id].trim()) {
    // do nothing special
  }
}

function normalizeAnswer(v: string) {
  return v.trim().toLowerCase().replace(/[\s]+/g, ' ')
}

function isCorrect(q: ExamQuestion) {
  if (isShortAnswer(q)) {
    // 口语/写作题不判对错，只看是否写了解答
    const sel = String(selections.value[q.id] ?? '').trim()
    return sel.length > 20
  }
  const ans = (q.answer ?? []).slice().sort()
  if (isCompletion(q)) {
    const sel = normalizeAnswer(String(selections.value[q.id] ?? ''))
    if (!sel) return false
    return ans.some((a) => normalizeAnswer(a) === sel)
  }
  const sel = (Array.isArray(selections.value[q.id]) ? selections.value[q.id] : selections.value[q.id] ? [selections.value[q.id]] : []).slice().sort()
  return sel.length === ans.length && sel.every((v, i) => v === ans[i])
}

function reveal() {
  if (revealed.value) return
  revealed.value = true
  for (const q of questions.value) {
    answeredMap.value[q.id] = isCorrect(q)
  }
}

// ========== Sticky article logic (JS-driven position:fixed) ==========
let TOPBAR_HEIGHT = 64
let lastScrollY = 0
let scrollAccum = 0
let scrollDirection: 'up' | 'down' = 'down'
let scrollRafId: number | null = null
let scrollContainer: HTMLElement | null = null
// 文章在文档流中的原始位置（sticky 前保存）
let naturalTop = 0

function handleScroll() {
  if (!scrollContainer) return
  const currentScroll = scrollContainer.scrollTop
  const direction = currentScroll > lastScrollY ? 'down' : 'up'
  
  // 方向改变时重置累计距离
  if (direction !== scrollDirection) {
    scrollDirection = direction
    scrollAccum = 0
  }
  
  const delta = Math.abs(currentScroll - lastScrollY)
  scrollAccum += delta
  lastScrollY = currentScroll

  const wrapper = articleWrapperRef.value
  const article = articleRef.value
  if (!wrapper || !article) return

  const vh = window.innerHeight

  if (!articleSticky.value) {
    // === 非 sticky 状态：文章在文档流中 ===
    // 保存文章的原始位置（用于判断何时进入 sticky）
    if (naturalTop === 0) {
      const rect = wrapper.getBoundingClientRect()
      naturalTop = rect.top + currentScroll
    }

    // 当文章顶部到达 topbar 下方时，进入 sticky
    if (currentScroll + TOPBAR_HEIGHT >= naturalTop - 2) {
      // 保存 fixed 定位需要的信息
      const rect = wrapper.getBoundingClientRect()
      stickyLeft = rect.left
      stickyWidth = rect.width
      articleSpacerHeight.value = rect.height

      articleSticky.value = true
      scrollAccum = 0
    }
  } else {
    // === Sticky 状态：文章使用 position:fixed ===
    // 更新 spacer 高度（文章可能因 collapse 而改变高度）
    const rect = article.getBoundingClientRect()
    const currentHeight = articleCollapsed.value ? rect.height : rect.height
    // spacer 在文章高度变化后更新
    articleSpacerHeight.value = currentHeight

    // 判断是否应该退出 sticky
    // 当 scrollTop 回到 naturalTop 以下时退出
    if (currentScroll + TOPBAR_HEIGHT < naturalTop - 2) {
      articleSticky.value = false
      articleCollapsed.value = false
      articleSpacerHeight.value = 0
      naturalTop = 0
      scrollAccum = 0
      return
    }

    // Sticky 状态下的 collapse/expand 逻辑
    const articleHeight = rect.height
    if (direction === 'down' && !articleCollapsed.value && scrollAccum > 50 && articleHeight > vh * 0.6) {
      articleCollapsed.value = true
      scrollAccum = 0
      // 高度改变后更新 spacer
      requestAnimationFrame(() => {
        if (articleRef.value) {
          articleSpacerHeight.value = articleRef.value.getBoundingClientRect().height
        }
      })
    } else if (direction === 'up' && articleCollapsed.value && scrollAccum > 30) {
      articleCollapsed.value = false
      scrollAccum = 0
      requestAnimationFrame(() => {
        if (articleRef.value) {
          articleSpacerHeight.value = articleRef.value.getBoundingClientRect().height
        }
      })
    }
  }
}

function onScroll() {
  if (scrollRafId !== null) return
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = null
    handleScroll()
  })
}

onMounted(async () => {
  // 找到实际的滚动容器
  scrollContainer = document.querySelector('.main-content')
  
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', onScroll, { passive: true })
  } else {
    // fallback
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  // 动态获取顶栏高度
  const topbarEl = document.querySelector('.topbar') as HTMLElement | null
  if (topbarEl) {
    TOPBAR_HEIGHT = topbarEl.offsetHeight
  }

  try {
    data.value = await examApi.getQuestions(route.params.id as string)
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }

  // 初始化后检查一次
  await nextTick()
  handleScroll()

  // 窗口 resize 时重新计算 fixed 定位
  window.addEventListener('resize', onResize)
})

function onResize() {
  // 更新顶栏高度
  const topbarEl = document.querySelector('.topbar') as HTMLElement | null
  if (topbarEl) {
    TOPBAR_HEIGHT = topbarEl.offsetHeight
  }
  // 如果当前处于 sticky 状态，重新计算 fixed 定位参数
  if (articleSticky.value && articleWrapperRef.value) {
    const rect = articleWrapperRef.value.getBoundingClientRect()
    stickyLeft = rect.left
    stickyWidth = rect.width
    articleSpacerHeight.value = articleWrapperRef.value.offsetHeight
  }
}

onUnmounted(() => {
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', onScroll)
  } else {
    window.removeEventListener('scroll', onScroll)
  }
  window.removeEventListener('resize', onResize)
  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId)
    scrollRafId = null
  }
})
</script>

<style scoped>
.exam-practice-page {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 80px;
  /* 给 sticky 提供定位上下文 */
  position: relative;
}

/* ========== 顶栏 ========== */
.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  position: sticky;
  top: 0;
  background: var(--bg, var(--color-surface-subtle));
  z-index: var(--z-sticky);
  border-bottom: 1px solid var(--color-border);
}
.back-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--primary, var(--color-info-500));
  padding: 6px 10px;
}
.title {
  flex: 1;
  font-size: 17px;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.progress {
  font-size: 13px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  padding: 4px 12px;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.audio-box {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 20px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.audio-player {
  width: 100%;
}

/* ========== 文章容器（sticky/fixed） ========== */
.article-wrapper {
  z-index: var(--z-sticky-under);
  background: var(--bg, var(--color-surface-subtle));
  transition: box-shadow 0.3s ease;
}
.article-wrapper.is-sticky {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
}

/* spacer：文章 fixed 时保持文档流 */
.article-spacer {
  background: transparent;
  pointer-events: none;
}

/* 文章卡片 */
.passage-article {
  background: var(--color-surface);
  margin: 0 20px;
  padding: 32px 36px;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 17px;
  line-height: 1.85;
  color: var(--color-text);
  /* 过渡动画 */
  transition:
    max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    font-size 0.3s ease;
  max-height: 2000px; /* 用大值替代 none 以支持过渡动画 */
  overflow: hidden;
}

/* 缩高状态 */
.passage-article.article-collapsed {
  max-height: 52vh;
  overflow-y: auto;
  padding: 20px 28px;
  font-size: 15px;
  line-height: 1.65;
}

/* sticky 状态下加强阴影 */
.article-wrapper.is-sticky .passage-article {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.passage-paragraph {
  margin: 0 0 1.1em 0;
  text-align: justify;
  text-justify: inter-word;
  hyphens: auto;
}
.passage-paragraph:last-child {
  margin-bottom: 0;
}

/* ========== 题目区域 ========== */
.question-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0 20px;
  padding-top: 8px;
}
.question-card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid transparent;
}
.question-card.correct { border-left-color: var(--color-success-500); }
.question-card.wrong { border-left-color: var(--color-danger-500); }
.q-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.q-no {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-info-500);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}
.q-type {
  font-size: 12px;
  color: var(--color-text-600);
  background: var(--color-info-50);
  padding: 2px 10px;
  border-radius: 10px;
}
.q-stem {
  font-size: 15px;
  line-height: 1.65;
  margin-bottom: 14px;
  color: var(--color-text-700);
}
.q-completion {
  margin-bottom: 12px;
}
.completion-input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: 10px;
  font-size: 15px;
  background: var(--color-surface);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.completion-input:focus { border-color: var(--color-info-500); background: var(--color-surface); }
.completion-input:disabled { background: var(--color-surface-subtle); color: var(--color-text-600); }

/* 口语/写作 textarea */
.q-writing-area {
  margin-bottom: 12px;
}
.writing-input {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.6;
  background: var(--color-surface);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
  resize: vertical;
  font-family: var(--font-sans);
}
.writing-input:focus { border-color: var(--color-info-500); background: var(--color-surface); }
.writing-input:disabled { background: var(--color-surface-subtle); color: var(--color-text-600); }

/* 参考答案区 */
.q-sample-answer {
  margin-top: 14px;
  padding: 14px 16px;
  background: var(--color-success-50);
  border-radius: 10px;
  border-left: 3px solid var(--color-success-500);
}

.judge-btn .opt-letter {
  font-size: 10px;
}
.q-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.option-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  line-height: 1.55;
  transition: all 0.15s;
  color: var(--color-text-700);
}
.option-btn:hover { border-color: var(--color-info-500); background: var(--color-info-50); }
.option-btn.selected { border-color: var(--color-info-500); background: var(--color-info-50); }
.option-btn.reveal_correct { border-color: var(--color-success-500); background: var(--color-success-50); }
.option-btn.reveal_wrong { border-color: var(--color-danger-500); background: #ffeaea; }
.opt-letter {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--color-text-300);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  background: var(--color-surface);
  transition: all 0.15s;
}
.option-btn.selected .opt-letter { background: var(--color-info-500); color: #fff; border-color: var(--color-info-500); }
.option-btn.reveal_correct .opt-letter { background: var(--color-success-500); color: #fff; border-color: var(--color-success-500); }
.option-btn.reveal_wrong .opt-letter { background: var(--color-danger-500); color: #fff; border-color: var(--color-danger-500); }
.opt-text { flex: 1; }
.q-answer {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
}
.q-answer.ok { color: var(--color-success-500); }
.q-answer:not(.ok) { color: var(--color-danger-500); }

/* 解析区 */
.q-explanation {
  margin-top: 14px;
  padding: 14px 16px;
  background: var(--color-info-50);
  border-radius: 10px;
  border-left: 3px solid var(--color-info-500);
}
.q-explanation-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-info-500);
  margin-bottom: 6px;
}
.q-explanation-body {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-700);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ========== 底部操作栏 ========== */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px 20px;
  background: var(--color-surface);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: center;
  z-index: var(--z-sticky);
}
.submit-btn {
  padding: 10px 48px;
  border-radius: 22px;
  border: none;
  background: var(--color-info-500);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  font-weight: 500;
}
.submit-btn:disabled { background: var(--color-info-200); cursor: default; }

/* 加载态 */
.loading {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  font-size: 15px;
}

/* 响应式 */
@media (max-width: 768px) {
  .exam-practice-page { max-width: 100%; }
  .passage-article { margin: 0 12px; padding: 20px 18px; font-size: 15px; line-height: 1.75; }
  .passage-article.article-collapsed { padding: 16px 18px; font-size: 14px; }
  .question-list { margin: 0 12px; }
  .audio-box { margin: 12px; }
  .topbar { padding: 12px 16px; }
}
</style>
/* ── Responsive ── */
@media (max-width: 768px) {
  .pe-listen .transport-bar { flex-wrap: wrap; gap: var(--space-2); }
  .pe-listen .rate-select { width: 80px; }
  .question-card { padding: var(--space-3) !important; margin: 0 var(--space-2) var(--space-3) !important; }
  .completion-input { max-width: 100% !important; }
  .writing-input { min-height: 80px !important; }
}
