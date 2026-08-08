import { onMounted, onUnmounted } from 'vue'

type KeyName = 'Space' | 'ArrowLeft' | 'ArrowRight' | 'Escape' | 'Enter'

const keyMap: Record<string, string> = {
  Space: ' ',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Escape: 'Escape',
  Enter: 'Enter'
}

export function useKeyboard(shortcuts: Record<KeyName, () => void>) {
  function handleKeydown(event: KeyboardEvent) {
    for (const [key, handler] of Object.entries(shortcuts)) {
      const mappedKey = keyMap[key] ?? key
      if (event.key === mappedKey) {
        // Prevent default for Space and Arrow keys to avoid page scroll
        if (['Space', 'ArrowLeft', 'ArrowRight'].includes(key)) {
          event.preventDefault()
        }
        handler()
        return
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
