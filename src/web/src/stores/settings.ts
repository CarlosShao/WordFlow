import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '../api/client'

const STORAGE_KEY = 'wordflow_api_config'

export interface ApiConfig {
  apiBaseUrl: string
  apiKey: string
  model: string
}

function loadConfig(): ApiConfig | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

function getDefaultConfig(): ApiConfig {
  return {
    apiBaseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const stored = loadConfig()

  const apiBaseUrl = ref<string>(stored?.apiBaseUrl ?? getDefaultConfig().apiBaseUrl)
  const apiKey = ref<string>(stored?.apiKey ?? '')
  const model = ref<string>(stored?.model ?? getDefaultConfig().model)
  const useCustomKey = ref<boolean>(!!stored?.apiKey)

  const hasCustomKey = computed(() => useCustomKey.value && apiKey.value.trim().length > 0)

  const effectiveApiConfig = computed(() => {
    if (hasCustomKey.value) {
      return {
        apiBaseUrl: apiBaseUrl.value,
        apiKey: apiKey.value,
        model: model.value,
        isCustom: true,
      }
    }
    return {
      apiBaseUrl: getDefaultConfig().apiBaseUrl,
      apiKey: '',
      model: getDefaultConfig().model,
      isCustom: false,
    }
  })

  function saveApiConfig(config?: Partial<ApiConfig>) {
    if (config) {
      if (config.apiBaseUrl !== undefined) apiBaseUrl.value = config.apiBaseUrl
      if (config.apiKey !== undefined) apiKey.value = config.apiKey
      if (config.model !== undefined) model.value = config.model
    }

    const toSave: ApiConfig = {
      apiBaseUrl: apiBaseUrl.value,
      apiKey: apiKey.value,
      model: model.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    useCustomKey.value = apiKey.value.trim().length > 0
  }

  function clearApiConfig() {
    localStorage.removeItem(STORAGE_KEY)
    apiKey.value = ''
    apiBaseUrl.value = getDefaultConfig().apiBaseUrl
    model.value = getDefaultConfig().model
    useCustomKey.value = false
  }

  async function testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const headers: Record<string, string> = {}
      if (apiKey.value.trim()) {
        headers['X-Custom-API-Key'] = apiKey.value.trim()
      }
      if (apiBaseUrl.value.trim()) {
        headers['X-Custom-Base-URL'] = apiBaseUrl.value.trim()
      }
      if (model.value.trim()) {
        headers['X-Custom-Model'] = model.value.trim()
      }

      const data = await client.post('/api/v1/ai/test-connection', {}, { headers }) as unknown as { message: string }
      return { success: true, message: data.message || '连接成功' }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '连接测试失败'
      return { success: false, message: msg }
    }
  }

  return {
    apiBaseUrl,
    apiKey,
    model,
    useCustomKey,
    hasCustomKey,
    effectiveApiConfig,
    saveApiConfig,
    clearApiConfig,
    testConnection,
  }
})
