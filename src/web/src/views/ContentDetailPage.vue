<template>
  <div class="detail-page">
    <!-- Header -->
    <header class="detail-header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div class="header-info" v-if="contentDetail">
        <h1 class="header-title">{{ contentDetail.title }}</h1>

        <div class="header-meta">
          <span :class="['type-badge', `badge-${normalizedType}`]">
            {{ getTypeLabel(normalizedType) }}
          </span>
          <span :class="['difficulty-badge', `diff-${contentDetail.difficulty}`]">
            {{ getDifficultyLabel(contentDetail.difficulty) }}
          </span>
          <span v-if="contentDetail.source" class="source-badge">{{ contentDetail.source }}</span>
          <a
            v-if="contentDetail.sourceUrl"
            :href="contentDetail.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
            title="查看原文"
          >
            查看原文
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      <!-- AI practice entry — prominent action in the header so it does not
           get buried at the bottom of a long transcript/article. -->
      <button
        class="ai-practice-btn"
        @click="openPracticeDrawer"
        title="AI 生成练习题"
      >
        <svg class="sparkle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
        </svg>
        <span>AI 练习题</span>
      </button>

      <div v-if="loading && !contentDetail" class="skeleton-header">
        <Skeleton variant="text" style="width: 60%; height: 28px;" />
        <Skeleton variant="text" style="width: 30%; height: 16px; margin-top: 8px;" />
      </div>
    </header>

    <!-- AI practice drawer — overlays from the right so many generated
         questions never push the transcript/article content down the page. -->
    <Transition name="drawer">
      <div v-if="showPracticeDrawer" class="drawer-overlay" @click.self="closePracticeDrawer">
        <aside class="practice-drawer">
          <div class="drawer-header">
            <div class="drawer-title">
              <svg class="sparkle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              <span>AI 练习题</span>
            </div>
            <button class="drawer-close" title="关闭" @click="closePracticeDrawer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="drawer-body">
            <AIQuestionGenerator
              :content-id="route.params.id as string"
              :auto-generate="true"
              @questions-generated="onQuestionsGenerated"
            />
          </div>
        </aside>
      </div>
    </Transition>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="fetchContent">重试</button>
    </div>

    <!-- Initial loading overlay: shown while the detail payload is still
         arriving. Surfaces a plain-language hint (e.g. which step is slow) so
         a multi-second Bilibili stream resolution reads as "working", not
         "hung / crashed". -->
    <div v-if="loading && !contentDetail" class="detail-loading">
      <div class="spinner"></div>
      <p class="detail-loading-text">{{ loadingHint || '正在加载内容…' }}</p>
      <p class="detail-loading-sub">视频内容较大时加载会稍慢，请稍候</p>
    </div>

    <!-- Main Content -->
    <main v-if="contentDetail" class="detail-main">
      <!-- Video Player (for VIDEO type) -->
      <section v-if="normalizedType === 'video' && fixedVideoUrl" class="media-section video-section">
        <div class="video-wrapper">
          <!-- Bilibili native video via direct CDN URL -->
          <div v-if="isBiliVideo && isBiliStreamLoading" class="video-loading">
            <div class="spinner"></div>
            <span>视频较大，正在解析播放地址，请稍候…</span>
            <span class="loading-sub">B站视频需要先向服务器请求播放链接，这一步通常需要几秒钟</span>
          </div>
          <div v-else-if="isBiliVideo && biliStreamError" class="video-error">
            <p>{{ biliStreamError }}</p>
            <button @click="fetchBilibiliStream">重试</button>
            <a :href="fixedVideoUrl" target="_blank" rel="noopener noreferrer" class="fallback-link">在B站观看 →</a>
          </div>
          <video
            v-else-if="isBiliVideo && biliStreamUrl"
            ref="videoRef"
            controls
            :src="proxiedBiliStreamUrl"
            class="video-native"
            preload="metadata"
            @timeupdate="onMediaTimeUpdate"
            @loadedmetadata="onVideoMetadataLoaded"
            @play="onVideoPlay"
            @pause="onVideoPause"
            @error="onVideoError"
          ></video>

          <!-- Generic iframe embed (YouTube, TED, etc.) -->
          <iframe
            v-else-if="isEmbedUrl(fixedVideoUrl)"
            :src="getEmbedUrlWithCaptions(fixedVideoUrl)"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="video-embed"
          ></iframe>

          <!-- Native video (non-Bilibili direct URLs) -->
          <video
            v-else
            ref="videoRef"
            controls
            :src="fixedVideoUrl"
            class="video-native"
            preload="metadata"
            @timeupdate="onMediaTimeUpdate"
          ></video>
        </div>

        <!-- Quick transport controls: skip back / forward and playback rate.
             Useful when the browser's native controls are small or the focus
             is on the transcript (click a line, keep the position). -->
        <div v-if="videoRef" class="video-transport">
          <button class="transport-btn" title="快退 10 秒" @click="skipBy(-10)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            <span>10</span>
          </button>
          <span class="transport-time">{{ formatTime(videoRef.currentTime) }} / {{ formatTime(videoRef.duration || 0) }}</span>
          <button class="transport-btn" title="快进 10 秒" @click="skipBy(10)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            </svg>
            <span>10</span>
          </button>
          <select v-model="playbackRate" class="rate-select" title="播放速度" @change="applyPlaybackRate">
            <option :value="0.5">0.5x</option>
            <option :value="0.75">0.75x</option>
            <option :value="1">1x</option>
            <option :value="1.25">1.25x</option>
            <option :value="1.5">1.5x</option>
            <option :value="2">2x</option>
          </select>
          <span class="transport-divider"></span>
          <button
            class="transport-btn ab-btn"
            :class="{ active: abLoop.enabled }"
            :disabled="!canSetAB"
            @click="abLoop.enabled ? disableABLoop() : setABPoint('A')"
            :title="abLoop.enabled ? '关闭 A-B 循环' : '设置 A 点后选择 B 点，实现区间复读'"
          >
            <span>A-B</span>
            <span v-if="abLoop.enabled" class="ab-state">ON</span>
          </button>
        </div>
        <!-- Full bilingual transcript synced with video playback -->
        <div v-if="hasTranscriptSegments" class="transcript-panel">
          <div class="transcript-header">
            <div class="tab-bar">
              <button
                :class="['tab-btn', { active: activeContentTab === 'transcript' || !hasArticleContent }]"
                @click="activeContentTab = 'transcript'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M6 8h4M6 12h8M6 16h12" />
                </svg>
                字幕
                <span v-if="activeSegmentIndex >= 0" class="tab-progress">
                  {{ activeSegmentIndex + 1 }} / {{ transcriptSegments.length }}
                </span>
              </button>
              <button
                v-if="hasArticleContent"
                :class="['tab-btn', { active: activeContentTab === 'article' }]"
                @click="activeContentTab = 'article'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 6h16M4 12h16M4 18h12" />
                </svg>
                双语全文
              </button>
            </div>
            <div class="transcript-header-controls">
              <button 
                class="transcript-settings-btn" 
                @click="showTranscriptSettings = !showTranscriptSettings"
                :title="'字幕设置'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Transcript Settings Panel -->
          <div v-if="showTranscriptSettings" class="transcript-settings-panel">
            <div class="setting-row">
              <label>字体大小</label>
              <input 
                type="range" 
                v-model.number="transcriptSettings.fontSize" 
                min="12" 
                max="24" 
                step="1"
              />
              <span class="setting-value">{{ transcriptSettings.fontSize }}px</span>
            </div>
            <div class="setting-row">
              <label>背景透明度</label>
              <input 
                type="range" 
                v-model.number="transcriptSettings.bgOpacity" 
                min="0" 
                max="0.3" 
                step="0.02"
              />
              <span class="setting-value">{{ Math.round(transcriptSettings.bgOpacity * 100) }}%</span>
            </div>
            <div class="setting-row">
              <label>显示时间戳</label>
              <input type="checkbox" v-model="transcriptSettings.showTimestamps" />
            </div>
            <div class="setting-row">
              <label>自动滚动</label>
              <input type="checkbox" v-model="transcriptSettings.autoScroll" />
            </div>
          </div>
          
          <div v-show="activeContentTab === 'transcript' || !hasArticleContent" class="transcript-body" ref="transcriptBodyRef" :style="{ fontSize: transcriptSettings.fontSize + 'px' }" @mouseup="onTranscriptMouseUp">
            <div v-if="transcriptSegments.length === 0 && !loading" class="transcript-empty">
              <template v-if="segmentsLoading">
                <div class="spinner spinner-sm"></div>
                <span>视频字幕较多，正在加载字幕数据…</span>
              </template>
              <template v-else>字幕加载中…</template>
            </div>
            <div
              v-for="(seg, idx) in transcriptSegments"
              :key="idx"
              :class="['transcript-block', { active: idx === activeSegmentIndex, clickable: canSeek }]"
              @click="seekToSegment(seg, idx)"
            >
              <div v-if="(seg.start !== undefined || seg.end !== undefined) && transcriptSettings.showTimestamps" class="transcript-block-header">
                <span v-if="seg.start !== undefined" class="transcript-time">{{ formatTime(seg.start) }}</span>
                <span v-if="seg.end !== undefined && seg.start !== undefined" class="transcript-time duration-hint">
                  {{ formatTime(seg.end - seg.start) }}
                </span>
              </div>
              <div class="transcript-en">{{ seg.en }}</div>
              <div :class="['transcript-zh', { 'no-translate': !seg.zh }]" :style="{ backgroundColor: `rgba(143, 155, 179, ${transcriptSettings.bgOpacity})` }">
                {{ seg.zh || '（暂无对应翻译）' }}
              </div>
            </div>
          </div>

          <!-- Article tab body (placed in the same panel so toggling the
               tab switches content without re-scrolling). Renders aligned
               en/zh sentence pairs via the shared BilingualArticlePanel. -->
          <div v-show="activeContentTab === 'article' && hasArticleContent" class="article-panel">
            <div class="article-body">
              <BilingualArticlePanel
                :paragraphs="bilingualParagraphs"
                :active-para-idx="activeParaIdx"
                :active-sentence-idx="activeSentenceIdx"
                @sentence-enter="onSentenceEnter"
                @sentence-leave="onSentenceLeave"
                @add-vocabulary="handleAddVocabulary"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Audio Player (for PODCAST type) — the section renders even without
           a usable audio URL so the transcript/bilingual panels below stay
           reachable; the player itself is replaced by a hint when the URL is
           missing or is not actually audio (a crawler bug stored cover-image
           URLs in audioUrl for some feeds). -->
      <section v-if="normalizedType === 'podcast'" class="media-section audio-section">
        <div v-if="usableAudioUrl" class="audio-player">
          <audio controls :src="usableAudioUrl" preload="metadata" ref="audioRef" @timeupdate="onMediaTimeUpdate">
            您的浏览器不支持音频播放
          </audio>
        </div>
        <div v-else class="audio-unavailable">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5 6 9H2v6h4l5 4V5z"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
          <span>该播客暂无可用的音频，仅显示文字内容</span>
        </div>
        <!-- Full bilingual transcript synced with audio playback -->
        <div v-if="hasTranscriptSegments" class="transcript-panel">
          <div class="transcript-header">
            <div class="tab-bar">
              <button
                :class="['tab-btn', { active: activeContentTab === 'transcript' || !hasArticleContent }]"
                @click="activeContentTab = 'transcript'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M6 8h4M6 12h8M6 16h12" />
                </svg>
                字幕
                <span v-if="activeSegmentIndex >= 0" class="tab-progress">
                  {{ activeSegmentIndex + 1 }} / {{ transcriptSegments.length }}
                </span>
              </button>
              <button
                v-if="hasArticleContent"
                :class="['tab-btn', { active: activeContentTab === 'article' }]"
                @click="activeContentTab = 'article'"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 6h16M4 12h16M4 18h12" />
                </svg>
                双语全文
              </button>
            </div>
            <div class="transcript-header-controls">
              <button 
                class="transcript-settings-btn" 
                @click="showTranscriptSettings = !showTranscriptSettings"
                :title="'字幕设置'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Transcript Settings Panel -->
          <div v-if="showTranscriptSettings" class="transcript-settings-panel">
            <div class="setting-row">
              <label>字体大小</label>
              <input 
                type="range" 
                v-model.number="transcriptSettings.fontSize" 
                min="12" 
                max="24" 
                step="1"
              />
              <span class="setting-value">{{ transcriptSettings.fontSize }}px</span>
            </div>
            <div class="setting-row">
              <label>背景透明度</label>
              <input 
                type="range" 
                v-model.number="transcriptSettings.bgOpacity" 
                min="0" 
                max="0.3" 
                step="0.02"
              />
              <span class="setting-value">{{ Math.round(transcriptSettings.bgOpacity * 100) }}%</span>
            </div>
            <div class="setting-row">
              <label>显示时间戳</label>
              <input type="checkbox" v-model="transcriptSettings.showTimestamps" />
            </div>
            <div class="setting-row">
              <label>自动滚动</label>
              <input type="checkbox" v-model="transcriptSettings.autoScroll" />
            </div>
          </div>
          
          <div v-show="activeContentTab === 'transcript' || !hasArticleContent" class="transcript-body" ref="transcriptBodyRef" :style="{ fontSize: transcriptSettings.fontSize + 'px' }" @mouseup="onTranscriptMouseUp">
            <div v-if="transcriptSegments.length === 0 && !loading" class="transcript-empty">
              <template v-if="segmentsLoading">
                <div class="spinner spinner-sm"></div>
                <span>视频字幕较多，正在加载字幕数据…</span>
              </template>
              <template v-else>字幕加载中…</template>
            </div>
            <div
              v-for="(seg, idx) in transcriptSegments"
              :key="idx"
              :class="['transcript-block', { active: idx === activeSegmentIndex, clickable: canSeek }]"
              @click="seekToSegment(seg, idx)"
            >
              <div v-if="(seg.start !== undefined || seg.end !== undefined) && transcriptSettings.showTimestamps" class="transcript-block-header">
                <span v-if="seg.start !== undefined" class="transcript-time">{{ formatTime(seg.start) }}</span>
                <span v-if="seg.end !== undefined && seg.start !== undefined" class="transcript-time duration-hint">
                  {{ formatTime(seg.end - seg.start) }}
                </span>
              </div>
              <div class="transcript-en">{{ seg.en }}</div>
              <div :class="['transcript-zh', { 'no-translate': !seg.zh }]" :style="{ backgroundColor: `rgba(143, 155, 179, ${transcriptSettings.bgOpacity})` }">
                {{ seg.zh || '（暂无对应翻译）' }}
              </div>
            </div>
          </div>

          <!-- Article tab body (same bilingual reading panel as the video
               section above — the podcast tab bar's 双语全文 button previously
               had no matching body here, so clicking it showed nothing). -->
          <div v-show="activeContentTab === 'article' && hasArticleContent" class="article-panel">
            <div class="article-body">
              <BilingualArticlePanel
                :paragraphs="bilingualParagraphs"
                :active-para-idx="activeParaIdx"
                :active-sentence-idx="activeSentenceIdx"
                @sentence-enter="onSentenceEnter"
                @sentence-leave="onSentenceLeave"
                @add-vocabulary="handleAddVocabulary"
              />
            </div>
          </div>

        </div>
        <p v-if="!hasTranscriptSegments" class="audio-hint">以下是播客的文字记录（Show Notes），可能与音频内容不完全对应</p>
      </section>

      <!-- Standalone article reading section: shows the bilingual body when
           neither the video nor the podcast player panel is rendering it.
           Plain ARTICLE content (e.g. RSS news, TED-ED texts) previously had
           NO body section at all — only the summary rendered. -->
      <section v-if="showStandaloneArticle" class="media-section article-reading-section">
        <div class="article-panel article-panel-standalone">
          <div class="article-body">
            <BilingualArticlePanel
              :paragraphs="bilingualParagraphs"
              :active-para-idx="activeParaIdx"
              :active-sentence-idx="activeSentenceIdx"
              @sentence-enter="onSentenceEnter"
              @sentence-leave="onSentenceLeave"
              @add-vocabulary="handleAddVocabulary"
            />
          </div>
        </div>
      </section>

      <!-- Summary -->
      <section v-if="contentDetail.summary" class="summary-section">
        <h2>摘要</h2>
        <p>{{ contentDetail.summary }}</p>
      </section>

      <!-- Article / Transcript Content moved into the player's tab panel above,
           so it appears next to the video/transcript instead of far below. -->

      <!-- No Content Fallback -->
      <section v-if="!contentDetail?.content && !contentDetail?.summary && !hasTranscriptSegments && !hasArticleContent" class="no-content-section">
        <div class="no-content-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <p>该内容暂无正文文本</p>
        <a v-if="contentDetail?.sourceUrl" :href="contentDetail.sourceUrl" target="_blank" class="link-primary">
          访问原始来源 →
        </a>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Skeleton, AIQuestionGenerator } from '../components'
import { contentApi } from '../api/content'
import { mediaApi } from '../api/media'
import { vocabularyApi } from '../api/vocabulary'
import BilingualArticlePanel from '../components/BilingualArticlePanel.vue'
import { formatTime, getTypeLabel, getDifficultyLabel } from '../utils/format'
import {
  buildBilingualParagraphs,
} from '../utils/text'
import type { BilingualParagraph } from '../utils/text'
import {
  isEmbedUrl,
  getEmbedUrlWithCaptions,
  fixMediaUrl,
  extractTedSlug,
} from '../utils/media'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
// Human-readable description of what is currently being fetched, shown in the
// loading overlay so the user understands why the page is not ready yet
// (e.g. "视频较大，正在解析播放地址…"). Without this the long Bilibili stream
// resolution looks like a hang/crash.
const loadingHint = ref('')
// Use shallowRef to avoid deep-reactive overhead on large payloads (~950KB for
// Key & Peele / SNL videos with content + translation + segments).  Only the
// reference itself is tracked; nested properties stay raw, which is fine because
// we never mutate them in-place.
const contentDetail = shallowRef<any>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const activeTab = ref<'original' | 'translation' | 'bilingual'>('original')
const transcriptBodyRef = ref<HTMLElement | null>(null)
const activeSegmentIndex = ref(-1)

// ── Transcript display settings ──
const transcriptSettings = reactive({
  fontSize: 16,        // px
  bgOpacity: 0.08,     // 0-1
  showTimestamps: true,
  autoScroll: true,
})

const showTranscriptSettings = ref(false)

// ── Bilingual reading: sentence hover state ──
const activeParaIdx = ref(-1)
const activeSentenceIdx = ref(-1)

function onSentenceEnter(paraIdx: number, sentIdx: number): void {
  activeParaIdx.value = paraIdx
  activeSentenceIdx.value = sentIdx
}

function onSentenceLeave(): void {
  activeParaIdx.value = -1
  activeSentenceIdx.value = -1
}

// ── AI practice drawer ──
const showPracticeDrawer = ref(false)
const practiceQuestionCount = ref(0)

// ── Combined content panel tabs ──
// `transcript` = time-stamped transcript synced with playback (video/podcast)
// `article`    = full bilingual text content
const activeContentTab = ref<'transcript' | 'article'>('transcript')
const hasArticleContent = computed(() => {
  return !!contentDetail.value?.content || !!contentDetail.value?.summary
})

function openPracticeDrawer(): void {
  showPracticeDrawer.value = true
}

function closePracticeDrawer(): void {
  showPracticeDrawer.value = false
}

function onQuestionsGenerated(questions: unknown[]): void {
  practiceQuestionCount.value = questions.length
}

// ── Bilibili native video mode ──
const biliStreamUrl = ref('')
const isBiliStreamLoading = ref(false)
const biliStreamError = ref('')
const isVideoPlaying = ref(false)
const playbackRate = ref(1)

// Proxied URL for CORS-free playback
const proxiedBiliStreamUrl = computed(() => {
  if (!biliStreamUrl.value) return ''
  return `/api/v1/media/proxy?url=${encodeURIComponent(biliStreamUrl.value)}`
})

/** Skip the video backward/forward by `delta` seconds (clamped to [0, duration]). */
function skipBy(delta: number): void {
  const media = videoRef.value || audioRef.value
  if (!media || !isFinite(media.duration)) return
  const target = Math.max(0, Math.min(media.currentTime + delta, media.duration - 0.05))
  media.currentTime = target
  // Keep the transcript highlight in sync with the new position.
  onMediaTimeUpdate()
}

function applyPlaybackRate(): void {
  const media = videoRef.value || audioRef.value
  if (media) media.playbackRate = playbackRate.value
}

// ── A-B repeat loop (study-friendly) ──
const abLoop = reactive({
  pointA: -1,
  pointB: -1,
  enabled: false,
})

const canSetAB = computed(() => {
  const media = videoRef.value || audioRef.value
  return !!media && isFinite(media.duration) && media.duration > 0
})

/** First click sets A, second click sets B and enables the loop. */
function setABPoint(next: 'A' | 'B'): void {
  const media = videoRef.value || audioRef.value
  if (!media) return

  if (next === 'A' || abLoop.pointA < 0) {
    abLoop.pointA = media.currentTime
    abLoop.pointB = -1
    abLoop.enabled = false
  } else {
    abLoop.pointB = media.currentTime
    // If the user set B before A, swap so A < B.
    if (abLoop.pointB < abLoop.pointA) {
      ;[abLoop.pointA, abLoop.pointB] = [abLoop.pointB, abLoop.pointA]
    }
    abLoop.enabled = true
  }
}

function disableABLoop(): void {
  abLoop.enabled = false
  abLoop.pointA = -1
  abLoop.pointB = -1
}

/** Called from onMediaTimeUpdate; wraps playback back to A when B is hit. */
function checkABLoop(): void {
  if (!abLoop.enabled) return
  const media = videoRef.value || audioRef.value
  if (!media || abLoop.pointA < 0 || abLoop.pointB < 0) return
  if (media.currentTime >= abLoop.pointB) {
    media.currentTime = abLoop.pointA
    media.play().catch(() => {})
  }
}

// Guard against duplicate fetch calls
let isFetchingContent = false
let isFetchingStream = false

// Lock to prevent timeupdate from overriding manual seek
let manualSeekLock = false
let manualSeekTimeout: ReturnType<typeof setTimeout> | null = null

// Track the last segment we auto-scrolled for. Only advance the viewport when
// the active index moves forward (during playback) — re-renders or property
// changes for the same segment must NOT scroll, so the transcript advances
// strictly one row at a time.
let lastAutoScrolledIndex = -1

// Guards to prevent infinite refresh loops
let lastStreamRefreshTime = 0
let streamRefreshCount = 0
const MAX_STREAM_REFRESH = 2
const STREAM_REFRESH_COOLDOWN_MS = 5000

// Parsed transcript segments with timestamps for sync
const transcriptSegments = ref<Array<{ start?: number; end?: number; en: string; zh: string }>>([])
// Whether the transcript payload is still being fetched lazily. Drives a real
// spinner + explanation in the transcript panel instead of a static placeholder.
const segmentsLoading = ref(false)

const hasTranscriptSegments = computed(() => transcriptSegments.value.length > 0)
const canSeek = computed(() => transcriptSegments.value.some(s => s.start !== undefined))

// Build Bilibili embed URL from any Bilibili URL format
const biliEmbedUrl = computed(() => {
  const url = fixedVideoUrl.value
  if (!url) return ''

  // Extract bvid, cid, and page from various URL formats
  let bvid = ''
  let cid = 0
  let page = 1

  // Format: https://www.bilibili.com/video/BV...
  const videoMatch = url.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i)
  if (videoMatch) {
    bvid = videoMatch[1]
    // Extract page (p= parameter for www.bilibili.com)
    const pageMatch = url.match(/[?&]p=(\d+)/)
    if (pageMatch) page = parseInt(pageMatch[1])
  }

  // Format: player.html?bvid=BV...
  const playerMatch = url.match(/bvid=(BV[0-9A-Za-z]+)/i)
  if (playerMatch) {
    bvid = playerMatch[1]
    // Extract page (page= parameter for player.html)
    const pageMatch = url.match(/[?&]page=(\d+)/)
    if (pageMatch) page = parseInt(pageMatch[1])
  }

  // Extract cid
  const cidMatch = url.match(/[?&]cid=(\d+)/)
  if (cidMatch) cid = parseInt(cidMatch[1])

  if (!bvid) return url

  // Build embed URL with autoplay and no danmaku
  const params = new URLSearchParams({
    bvid,
    page: String(page),
    high_quality: '1',
    danmaku: '0',
    autopause: '0',
  })
  if (cid) params.set('cid', String(cid))

  return `https://player.bilibili.com/player.html?${params.toString()}`
})

async function fetchContent() {
  if (!route.params.id) return
  if (isFetchingContent) return  // Prevent duplicate calls
  isFetchingContent = true

  loading.value = true
  loadingHint.value = '正在加载内容信息…'
  error.value = ''

  // Reset stream refresh guards for new content
  streamRefreshCount = 0
  lastStreamRefreshTime = 0

  try {
    const res = await contentApi.getById(route.params.id as string)
    contentDetail.value = res
    parseTranscriptSegments()

    // Kick off the (potentially slow) Bilibili stream resolution and the
    // (potentially large) transcript fetch IN PARALLEL. Previously the
    // transcript was gated behind `await fetchBilibiliStream`, so both long
    // tasks ran sequentially and the page looked frozen. Fire both at once and
    // let each render into its own panel as it arrives.
    const tasks: Promise<void>[] = []
    if (isBiliVideo.value && !biliStreamUrl.value) {
      tasks.push(
        fetchBilibiliStream(true, '视频较大，正在解析播放地址…') as unknown as Promise<void>
      )
    }
    tasks.push(loadTranscriptSegments(route.params.id as string))
    await Promise.all(tasks)
  } catch (err: any) {
    error.value = err.message || '加载内容失败'
  } finally {
    loading.value = false
    loadingHint.value = ''
    isFetchingContent = false
  }
}

/**
 * Lazily fetch the transcript segments for the current content.
 *
 * The main detail API deliberately omits `segments` (can be 500KB+), so we
 * load it here in a separate request. We merge the fetched segments into the
 * existing contentDetail so the transcript panel renders once it arrives,
 * while the title/player are already on screen.
 */
async function loadTranscriptSegments(id: string): Promise<void> {
  segmentsLoading.value = true
  try {
    const { segments, duration } = await contentApi.getSegments(id)
    const current = contentDetail.value
    if (!current || current.id !== id) return // user navigated away
    // Shallow-merge the freshly loaded segments into the already-rendered
    // detail object. Because contentDetail is a shallowRef, assigning a new
    // object triggers reactivity for the transcript panel.
    contentDetail.value = {
      ...current,
      segments: segments ?? current.segments,
      duration: duration ?? current.duration,
    }
    parseTranscriptSegments()
  } catch (err) {
    console.warn('[ContentDetail] failed to load segments:', err)
  } finally {
    segmentsLoading.value = false
  }
}

/**
 * Fetch Bilibili video stream URL via backend API.
 * Returns a direct MP4 URL that can be played with native <video> element.
 */
async function fetchBilibiliStream(showLoading = true, hint?: string): Promise<void> {
  if (isFetchingStream) return  // Prevent duplicate calls
  isFetchingStream = true

  const url = fixedVideoUrl.value
  if (!url) {
    isFetchingStream = false
    return
  }

  if (showLoading) {
    isBiliStreamLoading.value = true
    loadingHint.value = hint || '正在解析视频播放地址…'
  }
  biliStreamError.value = ''

  try {
    // Extract page number from URL if present
    let page: number | undefined
    const pageMatch = url.match(/[?&]p=(\d+)/) || url.match(/[?&]page=(\d+)/)
    if (pageMatch) page = parseInt(pageMatch[1])

    const res = await mediaApi.getBilibiliPlayUrl(url, page)
    if (res?.videoUrl) {
      biliStreamUrl.value = res.videoUrl
    } else {
      biliStreamError.value = '无法获取视频流，请在B站观看'
    }
  } catch (err: any) {
    console.warn('Bilibili stream fetch failed:', err)
    biliStreamError.value = err.message || '视频加载失败'
  } finally {
    if (showLoading) {
      isBiliStreamLoading.value = false
      // Only clear the hint if it's still ours (a later task may have set a
      // more specific message meanwhile).
      if (loadingHint.value && (loadingHint.value === (hint || '正在解析视频播放地址…'))) {
        loadingHint.value = ''
      }
    }
    isFetchingStream = false
  }
}

/**
 * Check if the current stream URL is expired or about to expire.
 * Bilibili CDN URLs have a deadline parameter (unix timestamp).
 */
function isStreamUrlExpired(): boolean {
  const url = biliStreamUrl.value
  if (!url) return true

  try {
    const urlObj = new URL(url)
    const deadline = urlObj.searchParams.get('deadline')
    if (!deadline) return false

    const deadlineTime = parseInt(deadline) * 1000
    const now = Date.now()
    // Refresh if URL expires within 5 minutes
    return now >= deadlineTime - 5 * 60 * 1000
  } catch {
    return false
  }
}

function isBiliUrl(url: string): boolean {
  return url.includes('bilibili.com')
}

onMounted(fetchContent)

onBeforeUnmount(() => {
  // Cleanup video resources
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.src = ''
    videoRef.value.load()
  }
})

watch(() => route.params.id, () => {
  fetchContent()
})

function goBack() {
  router.push('/content')
}

function getContentTabLabel(tab: 'original' | 'translation' | 'bilingual'): string {
  const type = normalizedType.value
  if (type === 'podcast') {
    switch (tab) {
      case 'original': return '播客文本'
      case 'translation': return '翻译'
      case 'bilingual': return '双语对照'
    }
  }
  if (type === 'video') {
    switch (tab) {
      case 'original': return '字幕文本'
      case 'translation': return '翻译'
      case 'bilingual': return '双语对照'
    }
  }
  switch (tab) {
    case 'original': return '原文'
    case 'translation': return '翻译'
    case 'bilingual': return '双语对照'
  }
}

/**
 * Parse segments from content detail, preserving timestamps if available.
 * Falls back to proportional distribution when timestamps are missing (legacy data).
 * If segments are empty or too few, rebuilds from the content text.
 */
function parseTranscriptSegments(): void {
  const data = contentDetail.value
  if (!data) {
    transcriptSegments.value = []
    activeSegmentIndex.value = -1
    return
  }

  let segments = data.segments
  const duration = data.duration || 0

  // Guard: cap the number of rendered segments. Some legacy Bilibili backfills
  // produced 6000+ ultra-fine cues (per-word) which would freeze the UI when
  // rendered as 6000+ DOM nodes + 6000+ WordSelector components. We aggregate
  // adjacent cues until under the cap, preserving readability.
  const MAX_SEGMENTS = 1200
  const originalCount = Array.isArray(segments) ? segments.length : 0

  // Case 1: Has segments with timestamps — use them directly
  if (Array.isArray(segments) && segments.length > 0) {
    const hasTimestamps = segments.some((s: any) => s && s.start !== undefined && s.end !== undefined)

    if (hasTimestamps) {
      // The frontend works in seconds (media.currentTime + formatTime).
      // Backend cleaner.ts writes ms; the legacy Bilibili subtitle backfill
      // wrote raw seconds. Detect by comparing the largest timestamp against
      // the content duration: if they are the same order of magnitude as
      // duration we treat them as seconds, otherwise divide by 1000.
      const maxRaw = segments.reduce(
        (m: number, s: any) => Math.max(m, typeof s.start === 'number' ? s.start : 0),
        0,
      )
      const looksLikeSeconds = duration > 0 && maxRaw > 0 && maxRaw < duration * 2
      const toSec = (v: number | undefined) => {
        if (typeof v !== 'number') return undefined
        return looksLikeSeconds ? v : v / 1000
      }

      const mapped = segments.map((s: any) => ({
        start: toSec(s.start),
        end: toSec(s.end),
        en: s.en || '',
        zh: s.zh || '',
      }))

      // Aggregate if over the cap (e.g. 6000 cues → ~1200 merged blocks)
      transcriptSegments.value =
        mapped.length > MAX_SEGMENTS
          ? aggregateSegments(mapped, MAX_SEGMENTS)
          : mergeTinySegments(mapped)
      activeSegmentIndex.value = -1
      return
    }

    // Case 2: Has segments but NO timestamps — check if they look complete
    const hasContent = segments.some((s: any) => s && s.en && s.en.trim().length > 10)
    if (hasContent && segments.length >= 3) {
      // Use proportional distribution across duration
      const segDuration = duration > 0 ? duration / segments.length : 5
      const mapped = segments.map((s: any, i: number) => ({
        start: i * segDuration,
        end: (i + 1) * segDuration,
        en: s.en || '',
        zh: s.zh || '',
      }))
      transcriptSegments.value =
        mapped.length > MAX_SEGMENTS
          ? aggregateSegments(mapped, MAX_SEGMENTS)
          : mapped
      activeSegmentIndex.value = -1
      return
    }
  }

  // Case 3: Segments missing or incomplete — rebuild from content text
  const rebuildContent = data.content
  const rebuildTranslation = data.translation
  if (rebuildContent && rebuildContent.trim().length > 20) {
    const enParagraphs = rebuildContent
      .split(/\n+/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 5)

    const zhParagraphs = rebuildTranslation
      ? rebuildTranslation.split(/\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 2)
      : []

    if (enParagraphs.length > 0) {
      const segDuration = duration > 0 ? duration / enParagraphs.length : 5
      transcriptSegments.value = enParagraphs.map((en: string, i: number) => ({
        start: i * segDuration,
        end: (i + 1) * segDuration,
        en,
        zh: zhParagraphs[i] || '',
      }))
      activeSegmentIndex.value = -1
      return
    }
  }

  // Case 4: Nothing usable
  transcriptSegments.value = []
  activeSegmentIndex.value = -1
}

/**
 * Merge segments shorter than ~300ms into their predecessor so the highlight
 * never flashes past a subtitle too fast to read. Timestamps here are already
 * in seconds (frontend unit). Only merges when both the tiny segment and its
 * predecessor carry valid timestamps.
 */
function mergeTinySegments(segs: Array<{ start?: number; end?: number; en: string; zh: string }>) {
  if (segs.length < 2) return segs
  const out: Array<{ start?: number; end?: number; en: string; zh: string }> = []
  for (const s of segs) {
    const prev = out[out.length - 1]
    if (
      prev &&
      typeof s.start === 'number' &&
      typeof s.end === 'number' &&
      typeof prev.start === 'number' &&
      typeof prev.end === 'number' &&
      s.end - s.start < 0.3
    ) {
      prev.en = prev.en ? `${prev.en} ${s.en}`.trim() : s.en
      if (s.zh) prev.zh = prev.zh ? `${prev.zh} ${s.zh}`.trim() : s.zh
      prev.end = s.end
      continue
    }
    out.push(s)
  }
  return out
}

/**
 * Reduce a very large segment list (e.g. 6000 Bilibili per-word cues) to at
 * most `cap` blocks by greedily merging consecutive cues. Timestamps are kept
 * (start of first, end of last) so playback sync still works; text is joined
 * with a space. This keeps the transcript readable while preventing the UI
 * from freezing on thousands of DOM nodes.
 */
function aggregateSegments(
  segs: Array<{ start?: number; end?: number; en: string; zh: string }>,
  cap: number,
): Array<{ start?: number; end?: number; en: string; zh: string }> {
  if (segs.length <= cap) return segs
  const groupSize = Math.ceil(segs.length / cap)
  const out: Array<{ start?: number; end?: number; en: string; zh: string }> = []
  for (let i = 0; i < segs.length; i += groupSize) {
    const chunk = segs.slice(i, i + groupSize)
    if (chunk.length === 0) continue
    const first = chunk[0]
    const last = chunk[chunk.length - 1]
    out.push({
      start: first.start,
      end: last.end,
      en: chunk.map((c) => c.en).join(' ').trim(),
      zh: chunk.map((c) => c.zh).filter(Boolean).join(' ').trim(),
    })
  }
  return out
}

/**
 * Unified time update handler for both video and audio playback.
 */
/**
 * Update active segment based on current playback time.
 * Works with native video/audio elements AND Bilibili iframe postMessage events.
 */
function onMediaTimeUpdate(event?: Event | number) {
  // Skip update if we're in a manual seek lock
  if (manualSeekLock) return

  // A-B repeat loop: wrap back to point A when the playhead reaches point B.
  checkABLoop()

  let time: number
  let duration: number

  // Handle both Event object and direct number
  if (event instanceof Event) {
    const media = videoRef.value || audioRef.value
    if (!media || transcriptSegments.value.length === 0) return
    time = media.currentTime
    duration = media.duration || 0
  } else if (typeof event === 'number') {
    time = event
    const media = videoRef.value || audioRef.value
    duration = media?.duration || 0
  } else {
    const media = videoRef.value || audioRef.value
    if (!media || transcriptSegments.value.length === 0) return
    time = media.currentTime
    duration = media.duration || 0
  }

  const segments = transcriptSegments.value

  // Binary search for the active segment by start timestamp (O(log n) instead
  // of O(n) linear scan — critical when there are 1000+ segments updated 4×
  // per second). Segments are sorted by start ascending.
  let idx = -1
  if (segments.length > 0) {
    let lo = 0
    let hi = segments.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const s = segments[mid]
      const st = s.start
      if (st === undefined) {
        hi = mid - 1
        continue
      }
      if (time < st) {
        hi = mid - 1
      } else {
        // st <= time — candidate; check if this is the last one whose start <= time
        const nextSt = segments[mid + 1]?.start
        if (nextSt === undefined || time < nextSt) {
          idx = mid
          break
        }
        lo = mid + 1
      }
    }
    // Fallback: if nothing matched (time before first cue), highlight first
    if (idx === -1) idx = 0
  }

  if (idx !== activeSegmentIndex.value && idx >= 0) {
    activeSegmentIndex.value = idx
    // Keep the 双语全文 (article) tab highlight in sync with playback. The
    // article tab groups cues into semantic paragraphs (not 1:1 with
    // transcript segments), so mirror via the sentence timeline instead of
    // reusing the transcript segment index.
    syncArticleHighlight(time)
    // Auto-scroll the active segment into view
    scrollActiveSegmentIntoView()
  }
}

/**
 * Scroll the active transcript block into view.
 *
 * When the active block is still visible, do nothing — the user is watching
 * it from where it is. Only when it has scrolled fully out of view do we
 * nudge it back, and we park it right at the top of the viewport (with a
 * small gap) instead of jumping it to the middle. The per-step delta is then
 * small — roughly one transcript block at a time — so the transcript reads
 * like it is advancing line by line rather than leaping.
 */
function scrollActiveSegmentIntoView(): void {
  // Skip auto-scroll if disabled
  if (!transcriptSettings.autoScroll) return
  // While a manual seek lock is active (right after clicking a transcript
  // line), suppress auto-scrolling entirely so the clicked block stays put.
  if (manualSeekLock) return
  if (activeSegmentIndex.value < 0 || !transcriptBodyRef.value) return

  // Coalesce re-renders: only react when the active index has actually moved
  // since the last auto-scroll. This prevents the viewport from being
  // repeatedly re-parked on the same line (which feels like a jump back to
  // the top on every timeupdate).
  const moved = activeSegmentIndex.value !== lastAutoScrolledIndex
  if (!moved) return
  const directionForward = activeSegmentIndex.value > lastAutoScrolledIndex
  lastAutoScrolledIndex = activeSegmentIndex.value

  // O(1) lookup: querySelectorAll on 6000+ nodes every timeupdate (4×/sec) was
  // a major perf bottleneck. Use the container's live children collection
  // instead — indexing into HTMLCollection is direct array access.
  const container = transcriptBodyRef.value
  if (!container || !container.isConnected) return
  const blocks = container.children
  const activeBlock = blocks[activeSegmentIndex.value] as HTMLElement | undefined
  if (!activeBlock || !activeBlock.isConnected) return

  // `.transcript-block` is not positioned, so `offsetTop` is measured against
  // an arbitrary positioned ancestor (not the scroll container) — using it
  // would scroll far past the target. Compute the block's position in the
  // container's content coordinates from getBoundingClientRect instead.
  const containerRect = container.getBoundingClientRect()
  const blockRect = activeBlock.getBoundingClientRect()
  const blockTop = blockRect.top - containerRect.top + container.scrollTop
  const blockBottom = blockTop + blockRect.height
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  const GAP = 12
  // Forward playback (idx increased): only scroll when the active block has
  // fallen fully below the visible area. The block is then parked at the top
  // of the viewport so the next row lands at the same spot (≈ one row of
  // motion per scroll).
  if (directionForward && blockBottom > viewBottom) {
    container.scrollTo({
      top: Math.max(0, blockTop - GAP),
      behavior: 'smooth',
    })
    return
  }
  // Backward jump (user clicked an earlier line, or seeked back): pull the
  // active block into view at the top so it is visible.
  if (!directionForward && (blockTop < viewTop || blockBottom > viewBottom)) {
    container.scrollTo({
      top: Math.max(0, blockTop - GAP),
      behavior: 'smooth',
    })
  }
}

/**
 * Seek to a segment's start time in the media player.
 * Uses native video/audio currentTime for perfect control.
 * Locks the timeupdate handler briefly to prevent override.
 */
function seekToSegment(seg: { start?: number; end?: number }, idx?: number): void {
  if (seg.start === undefined) return

  const media = videoRef.value || audioRef.value
  if (media) {
    try {
      // Set the active segment immediately. Do NOT auto-scroll here: the user
      // just clicked this very block, so it is already on screen — scrolling
      // it again would shove it toward the top/out of view.
      if (idx !== undefined) {
        activeSegmentIndex.value = idx
      }

      // Clamp the target time to the media duration. When subtitle and video
      // timelines don't perfectly align (e.g. Bilibili re-upload with extra
      // intro), an out-of-range seg.start would be clamped by the browser to
      // the end of the video, making it look like the seek "jumped to a
      // neighbouring subtitle". Clamp here so we land inside the real video.
      const dur = isFinite(media.duration) && media.duration > 0 ? media.duration : Infinity
      const target = Math.max(0, Math.min(seg.start, dur - 0.05))
      media.currentTime = target

      // Lock timeupdate handler (and auto-scroll) briefly to prevent the
      // seek-triggered timeupdate from overriding our manual highlight and
      // scrolling the clicked block out of place.
      manualSeekLock = true
      if (manualSeekTimeout) clearTimeout(manualSeekTimeout)
      manualSeekTimeout = setTimeout(() => {
        manualSeekLock = false
      }, 800)

      // Keep the current playback state — seek then continue playing. The
      // user expects clicking a transcript line to jump straight to that
      // moment, not to pause the video.
      if (media.paused) {
        media.play().catch(() => {})
      }
    } catch {
      // Some browsers may throw on seek before metadata is loaded
    }
  }
}

/**
 * Event-delegated word selection for the transcript panel.
 *
 * Replaces the per-block WordSelector component (which instantiated 6000+
 * components and registered 18000+ global event listeners for a long
 * Bilibili video, freezing the UI). Selection is handled once at the
 * container level: on mouseup we read window.getSelection(), normalize the
 * word, and route it through the same vocabulary-add path WordSelector used.
 */
function onTranscriptMouseUp(): void {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) return
  const raw = sel.toString().trim()
  if (!raw) return
  // Only single-word selections auto-add; multi-word selections are ignored
  // (the user may just be copying text).
  if (/\s/.test(raw)) return
  const word = raw.replace(/[^A-Za-z'-]/g, '')
  if (!word) return
  handleAddVocabulary(word)
}

/**
 * Add selected word to vocabulary book.
 * Wired to WordSelector's add-vocabulary event across transcript & article.
 */
async function handleAddVocabulary(word: string): Promise<void> {
  try {
    await vocabularyApi.addWord(word, route.params.id as string)
  } catch (err) {
    console.warn('add vocabulary failed:', err)
  }
}

/**
 * Handle native video events for perfect bidirectional sync.
 */
function onVideoMetadataLoaded() {
  // Once metadata is loaded, mark the first segment as active for the
  // `1 / N` counter, but do NOT auto-scroll — the first segment is already
  // visible right below the video, and any scroll here just pushes it
  // under the video's gradient overlay (or out of view entirely).
  if (transcriptSegments.value.length > 0) {
    activeSegmentIndex.value = 0
  }
}

async function onVideoPlay() {
  // Check if stream URL is expired and refresh if needed
  if (isBiliVideo.value && isStreamUrlExpired()) {
    const now = Date.now()
    const canRefresh =
      streamRefreshCount < MAX_STREAM_REFRESH &&
      now - lastStreamRefreshTime > STREAM_REFRESH_COOLDOWN_MS

    if (canRefresh) {
      streamRefreshCount++
      lastStreamRefreshTime = now

      // Refresh URL first, then update video source
      await fetchBilibiliStream(false)
      
      if (biliStreamUrl.value) {
        const video = videoRef.value
        if (video) {
          video.src = proxiedBiliStreamUrl.value
          video.load()
          video.play().catch(() => {})
        }
      }
    }
  }
  isVideoPlaying.value = true
}

function onVideoPause() {
  isVideoPlaying.value = false
}

function onVideoSeeked() {
  // After seeking, re-sync the active segment to the new playback position
  onMediaTimeUpdate()
}

/**
 * Handle video loading errors (e.g., expired CDN URL).
 * Includes guard to prevent infinite refresh loops.
 */
async function onVideoError() {
  if (!isBiliVideo.value) return
  
  // If we already have a valid stream URL, don't show error immediately
  // The error might be a transient issue
  if (biliStreamUrl.value) {
    const now = Date.now()
    const canRefresh =
      streamRefreshCount < MAX_STREAM_REFRESH &&
      now - lastStreamRefreshTime > STREAM_REFRESH_COOLDOWN_MS

    if (canRefresh) {
      streamRefreshCount++
      lastStreamRefreshTime = now

      // Try to refresh the stream URL
      await fetchBilibiliStream(false)
      if (biliStreamUrl.value) {
        const video = videoRef.value
        if (video) {
          video.src = proxiedBiliStreamUrl.value
          video.load()
        }
      } else {
        biliStreamError.value = '视频加载失败，请在B站观看'
      }
    }
  } else {
    // No stream URL available, show error
    biliStreamError.value = '视频加载失败，请在B站观看或稍后重试'
  }
}

function formatContent(text: string): string {
  const raw = (text || contentDetail.value?.summary || '').trim()
  if (!raw) return ''
  return raw
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

function formatTranslation(text: string): string {
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

/** Check if translation looks like a full translation (not just a one-line summary) */
const isTranslationAdequate = computed(() => {
  if (!contentDetail.value?.translation) return false
  const t = contentDetail.value.translation.trim()
  const sentenceCount = (t.match(/[。！？.!?]/g) || []).length
  return sentenceCount >= 3 || t.length > 80
})

// Normalized type for reliable template comparison
const normalizedType = computed(() => (contentDetail.value?.type || '').toLowerCase())

// Fixed media URL (converts expired CDN URLs to stable embed URLs)
// Fallback: if videoUrl is empty but sourceUrl is a Bilibili page, use sourceUrl
// (some Bilibili-sourced videos only have sourceUrl, not videoUrl)
const fixedVideoUrl = computed(() => {
  const url = contentDetail.value?.videoUrl
  if (url) return fixMediaUrl(url)
  const src = contentDetail.value?.sourceUrl
  if (src && /bilibili\.com\/video\/(BV|av)/.test(src)) return src
  return undefined
})
const fixedAudioUrl = computed(() => fixMediaUrl(contentDetail.value?.audioUrl))
// True when this video is from Bilibili (we'll use Bilibili iframe + postMessage sync)
const isBiliVideo = computed(() => !!fixedVideoUrl.value && fixedVideoUrl.value.includes('bilibili'))

/**
 * Audio URL that is actually playable. Some crawled podcast rows stored a
 * cover-image URL in audioUrl (image/jpeg) — feeding those to <audio> renders
 * a permanently broken player, so filter them out.
 */
const usableAudioUrl = computed<string>(() => {
  const url = fixedAudioUrl.value
  if (!url) return ''
  if (/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url)) return ''
  if (/\/media\/display\//i.test(url)) return '' // france24 image CDN paths
  return url
})

/**
 * True when the bilingual body is NOT already rendered inside the video or
 * podcast player panel — i.e. plain ARTICLE content (or media whose player
 * failed to mount). In that case a standalone reading section takes over,
 * so articles finally have somewhere to display their body text.
 */
const showStandaloneArticle = computed(() => {
  if (!hasArticleContent.value) return false
  const mediaPanelShowsBody =
    hasTranscriptSegments.value &&
    ((normalizedType.value === 'video' && !!fixedVideoUrl.value) ||
      (normalizedType.value === 'podcast'))
  return !mediaPanelShowsBody
})

/**
 * Bilingual paragraphs for the **article (full-text) tab only**.
 * Distinct from the subtitle tab which must keep every cue separate to
 * stay in sync with the player.
 *
 * This is a computed (memoized), NOT a plain function called from the
 * template: the old per-render recomputation re-ran the merge over ~6000
 * cues on every re-render, and playback fires timeupdate ≈4×/s, so the
 * whole merge pipeline ran continuously during video playback.
 */
const bilingualParagraphs = computed<BilingualParagraph[]>(() => {
  const d = contentDetail.value
  if (!d) return []
  // For VIDEO content the segments are raw Bilibili cues (often short
  // fragments of a single sentence). We MUST merge continuation cues into
  // complete sentences before paragraph-level grouping — otherwise a single
  // English sentence like "Great. Unfortunately, the orchestra's already
  // filled up, but they do have seats that are still left in the dress
  // circle." gets split across multiple blocks, which looks broken.
  return buildBilingualParagraphs(
    normalizedBilingualSegments(d),
    d.content,
    d.translation,
  )
})

/**
 * Segment timestamps arrive in either ms (cleaner.ts) or seconds (legacy
 * Bilibili backfill). Detect the unit the same way parseTranscriptSegments
 * does (compare the largest cue start against the content duration) and
 * return a seconds-normalized copy for the bilingual paragraph builder.
 */
function normalizedBilingualSegments(d: any): Array<{ en?: string; zh?: string; start?: number; end?: number }> | undefined {
  const segs = d?.segments
  if (!Array.isArray(segs) || segs.length === 0) return undefined
  const hasTs = segs.some((s: any) => s && typeof s.start === 'number')
  if (!hasTs) return segs
  const duration = d.duration || 0
  const maxRaw = segs.reduce(
    (m: number, s: any) => Math.max(m, typeof s.start === 'number' ? s.start : 0),
    0,
  )
  const looksLikeSeconds = duration > 0 && maxRaw > 0 && maxRaw < duration * 2
  if (looksLikeSeconds) return segs
  return segs.map((s: any) => ({
    ...s,
    start: typeof s.start === 'number' ? s.start / 1000 : undefined,
    end: typeof s.end === 'number' ? s.end / 1000 : undefined,
  }))
}

/**
 * Flat sentence timeline for playback-synced highlighting in the 双语全文
 * tab: one entry per sentence pair that carries timestamps, sorted by start
 * so a binary search can locate (paragraph, sentence) from the playhead.
 */
const bilingualTimeline = computed(() => {
  const tl: Array<{ p: number; s: number; start: number; end: number }> = []
  bilingualParagraphs.value.forEach((para, p) => {
    para.sentences.forEach((sent, s) => {
      if (typeof sent.start === 'number' && typeof sent.end === 'number') {
        tl.push({ p, s, start: sent.start, end: sent.end })
      }
    })
  })
  // Raw cue timestamps can overlap slightly (consecutive cues sharing
  // boundaries); sort so the binary search below stays valid.
  tl.sort((a, b) => a.start - b.start)
  return tl
})

/**
 * Keep the 双语全文 tab's sentence highlight in sync with playback by
 * locating the sentence pair whose [start, end] window contains the
 * playhead. The timeline is built from the same sentence pairs the template
 * renders, so paragraph/sentence indices always line up (the old code
 * mirrored the transcript segment index onto the paragraph index, which was
 * wrong once paragraphs stopped being 1:1 with segments).
 */
function syncArticleHighlight(time: number): void {
  const tl = bilingualTimeline.value
  if (tl.length === 0) return // no timestamps — leave highlight untouched
  let lo = 0
  let hi = tl.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (time < tl[mid]!.start) {
      hi = mid - 1
    } else {
      const nextStart = tl[mid + 1]?.start
      if (nextStart === undefined || time < nextStart) {
        found = mid
        break
      }
      lo = mid + 1
    }
  }
  if (found >= 0) {
    activeParaIdx.value = tl[found]!.p
    activeSentenceIdx.value = tl[found]!.s
  } else {
    activeParaIdx.value = -1
    activeSentenceIdx.value = -1
  }
}
</script>

<style scoped>
.detail-page {
  max-width: 860px;
  margin: 0 auto;
  padding: var(--space-6);
  min-height: calc(100vh - 64px);
}

/* ── Header ─────────────────────────────────────────────────── */
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.16s ease;
  flex-shrink: 0;
  margin-top: 2px;
}

.back-btn:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-border-strong);
}

.header-info {
  flex: 1;
  min-width: 0;
}

/* AI practice entry button in the header */
.ai-practice-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-brand-50);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 2px;
}

.ai-practice-btn:hover {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  box-shadow: var(--shadow-sm);
}

.ai-practice-btn .sparkle-icon {
  color: currentColor;
}

.header-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--space-3);
  line-height: 1.3;
  font-family: var(--font-serif);
}

.header-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.type-badge {
  display: inline-flex;
  padding: 5px 14px;
  font-size: 0.875rem;
  font-weight: 700;
  border-radius: var(--radius-sm, 6px);
  letter-spacing: 0.02em;
  line-height: 1.4;
  border: 1px solid transparent;
}
.badge-article {
  background: var(--color-brand-50, var(--color-surface-subtle));
  color: var(--color-brand-700, var(--color-brand-700));
  border-color: var(--color-brand-200, var(--color-border));
}
.badge-video {
  background: var(--color-danger-50, var(--color-danger-50));
  color: var(--color-danger-600, var(--color-danger-600));
  border-color: var(--color-danger-200, var(--color-danger-200));
}
.badge-podcast {
  background: var(--color-success-50, var(--color-success-50));
  color: var(--color-success-600, var(--color-success-600));
  border-color: var(--color-success-200, var(--color-success-200));
}

.difficulty-badge {
  display: inline-flex;
  padding: 5px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: var(--radius-sm, 6px);
  line-height: 1.4;
  border: 1px solid transparent;
}
.diff-A1, .diff-A2 {
  background: var(--color-success-50, var(--color-success-50));
  color: var(--color-success-700, var(--color-success-700));
  border-color: var(--color-success-200, var(--color-success-200));
}
.diff-B1, .diff-B2 {
  background: var(--color-brand-50, var(--color-surface-subtle));
  color: var(--color-brand-700, var(--color-brand-700));
  border-color: var(--color-brand-200, var(--color-border));
}
.diff-C1, .diff-C2 {
  background: var(--color-danger-50, var(--color-danger-50));
  color: var(--color-danger-600, var(--color-danger-600));
  border-color: var(--color-danger-200, var(--color-danger-200));
}

.source-badge {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  line-height: 1.4;
}

.external-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.16s;
}

.external-link:hover {
  color: var(--color-brand-700);
  text-decoration: underline;
}

.skeleton-header {
  flex: 1;
  padding-top: 4px;
}

/* ── Error ──────────────────────────────────────────────────── */
.error-state {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-danger-600);
}

.error-state button {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
}

/* ── Media Sections ─────────────────────────────────────────── */
.media-section {
  margin-bottom: var(--space-6);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}

.video-embed,
.video-native {
  width: 100%;
  height: 100%;
  display: block;
}

/* Quick transport bar (skip ±10s, elapsed time, playback rate) */
.video-transport {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface-muted);
  border-top: 1px solid var(--color-border);
}

.transport-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.transport-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-brand-50);
}

.transport-time {
  flex: 1;
  text-align: center;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.rate-select {
  padding: 4px 8px;
  font-size: 0.8125rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.transport-divider {
  width: 1px;
  align-self: stretch;
  background: var(--color-border);
  margin: 2px 0;
}

.transport-btn.ab-btn {
  gap: 6px;
  min-width: 56px;
  justify-content: center;
}

.transport-btn.ab-btn.active {
  border-color: var(--color-danger-600);
  color: #fff;
  background: var(--color-danger-600);
}

.transport-btn.ab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ab-state {
  font-size: 0.625rem;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
}

/* ── Bilibili iframe player ───────────────────────────────── */
.bili-player {
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Hide the Bilibili watermark/branding in corner via CSS clip */
.bili-player::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 60px;
  height: 20px;
  pointer-events: none;
}

/* ── Bilibili native video loading/error states ───────────── */
.video-loading,
.video-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--color-text);
  color: var(--color-text-300);
  font-size: 0.9rem;
}

.video-loading .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-text-700);
  border-top-color: var(--color-primary, var(--color-info-600));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  max-width: 80%;
  text-align: center;
  line-height: 1.4;
}

/* Smaller spinner variant for inline use (transcript panel, etc.) */
.spinner-sm {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

/* Full-page initial loading overlay */
.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
  min-height: 50vh;
  text-align: center;
}

.detail-loading .spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary, var(--color-info-600));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.detail-loading-text {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, var(--color-text));
}

.detail-loading-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-300);
}

/* Transcript empty / loading placeholder */
.transcript-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 16px;
  color: var(--color-text-300);
  font-size: 0.875rem;
  text-align: center;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.video-error {
  text-align: center;
  padding: 20px;
}

.video-error p {
  margin: 0;
  color: var(--color-danger-400);
}

.video-error button {
  padding: 8px 20px;
  background: var(--color-primary, var(--color-info-600));
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
}

.video-error button:hover {
  opacity: 0.9;
}

.fallback-link {
  color: var(--color-info-400);
  text-decoration: none;
  font-size: 0.85rem;
}

.fallback-link:hover {
  text-decoration: underline;
}
/* ── Transcript Panel ──────────────────────────────────────── */
.transcript-panel {
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.transcript-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
}

.transcript-header h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.02em;
}

/* Tab bar inside the transcript header (replaces the old plain h3) */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover:not(.active) {
  background: var(--color-surface);
  color: var(--color-text);
}

.tab-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.tab-progress {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-brand-50);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.transcript-progress {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.transcript-body {
  position: relative;
  max-height: 500px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* Full-text bilingual article shown in the same tab panel as the transcript */
.article-panel {
  max-height: 500px;
  overflow-y: auto;
  padding: var(--space-4);
}

.article-panel .article-body {
  padding: 0;
}

.article-panel .bilingual-text {
  padding: 0;
}

.transcript-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s ease;
}

.transcript-block:last-child {
  border-bottom: none;
}

.transcript-block.clickable {
  cursor: pointer;
}

.transcript-block.clickable:hover {
  background: var(--color-surface-muted);
}

/* Active subtitle — animated "liquid" highlight bar on the left and a
   soft gradient wash. When the active block changes, the bar's clip-path
   animates from a small circle (the accent contracts) to a tall bar
   (the accent blooms), giving a satisfying blob/particle-like transition.
   The bar's mask animation is paired with a soft glow that pulses once. */
.transcript-block.active {
  position: relative;
  background: linear-gradient(90deg, var(--color-brand-50), var(--color-surface) 70%);
  border-left: none;
  isolation: isolate;
}

.transcript-block.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  background: var(--color-primary);
  box-shadow: 0 0 12px rgba(79, 70, 229, 0.55), 0 0 24px rgba(79, 70, 229, 0.3);
  animation: liquid-bloom 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.transcript-block.active::after {
  /* A bloom of liquid particles emanating from the active line's accent. */
  content: '';
  position: absolute;
  left: 4px;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  transform: translateY(-50%) scale(0);
  opacity: 0;
  filter: blur(2px);
  animation: particle-burst 520ms ease-out both;
  pointer-events: none;
}

@keyframes liquid-bloom {
  0% {
    clip-path: inset(40% 0 40% 0 round 50%);
    transform: translateX(-2px);
    opacity: 0.4;
  }
  60% {
    clip-path: inset(0 0 0 0 round 0);
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    clip-path: inset(0 0 0 0 round 0);
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes particle-burst {
  0% {
    transform: translate(-12px, -50%) scale(0);
    opacity: 0;
  }
  30% {
    transform: translate(8px, -50%) scale(1.2);
    opacity: 0.6;
  }
  100% {
    transform: translate(60px, -50%) scale(0.6);
    opacity: 0;
  }
}

/* The active English line glows and fades in slightly so the transition
   feels alive when the playback jumps from one subtitle to the next. */
.transcript-block.active .transcript-en {
  color: var(--color-primary);
  animation: text-bloom 360ms ease-out both;
}

.transcript-block.active .transcript-time {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  animation: text-bloom 360ms ease-out both;
}

@keyframes text-bloom {
  0% {
    opacity: 0.3;
    transform: translateX(-4px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.transcript-block-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.transcript-time {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.transcript-en {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-text);
  font-weight: 500;
}

.transcript-zh {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.transcript-zh.no-translate {
  color: var(--color-text-300);
  font-style: italic;
  background: transparent;
  padding: 0;
}

/* ── Transcript Settings Panel ──────────────────────────────────────────── */
.transcript-header-controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.transcript-settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.transcript-settings-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text-300);
}

.transcript-settings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.setting-row label {
  min-width: 80px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.setting-row input[type="range"] {
  flex: 1;
  max-width: 200px;
  accent-color: var(--color-brand-500);
}

.setting-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-brand-500);
}

.setting-value {
  min-width: 50px;
  font-size: 0.8125rem;
  color: var(--color-text);
  text-align: right;
}

/* ── Transcript scroll smooth ──────────────────────────────────────────── */
.transcript-body {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}



/* ── Audio Section ──────────────────────────────────────────── */
.audio-section {
  background: var(--color-brand-50);
  border: 1px solid var(--color-border);
  padding: var(--space-4);
}

.audio-hint {
  margin-top: var(--space-3);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  text-align: center;
}

.audio-player {
  max-width: 600px;
  margin: 0 auto;
}

.audio-player audio {
  width: 100%;
  height: 44px;
  border-radius: var(--radius-sm);
}

/* ── Summary ────────────────────────────────────────────────── */
.summary-section {
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  background: var(--color-surface);
  border-left: 3px solid var(--color-primary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.summary-section h2 {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-section p {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-text-muted);
  margin: 0;
}

/* ── Article Section ───────────────────────────────────────── */
.article-section {
  margin-bottom: var(--space-6);
}

.article-tabs {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0;
}

.tab-btn {
  padding: var(--space-2) var(--space-4);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: var(--font-sans);
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

.article-body {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tab-content {
  padding: var(--space-6);
}

.original-text {
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--color-text);
}

.original-text :deep(p) {
  margin: 0 0 var(--space-4);
}

.original-text :deep(p:last-child) {
  margin-bottom: 0;
}

.translation-text {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--color-text-muted);
}

.translation-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.translation-hint svg {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

/* Bilingual reading block styles (.bilingual-text/.bilingual-block/.sentence/
   .bi-zh/.zh-sentence/.translation-hint) moved into the shared
   BilingualArticlePanel component when the markup was extracted. */

.audio-unavailable {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: 0.9375rem;
}

.audio-unavailable svg {
  flex-shrink: 0;
}

/* Standalone article reading: no 500px scroll box — the page scrolls. */
.article-panel-standalone {
  max-height: none;
}

/* ── No Content ─────────────────────────────────────────────── */
.no-content-section {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-muted);
}

.no-content-icon {
  opacity: 0.3;
  margin-bottom: var(--space-3);
}

.link-primary {
  display: inline-block;
  margin-top: var(--space-3);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.link-primary:hover {
  text-decoration: underline;
}

/* ── AI Section ─────────────────────────────────────────────── */
.ai-section {
  margin-top: var(--space-6);
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .detail-page {
    padding: var(--space-4);
  }

  .header-title {
    font-size: 1.25rem;
  }

  .tab-content {
    padding: var(--space-4);
  }

  .original-text {
    font-size: 1rem;
  }
}

/* ── AI Practice Drawer ─────────────────────────────────────────── */
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: flex-end;
}

.practice-drawer {
  width: min(560px, 92vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  flex-shrink: 0;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.drawer-title .sparkle-icon {
  color: var(--color-primary);
}

.drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.drawer-close:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

/* Drawer slide-in transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-enter-active .practice-drawer,
.drawer-leave-active .practice-drawer {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .practice-drawer,
.drawer-leave-to .practice-drawer {
  transform: translateX(100%);
}
</style>
