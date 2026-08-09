import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import { getPrisma } from '../../common/prisma.js'
import { getRedis } from '../../common/redis.js'
import { AppError, ErrorType } from '../../common/errors.js'
import { config } from '../../config/index.js'

type Pwd = string

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface UserDTO {
  id: string
  email: string
  username: string | null
  avatarUrl: string | null
  githubId: string | null
}

export interface AuthResponse {
  user: UserDTO
  accessToken: string
  refreshToken: string
}

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ id: userId, email }, config.jwt.secret, {
    expiresIn: config.jwt.accessTtl,
  } satisfies jwt.SignOptions)
}

function toUserDTO(user: {
  id: string
  email: string
  username: string | null
  avatarUrl: string | null
  githubId: string | null
}): UserDTO {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    githubId: user.githubId,
  }
}

function generateRefreshToken(): string {
  return randomBytes(48).toString('hex')
}

export async function registerUser(email: string, pwd: any, username?: string): Promise<AuthResponse> {
  const prisma = getPrisma()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError(ErrorType.CONFLICT, '该邮箱已被注册', 409)
  }

  const hashedPassword = await bcrypt.hash(pwd, 12)

  const data: Record<string, unknown> = { email, username: username ?? null }
  data['password'] = hashedPassword
  const user = await prisma.user.create({ data })

  const accessToken = signAccessToken(user.id, user.email)
  const refreshToken = await createRefreshToken(user.id)

  return { user: toUserDTO(user), accessToken, refreshToken }
}

export async function loginUser(email: string, pwd: any): Promise<AuthResponse> {
  const prisma = getPrisma()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) {
    throw new AppError(ErrorType.AUTH, '邮箱或密码错误', 401)
  }

  const isValid = await bcrypt.compare(pwd, user.password)
  if (!isValid) {
    throw new AppError(ErrorType.AUTH, '邮箱或密码错误', 401)
  }

  const accessToken = signAccessToken(user.id, user.email)
  const refreshToken = await createRefreshToken(user.id)

  return { user: toUserDTO(user), accessToken, refreshToken }
}

export async function refreshTokens(token: string): Promise<TokenPair> {
  const prisma = getPrisma()
  const redis = getRedis()

  const whitelisted = await redis.get(`whitelist:refresh:${token}`)
  if (!whitelisted) {
    throw new AppError(ErrorType.AUTH, '无效的 refresh token', 401)
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(ErrorType.AUTH, 'refresh token 已过期', 401)
  }

  // Token rotation: delete old token from both PostgreSQL and Redis
  await prisma.refreshToken.delete({ where: { id: stored.id } })
  await redis.del(`whitelist:refresh:${token}`)

  const accessToken = signAccessToken(stored.user.id, stored.user.email)
  const newRefreshToken = await createRefreshToken(stored.user.id)

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logoutUser(token: string): Promise<void> {
  const prisma = getPrisma()
  const redis = getRedis()

  await prisma.refreshToken.deleteMany({ where: { token } })
  await redis.del(`whitelist:refresh:${token}`)
}

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAIL_URL = 'https://api.github.com/user/emails'

export async function getGitHubAuthUrl(): Promise<string> {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.github.callbackUrl,
    scope: 'read:user user:email',
  })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

export async function handleGitHubCallback(code: string): Promise<AuthResponse> {
  const prisma = getPrisma()

  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    }),
  })

  if (!tokenRes.ok) {
    throw new AppError(ErrorType.EXTERNAL, 'GitHub 授权失败', 401)
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    throw new AppError(ErrorType.EXTERNAL, 'GitHub 未返回 access_token', 401)
  }

  const githubToken = tokenData.access_token

  const userRes = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/json',
      'User-Agent': 'WordFlow',
    },
  })

  if (!userRes.ok) {
    throw new AppError(ErrorType.EXTERNAL, '获取 GitHub 用户信息失败', 401)
  }

  const githubUser = (await userRes.json()) as {
    id: number
    login: string
    name?: string
    avatar_url?: string
    email?: string
  }

  let email = githubUser.email
  if (!email) {
    const emailRes = await fetch(GITHUB_EMAIL_URL, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/json',
        'User-Agent': 'WordFlow',
      },
    })
    if (emailRes.ok) {
      const emails = (await emailRes.json()) as Array<{
        email: string
        primary: boolean
        verified: boolean
      }>
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email
    }
  }

  if (!email) {
    throw new AppError(ErrorType.EXTERNAL, '无法获取 GitHub 邮箱', 401)
  }

  const githubId = String(githubUser.id)

  let user = await prisma.user.findFirst({
    where: { OR: [{ githubId }, { email }] },
  })

  if (user) {
    if (!user.githubId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubId, avatarUrl: user.avatarUrl ?? githubUser.avatar_url ?? null },
      })
    }
  } else {
    const createData: Record<string, unknown> = {
      email,
      username: githubUser.name ?? githubUser.login,
      githubId,
      avatarUrl: githubUser.avatar_url ?? null,
    }
    createData['password'] = <REDACTED>
    user = await prisma.user.create({ data: createData })
  }

  const accessToken = signAccessToken(user.id, user.email)
  const refreshToken = await createRefreshToken(user.id)

  return { user: toUserDTO(user), accessToken, refreshToken }
}

async function createRefreshToken(userId: string): Promise<string> {
  const prisma = getPrisma()
  const redis = getRedis()

  const token = generateRefreshToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  })

  await redis.set(`whitelist:refresh:${token}`, userId, 'EX', 7 * 24 * 60 * 60)

  return token
}
