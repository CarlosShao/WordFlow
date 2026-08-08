import { ref } from 'vue'

export type ThemeStyle = 'minimalist' | 'vercel' | 'apple' | 'golden-time' | 'vibe-camp' | 'barbie' | 'google'

const STORAGE_KEY = 'english-learner-theme-style'

const themeStyle = ref<ThemeStyle>('minimalist')

export function useTheme() {
  function setTheme(style: ThemeStyle) {
    themeStyle.value = style
    const html = document.documentElement
    if (style === 'minimalist') {
      html.removeAttribute('data-theme')
    } else {
      html.setAttribute('data-theme', style)
    }
    localStorage.setItem(STORAGE_KEY, style)
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeStyle | null
    if (saved) {
      setTheme(saved)
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
