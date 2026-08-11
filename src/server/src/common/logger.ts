import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // pino-pretty 通过子进程处理日志，在 tsx watch / 管道 / 非 TTY 环境下会崩溃，
  // 导致每个日志 emit 抛错、所有请求返回 500。仅在真实 TTY（交互终端）时启用彩色输出。
  transport:
    process.env.NODE_ENV === 'development' && process.stdout.isTTY
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})
