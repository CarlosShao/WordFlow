import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('wordflow-uploads'),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:3000/api/v1/auth/github/callback'),

  AI_API_BASE_URL: z.string().default('https://api.deepseek.com/v1'),
  AI_API_KEY: z.string(),
  AI_MODEL: z.string().default('deepseek-chat'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  YOUTUBE_API_KEY: z.string().optional(),
  TWITTER_BEARER_TOKEN: z.string().optional(),

  // Raw Bilibili cookie string (key=value; ...) used to unlock CC subtitles
  // and higher-quality streams via yt-dlp.
  BILIBILI_COOKIE: z.string().optional(),

  // 词典爬取配置
  DICT_CRAWL_ENABLED: z.coerce.boolean().default(true),
  DICT_CRAWL_CRON: z.string().default('0 3 * * *'), // 默认每天 3:00
  DICT_CRAWL_DAILY_LIMIT: z.coerce.number().default(1000), // 每日上限
  DICT_CRAWL_DELAY_MS: z.coerce.number().default(1200), // 单词间间隔
  DICT_CRAWL_BATCH_SIZE: z.coerce.number().default(50), // 每批词数
  DICT_CRAWL_BATCH_REST_MS: z.coerce.number().default(30000), // 批间休息
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ 环境变量配置错误:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  apiVersion: parsed.data.API_VERSION,
  apiPrefix: `/api/${parsed.data.API_VERSION}`,

  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,

  minio: {
    endpoint: parsed.data.MINIO_ENDPOINT,
    port: parsed.data.MINIO_PORT,
    useSSL: parsed.data.MINIO_USE_SSL,
    accessKey: parsed.data.MINIO_ACCESS_KEY,
    secretKey: parsed.data.MINIO_SECRET_KEY,
    bucket: parsed.data.MINIO_BUCKET,
  },

  jwt: {
    secret: parsed.data.JWT_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessTtl: parsed.data.JWT_ACCESS_TTL,
    refreshTtl: parsed.data.JWT_REFRESH_TTL,
  },

  github: {
    clientId: parsed.data.GITHUB_CLIENT_ID,
    clientSecret: parsed.data.GITHUB_CLIENT_SECRET,
    callbackUrl: parsed.data.GITHUB_CALLBACK_URL,
  },

  ai: {
    apiBaseUrl: parsed.data.AI_API_BASE_URL,
    apiKey: parsed.data.AI_API_KEY,
    model: parsed.data.AI_MODEL,
  },

  corsOrigin: parsed.data.CORS_ORIGIN,

  youtubeApiKey: parsed.data.YOUTUBE_API_KEY,
  twitterBearerToken: parsed.data.TWITTER_BEARER_TOKEN,
  bilibiliCookie: parsed.data.BILIBILI_COOKIE,

  dictionaryCrawl: {
    enabled: parsed.data.DICT_CRAWL_ENABLED,
    cron: parsed.data.DICT_CRAWL_CRON,
    dailyLimit: parsed.data.DICT_CRAWL_DAILY_LIMIT,
    delayMs: parsed.data.DICT_CRAWL_DELAY_MS,
    batchSize: parsed.data.DICT_CRAWL_BATCH_SIZE,
    batchRestMs: parsed.data.DICT_CRAWL_BATCH_REST_MS,
  },
}
