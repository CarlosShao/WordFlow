<template>
  <div class="callback-page">
    <div class="callback-card">
      <LoadingSpinner v-if="processing" size="lg" />
      <div v-if="error" class="callback-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <h2 class="error-title">登录失败</h2>
        <p class="error-message">{{ error }}</p>
        <BaseButton @click="goToLogin">返回登录</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LoadingSpinner, BaseButton } from '../components'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const processing = ref(true)
const error = ref('')

onMounted(() => {
  const token = route.query.token as string | undefined
  const errorParam = route.query.error as string | undefined

  if (errorParam) {
    error.value = errorParam
    processing.value = false
    return
  }

  if (!token) {
    error.value = '未获取到认证信息'
    processing.value = false
    return
  }

  auth.handleOAuthCallback(token)
  router.push('/dashboard')
})

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--color-background);
}

.callback-card {
  text-align: center;
  padding: var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.callback-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.callback-error svg {
  color: var(--color-danger-600);
}

.error-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text);
}

.error-message {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}
</style>
