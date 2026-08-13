import { ref } from 'vue'
import { authApi } from '../api/auth'
import { getAccessToken } from '../api/client'

export type ThemeStyle = 'minimalist' | 'vercel' | 'apple' | 'golden-time' | 'vibe-camp' | 'barbie' | 'google'

const STORAGE_KEY = 'english-learner-theme-style'

const themeStyle = ref<ThemeStyle>('minimalist')

function applyStyle(style: ThemeStyle) {
  const html = document.documentElement
  if (style === 'minimalist') {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', style)
  }
}

export function useTheme() {
  function setTheme(style: ThemeStyle) {
    themeStyle.value = style
    applyStyle(style)
    localStorage.setItem(STORAGE_KEY, style)
    // Persist to backend if authenticated (fire-and-forget)
    if (getAccessToken()) {
      authApi.updateSettings({ theme: style }).catch(() => {})
    }
  }

  function initTheme() {
    // 1. Apply any locally cached theme immediately (avoid flash)
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeStyle | null
    if (saved) {
      themeStyle.value = saved
      applyStyle(saved)
    }
    // 2. If authenticated, load server-persisted theme (authoritative) and override
    if (getAccessToken()) {
      authApi.getSettings().then((settings: Record<string, unknown>) => {
        const serverTheme = settings.theme as ThemeStyle | undefined
        if (serverTheme && serverTheme !== themeStyle.value) {
          themeStyle.value = serverTheme
          applyStyle(serverTheme)
          localStorage.setItem(STORAGE_KEY, serverTheme)
        }
      }).catch(() => {})
    }
  }

  return {
    themeStyle,
    setTheme,
    initTheme
  }
}

// Auto-initialize on import — apply theme immediately to prevent flash
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeStyle | null
  if (saved && saved !== 'minimalist') {
    // Apply immediately
    document.documentElement.setAttribute('data-theme', saved)
    // Also apply after DOMContentLoaded to override any late setters
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.setAttribute('data-theme', saved)
      })
    }
    // Also apply after a short delay to override any late setters
    setTimeout(() => {
      document.documentElement.setAttribute('data-theme', saved)
    }, 100)
  }
}