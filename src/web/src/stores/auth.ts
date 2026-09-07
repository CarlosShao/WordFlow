import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile } from '../types'
import { authApi } from '../api/auth'
import { getAccessToken, setTokens, clearTokens } from '../api/client'

const USER_KEY = 'wordflow-auth-user'

function hasToken(): boolean {
  return !!getAccessToken()
}

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
  // token 的响应式镜像：localStorage 非响应式，纯 computed 读 localStorage 会在
  // 首次求值后永久缓存（登录前为 false），导致登录后路由守卫仍判定未登录
  const accessToken = ref<string | null>(getAccessToken())

  const isAuthenticated = computed(() => !!accessToken.value)
  const initials = computed(() => {
    const name = user.value?.username || '?'
    return name.charAt(0).toUpperCase()
  })

  function setUser(newUser: UserProfile) {
    user.value = newUser
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }

  function persistTokens(access: string, refresh: string) {
    setTokens(access, refresh)
    accessToken.value = access || null
  }

  function clearAuth() {
    user.value = null
    error.value = null
    localStorage.removeItem(USER_KEY)
    clearTokens()
    accessToken.value = null
  }

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = null
    try {
      const result = await authApi.login(email, password)
      persistTokens(result.accessToken, result.refreshToken)
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
      persistTokens(result.accessToken, result.refreshToken)
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

  function handleOAuthCallback(token: string, refreshToken?: string) {
    // 参数改名避免遮蔽同名 ref；统一走 persistTokens 更新响应式 token
    persistTokens(token, refreshToken ?? '')
    // Fetch profile in background to populate user info; auth state is token-based
    fetchProfile()
  }

  // Initialize: fetch profile if a valid token exists
  function initialize() {
    if (hasToken()) {
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
