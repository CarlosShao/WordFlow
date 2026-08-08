const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface RequestConfig {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
}

class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('wordflow-auth-token')
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, BASE_URL || window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, params } = config

  const token = getToken()
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`
  }

  const url = buildUrl(path, params)

  try {
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 401) {
      localStorage.removeItem('wordflow-auth-token')
      localStorage.removeItem('wordflow-auth-user')
      window.location.href = '/login'
      throw new HttpError('Unauthorized', 401)
    }

    const data = await response.json()

    if (!response.ok) {
      throw new HttpError(data.error || `HTTP ${response.status}`, response.status)
    }

    return data as T
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(error instanceof Error ? error.message : 'Network error', 0)
  }
}

export const http = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}

export { HttpError }
