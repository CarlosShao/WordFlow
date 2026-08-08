<template>
  <div class="profile-page">
    <header class="page-header">
      <h1 class="page-title">个人中心</h1>
      <p class="page-subtitle">查看和管理你的账号信息</p>
    </header>

    <!-- User Info Card -->
    <section class="profile-card">
      <div class="profile-avatar-section">
        <div class="avatar-wrapper">
          <img v-if="user?.avatar" :src="user.avatar" :alt="user.username" class="avatar-image" />
          <div v-else class="avatar-placeholder">
            {{ initials }}
          </div>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ user?.username || '用户' }}</h2>
          <p class="profile-email">{{ user?.email || '-' }}</p>
          <p class="profile-joined">
            加入时间：{{ formatDate(user?.joinDate) }}
          </p>
        </div>
      </div>

      <!-- Edit Form -->
      <div class="edit-section">
        <h3 class="section-title">编辑资料</h3>
        <form class="edit-form" @submit.prevent="handleUpdateProfile">
          <div class="form-group">
            <label class="form-label">用户名</label>
            <BaseInput v-model="editForm.username" placeholder="输入新用户名" />
          </div>
          <div class="form-group">
            <label class="form-label">头像 URL</label>
            <BaseInput v-model="editForm.avatar" placeholder="输入头像图片地址" />
          </div>
          <BaseButton type="submit" :loading="updating">保存修改</BaseButton>
        </form>
      </div>
    </section>

    <!-- Learning Stats -->
    <section class="stats-card">
      <h3 class="section-title">学习统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ user?.totalWords || 0 }}</div>
          <div class="stat-label">总词汇量</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatMinutes(user?.totalReadingMinutes || 0) }}</div>
          <div class="stat-label">阅读时长</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatMinutes(user?.totalListeningMinutes || 0) }}</div>
          <div class="stat-label">听力时长</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ user?.streak || 0 }}天</div>
          <div class="stat-label">连续学习</div>
        </div>
      </div>
    </section>

    <!-- Logout -->
    <section class="logout-section">
      <BaseButton variant="danger" @click="handleLogout">退出登录</BaseButton>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BaseInput, BaseButton } from '../components'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import type { UserProfile } from '../types'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const user = computed(() => auth.user)

const initials = computed(() => {
  const name = user.value?.username || '?'
  return name.charAt(0).toUpperCase()
})

const editForm = reactive({
  username: '',
  avatar: '',
})

const updating = ref(false)

onMounted(async () => {
  if (auth.isAuthenticated) {
    await auth.fetchProfile()
    editForm.username = auth.user?.username || ''
    editForm.avatar = auth.user?.avatar || ''
  }
})

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

async function handleUpdateProfile() {
  if (!editForm.username.trim()) {
    toast.error('用户名不能为空')
    return
  }

  updating.value = true
  const result = await auth.updateProfile({
    username: editForm.username,
    avatar: editForm.avatar || undefined,
  } as Partial<UserProfile>)
  updating.value = false

  if (result.success) {
    toast.success('资料已更新')
  } else {
    toast.error(result.error || '更新失败')
  }
}

async function handleLogout() {
  await auth.logout()
  toast.info('已退出登录')
  router.push('/login')
}
</script>

<style scoped>
.profile-page {
  padding: var(--space-6);
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
}

.profile-avatar-section {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-3xl);
  font-weight: 600;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.profile-email {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.profile-joined {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.edit-section {
  padding-top: var(--space-5);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-3);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

.stats-card {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.stat-item {
  text-align: center;
  padding: var(--space-4);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text);
  line-height: var(--line-height-tight);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

.logout-section {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 480px) {
  .profile-avatar-section {
    flex-direction: column;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
