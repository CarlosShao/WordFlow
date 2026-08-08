<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">欢迎回来</h1>
          <p class="auth-subtitle">登录你的账号继续学习</p>
        </div>

        <form class="auth-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label" for="email">邮箱</label>
            <BaseInput
              id="email"
              v-model="form.email"
              type="email"
              placeholder="请输入邮箱"
              :disabled="loading"
            />
            <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">密码</label>
            <BaseInput
              id="password"
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :disabled="loading"
            />
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>

          <BaseButton type="submit" class="auth-submit" :loading="loading">
            登录
          </BaseButton>
        </form>

        <div class="auth-divider">
          <span class="divider-line"></span>
          <span class="divider-text">或</span>
          <span class="divider-line"></span>
        </div>

        <a :href="githubUrl" class="github-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span>使用 GitHub 登录</span>
        </a>

        <p class="auth-footer">
          还没有账号？
          <router-link to="/register" class="auth-link">立即注册</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { BaseInput, BaseButton } from '../components'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../api/auth'
import { useToast } from '../composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const form = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

const loading = ref(false)

const githubUrl = authApi.getGithubOAuthUrl()

function validate(): boolean {
  let valid = true
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = '请输入邮箱'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = '请输入有效的邮箱地址'
    valid = false
  }

  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (form.password.length < 6) {
    errors.password = '密码至少需要 6 个字符'
    valid = false
  }

  return valid
}

async function handleLogin() {
  if (!validate()) return

  loading.value = true
  const result = await auth.login(form.email, form.password)
  loading.value = false

  if (result.success) {
    toast.success('登录成功')
    router.push('/dashboard')
  } else {
    toast.error(result.error || '登录失败')
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--color-background);
}

.auth-container {
  width: 100%;
  max-width: 400px;
}

.auth-card {
  padding: var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.auth-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--page-title-weight);
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.auth-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
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

.form-error {
  font-size: var(--font-size-xs);
  color: var(--color-danger-600);
}

.auth-submit {
  width: 100%;
  margin-top: var(--space-2);
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-5) 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.divider-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.github-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-base);
  font-weight: var(--btn-font-weight);
  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--btn-radius);
  cursor: pointer;
  transition: all 0.16s ease;
  text-decoration: none;
}

.github-btn:hover {
  background: var(--color-surface-subtle);
  border-color: var(--color-border-strong);
}

.auth-footer {
  text-align: center;
  margin-top: var(--space-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.auth-link {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}
</style>
