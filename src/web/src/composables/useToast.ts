import { reactive } from 'vue'

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

let toastId = 0

const toasts = reactive<ToastItem[]>([])

function generateId(): string {
  return `toast-${++toastId}-${Date.now()}`
}

function addToast(message: string, type: ToastItem['type'], duration = 3000) {
  const id = generateId()
  const toast: ToastItem = { id, message, type, duration }
  toasts.push(toast)

  if (duration > 0) {
    setTimeout(() => {
      dismiss(id)
    }, duration)
  }
}

function dismiss(id: string) {
  const index = toasts.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.splice(index, 1)
  }
}

export function useToast() {
  return {
    toasts,
    success(message: string, duration?: number) {
      addToast(message, 'success', duration)
    },
    error(message: string, duration?: number) {
      addToast(message, 'error', duration)
    },
    warning(message: string, duration?: number) {
      addToast(message, 'warning', duration)
    },
    info(message: string, duration?: number) {
      addToast(message, 'info', duration)
    },
    dismiss
  }
}
