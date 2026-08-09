import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

const ACCESS_TOKEN_KEY = 'wordflow-access-token'
const REFRESH_TOKEN_KEY = 'wordflow-refresh-token'

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem('wordflow-auth-token')
  localStorage.removeItem('wordflow-auth-user')
}

// Track refresh promise to prevent multiple simultaneous refreshes
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

// ── Create Axios Instance ──────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor ────────────────────────────────────────────────

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor ───────────────────────────────────────────────

client.interceptors.response.use(
  (response: AxiosResponse) => {
    // Unwrap the backend envelope: { success, data, error, meta }
    const body = response.data
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) {
        // Return data directly for backward compatibility
        return body.data as never
      } else {
        const errMsg = body.error?.message || body.error || 'Request failed'
        return Promise.reject(new Error(errMsg))
      }
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Handle 401 with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (!isRefreshing) {
        isRefreshing = true

        try {
          const refreshToken = getRefreshToken()
          if (!refreshToken) {
            clearTokens()
            window.location.href = '/login'
            return Promise.reject(error)
          }

          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/v1/auth/refresh`,
            { refreshToken }
          )

          const { accessToken, refreshToken: newRefreshToken } = res.data.data || res.data
          if (accessToken) {
            setTokens(accessToken, newRefreshToken || refreshToken)
            onRefreshed(accessToken)

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`
            }
            return client(originalRequest)
          }

          throw new Error('No access token in refresh response')
        } catch (refreshError) {
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // If already refreshing, queue the request
      return new Promise((resolve) => {
        addRefreshSubscriber((token: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          resolve(client(originalRequest))
        })
      })
    }

    // Non-401 errors: extract message
    const message = error.response?.data?.error?.message
      || error.response?.data?.error
      || error.message
      || 'Network error'

    return Promise.reject(new Error(message))
  }
)

export { client, getAccessToken, getRefreshToken, setTokens, clearTokens }
export default client
