import { Redis } from 'ioredis'
import { logger } from '../common/logger.js'
import { config } from '../config/index.js'

let redis: Redis | undefined

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })
    redis.on('connect', () => logger.info('Redis connected'))
    redis.on('error', (err) => logger.error({ err }, 'Redis error'))
  }
  return redis
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = undefined
  }
}
