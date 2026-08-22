<template>
  <div class="dashboard-page">
    <PageHeader title="学习仪表盘" subtitle="今日学习概览" />

    <!-- Stats Cards -->
    <section class="stats-grid">
      <template v-if="dashboard.loading">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </template>
      <template v-else>
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard.stats.todayStudyMinutes }}</span>
            <span class="stat-label">今日学习（分钟）</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard.stats.todayWordsLearned }}</span>
            <span class="stat-label">今日新词</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard.stats.streak }}天</span>
            <span class="stat-label">连续学习</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ dashboard.stats.weeklyGoalProgress }}%</span>
            <span class="stat-label">周目标进度</span>
          </div>
        </div>
      </template>
    </section>

    <!-- Daily Goal -->
    <section class="daily-goal-section">
      <div class="daily-goal-card">
        <DailyGoal :current="dashboard.stats.todayStudyMinutes" :target="30" />
      </div>
    </section>

    <!-- Charts Section -->
    <section class="charts-section">
      <div class="chart-card">
        <h3 class="chart-title">学习热力图</h3>
        <StudyHeatmap :data="dashboard.heatmapData.slice(-182)" />
      </div>

      <div class="chart-card">
        <h3 class="chart-title">词汇增长趋势</h3>
        <div class="chart-placeholder">
          <div class="bar-chart">
            <div
              v-for="point in dashboard.wordGrowthData"
              :key="point.label"
              class="bar-item"
            >
              <div class="bar" :style="{ height: `${(point.value / 1250) * 100}%` }" />
              <span class="bar-label">{{ point.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Daily Recommendations -->
    <section class="recommendations-section">
      <h2 class="section-title">今日推荐</h2>
      <div class="recommendations-grid">
        <div
          v-for="item in dashboard.todayRecommendations"
          :key="item.id"
          class="recommendation-card"
          @click="$router.push(`/content/${item.id}`)"
        >
          <div :class="['rec-type-badge', `type-${item.type}`]">
            {{ item.type === 'article' ? '文章' : item.type === 'video' ? '视频' : '播客' }}
          </div>
          <div class="rec-content">
            <h4>{{ item.title }}</h4>
            <p class="rec-summary">{{ item.summary }}</p>
            <p class="rec-meta">
              <span class="rec-source">{{ item.source }}</span>
              <BaseTag variant="default" size="sm">{{ item.difficulty }}</BaseTag>
              <span v-if="item.estimatedMinutes" class="rec-time">{{ item.estimatedMinutes }}分钟</span>
              <span v-if="item.duration" class="rec-time">{{ Math.floor(item.duration / 60) }}分钟</span>
              <span class="rec-vocab">{{ item.vocabularyCount }}个生词</span>
            </p>
          </div>
        </div>
      </div>
      <div v-if="dashboard.todayRecommendations.length === 0 && !dashboard.loading" class="rec-empty">
        <p>加载推荐内容中...</p>
      </div>
    </section>

    <!-- Weekly Report -->
    <WeeklyReport
      weekLabel="本周"
      :study-days="5"
      :total-minutes="180"
      :words-learned="45"
      :articles-read="8"
      :accuracy="78"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { PageHeader, StudyHeatmap, Skeleton, DailyGoal, WeeklyReport, BaseTag } from '../components'
import { useDashboardStore } from '../stores/dashboard'

const dashboard = useDashboardStore()

onMounted(() => {
  dashboard.fetchAll()
})
</script>

<style scoped>
.dashboard-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.chart-card {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.chart-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-4);
}

/* Bar Chart */
.chart-placeholder {
  height: 200px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  gap: var(--space-2);
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
}

.bar {
  width: 100%;
  max-width: 40px;
  background: var(--color-primary);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: height 0.3s ease;
}

.bar-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  margin-top: var(--space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Recommendations */
.recommendations-section {
  margin-bottom: var(--space-6);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-4);
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

.recommendation-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.recommendation-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.rec-type-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.type-article { background: var(--color-surface-muted); color: var(--color-text-muted); }
.type-video { background: var(--color-danger-50); color: var(--color-danger-700); }
.type-podcast { background: var(--color-success-50); color: var(--color-success-700); }

.rec-content {
  flex: 1;
  min-width: 0;
}

.rec-content h4 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-summary {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: var(--space-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rec-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.rec-source {
  font-weight: 600;
}

.rec-vocab {
  color: var(--color-text-muted);
}

.rec-empty {
  text-align: center;
  padding: var(--space-4);
  color: var(--color-text-muted);
}

/* Daily Goal */
.daily-goal-section {
  margin-bottom: var(--space-6);
}

.daily-goal-card {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .dashboard-page { padding: var(--space-3); }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
  .daily-goal-card { padding: var(--space-3); }
}
</style>
