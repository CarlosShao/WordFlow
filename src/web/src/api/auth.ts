import client from './client'
import type { UserProfile } from '../types'

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: UserProfile
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResult> {
    const data = await client.post('/api/v1/auth/login', { email, password })
    return data as unknown as AuthResult
  },

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    const data = await client.post('/api/v1/auth/register', { username, email, password })
    return data as unknown as AuthResult
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const data = await client.post('/api/v1/auth/refresh', { refreshToken })
    return data as unknown as { accessToken: string; refreshToken: string }
  },

  async logout(): Promise<void> {
    await client.post('/api/v1/auth/logout')
  },

  async getProfile(): Promise<UserProfile> {
    const data = await client.get('/api/v1/auth/profile')
    return data as unknown as UserProfile
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const data = await client.put('/api/v1/auth/profile', profileData)
    return data as unknown as UserProfile
  },

  getGithubOAuthUrl(): string {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/v1/auth/github`
  },
}
