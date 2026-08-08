import type { ApiResponse, UserProfile } from '../types'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

// Mock user database
const mockUsers: Array<{ email: string; password: string; user: UserProfile }> = []

const generateId = () => `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const createMockUser = (username: string, email: string): UserProfile => ({
  id: generateId(),
  username,
  email,
  avatar: undefined,
  level: 'B1',
  joinDate: new Date().toISOString(),
  streak: 0,
  totalWords: 0,
  totalReadingMinutes: 0,
  totalListeningMinutes: 0,
})

const generateToken = () => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: generateId(), iat: Date.now() }))}.signature`

export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    await delay(500)

    const existing = mockUsers.find(u => u.email === email && u.password === password)
    if (existing) {
      return {
        success: true,
        data: { token: generateToken(), user: existing.user }
      }
    }

    return {
      success: false,
      data: null as never,
      error: '邮箱或密码错误'
    }
  },

  async register(username: string, email: string, password: string): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    await delay(500)

    if (mockUsers.find(u => u.email === email)) {
      return {
        success: false,
        data: null as never,
        error: '该邮箱已被注册'
      }
    }

    const user = createMockUser(username, email)
    const token = generateToken()
    mockUsers.push({ email, password, user })

    return {
      success: true,
      data: { token, user }
    }
  },

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    await delay(300)

    // Return a mock profile with some stats
    return {
      success: true,
      data: {
        id: generateId(),
        username: '学习达人',
        avatar: undefined,
        level: 'B2',
        joinDate: '2024-01-15T00:00:00.000Z',
        streak: 7,
        totalWords: 1250,
        totalReadingMinutes: 360,
        totalListeningMinutes: 180,
      }
    }
  },

  async updateProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    await delay(300)

    const current = await this.getProfile()
    if (current.success && current.data) {
      return {
        success: true,
        data: { ...current.data, ...data }
      }
    }
    return current
  },

  async logout(): Promise<ApiResponse<null>> {
    await delay(200)
    return { success: true, data: null }
  },

  getGithubOAuthUrl(): string {
    return '/api/v1/auth/github'
  },
}
