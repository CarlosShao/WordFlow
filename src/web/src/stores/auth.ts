import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile } from '../types'
import { authApi } from '../api/auth'
import { setTokens, clearTokens } from '../api/client'

const USER_KEY = 'wordflow-auth-user'

function loadUser(): UserProfile | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(loadUser())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const initials = computed(() => {
    const name = user.value?.username || '?'
    return name.charAt(0).toUpperCase()
  })

  function setUser(newUser: UserProfile) {
    user.value = newUser
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }

  function clearAuth() {
    user.value = null
    error.value = null
    localStorage.removeItem(USER_KEY)
    clearTokens()
  }

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = null
    try {
      const result = await authApi.login(email, password)
      setTokens(result.accessToken, result.refreshToken)
      setUser(result.user)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '登录失败'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = null
    try {
      const result = await authApi.register(username, email, password)
      setTokens(result.accessToken, result.refreshToken)
      setUser(result.user)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '注册失败'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile(): Promise<void> {
    try {
      const profile = await authApi.getProfile()
      setUser(profile)
    } catch {
      // silently fail - token might be expired
    }
  }

  async function updateProfile(data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const updated = await authApi.updateProfile(data)
      setUser(updated)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '更新失败'
      return { success: false, error: msg }
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // ignore server errors on logout
    } finally {
      clearAuth()
    }
  }

  function handleOAuthCallback(accessToken: string, refreshToken?: string) {
    if (refreshToken) {
      setTokens(accessToken, refreshToken)
    }
    fetchProfile()
  }

  // Initialize: fetch profile if user exists but tokens might be needed
  function initialize() {
    if (user.value) {
      fetchProfile()
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    initials,
    login,
    register,
    fetchProfile,
    updateProfile,
    logout,
    handleOAuthCallback,
    clearAuth,
    initialize,
  }
})
