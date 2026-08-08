# 认证模块（Auth Module）

用户认证与授权：本地注册/登录（邮箱+密码）、JWT 令牌管理、GitHub OAuth 登录。

## 职责

- 用户注册（bcrypt 密码哈希）
- 用户登录（密码校验 + JWT 签发）
- Access Token（15 分钟）+ Refresh Token（7 天，DB + Redis 白名单）
- Refresh Token 轮换（每次刷新后旧 token 失效）
- GitHub OAuth 授权码登录（自动创建/绑定用户）
- `authenticate` 中间件（Bearer <REDACTED> 解析注入 `request.user`）

## 路由

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/v1/auth/register | 注册（邮箱 + 密码） |
| POST | /api/v1/auth/login | 登录（签发 JWT） |
| POST | /api/v1/auth/refresh | 刷新 access token |
| POST | /api/v1/auth/logout | 撤销 refresh token |
| GET | /api/v1/auth/github | 跳转 GitHub 授权页 |
| GET | /api/v1/auth/github/callback | GitHub 回调处理 |

## Token 策略

- **Access Token**: JWT，有效期 15 分钟，存内存/客户端
- **Refresh Token**: 随机 48 字节 hex，存 PostgreSQL + Redis 白名单（TTL 7 天）
- **轮换**: 每次刷新后旧 refresh token 立即失效（expiresAt 设为当前时间），新 token 签发

## 响应格式

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "username": "...", "avatarUrl": "...", "githubId": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "a1b2c3..."
  }
}
```

## 契约

- 密码最少 6 位
- 邮箱格式校验（Zod）
- 注册时邮箱唯一性校验
- GitHub 登录自动绑定（同一 githubId 或同一 email）
- 所有 `/api/v1/auth/*` 接口（除 authenticate 中间件保护的路由）均无需认证
