import type { FastifyReply, FastifyRequest } from 'fastify'

export const ErrorType = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
  EXTERNAL: 'EXTERNAL_ERROR',
} as const

export class AppError extends Error {
  constructor(
    public type: string,
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export async function errorHandler(
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        type: error.type,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    })
  }

  // Unexpected error
  return reply.status(500).send({
    success: false,
    error: {
      type: ErrorType.INTERNAL,
      message: 'Internal server error',
    },
  })
}
