import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile } from '../types'
import { authApi } from '../api/auth'

const TOKEN_KEY = 'wordflow-auth-token'
const USER_KEY = 'wordflow-auth-user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<UserProfile | null>(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setAuth(newToken: string, newUser: UserProfile) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    try {
      const res = await authApi.login(email, password)
      if (res.success && res.data) {
        setAuth(res.data.token, res.data.user)
        return { success: true }
      }
      return { success: false, error: res.error || '登录失败' }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '网络错误' }
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    try {
      const res = await authApi.register(username, email, password)
      if (res.success && res.data) {
        setAuth(res.data.token, res.data.user)
        return { success: true }
      }
      return { success: false, error: res.error || '注册失败' }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '网络错误' }
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile(): Promise<void> {
    if (!token.value) return
    try {
      const res = await authApi.getProfile()
      if (res.success && res.data) {
        user.value = res.data
        localStorage.setItem(USER_KEY, JSON.stringify(res.data))
      }
    } catch {
      // silently fail
    }
  }

  async function updateProfile(data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await authApi.updateProfile(data)
      if (res.success && res.data) {
        user.value = res.data
        localStorage.setItem(USER_KEY, JSON.stringify(res.data))
        return { success: true }
      }
      return { success: false, error: res.error || '更新失败' }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '网络错误' }
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
    }
  }

  function handleOAuthCallback(urlToken: string) {
    // For OAuth, we store the token and fetch user profile
    token.value = urlToken
    localStorage.setItem(TOKEN_KEY, urlToken)
    fetchProfile()
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    login,
    register,
    fetchProfile,
    updateProfile,
    logout,
    handleOAuthCallback,
    clearAuth,
  }
})
