import { describe, it, expect } from 'vitest'
import { AppError, ErrorType, errorHandler } from '../common/errors.js'

describe('AppError', () => {
  it('创建时应正确设置所有字段', () => {
    const error = new AppError('NOT_FOUND', '资源不存在', 404, { id: '123' })
    expect(error.type).toBe('NOT_FOUND')
    expect(error.message).toBe('资源不存在')
    expect(error.statusCode).toBe(404)
    expect(error.details).toEqual({ id: '123' })
    expect(error.name).toBe('AppError')
  })

  it('details 可选，不提供时为 undefined', () => {
    const error = new AppError('AUTH_ERROR', '未登录', 401)
    expect(error.details).toBeUndefined()
  })

  it('继承自 Error 类', () => {
    const error = new AppError('INTERNAL', '错误', 500)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })
})

describe('errorHandler', () => {
  it('AppError 返回对应状态码和格式', async () => {
    const error = new AppError('NOT_FOUND', '内容不存在', 404)
    const reply = {
      status: (code: number) => ({ send: (body: unknown) => ({ code, body }) }),
    } as any

    const result = await errorHandler(error, {} as any, reply)
    expect(result.code).toBe(404)
    expect(result.body).toEqual({
      success: false,
      error: { type: 'NOT_FOUND', message: '内容不存在' },
    })
  })

  it('AppError 带 details 时返回 details', async () => {
    const error = new AppError('VALIDATION', '参数错误', 400, { field: 'email' })
    const reply = {
      status: (code: number) => ({ send: (body: unknown) => ({ code, body }) }),
    } as any

    const result = await errorHandler(error, {} as any, reply)
    expect(result.body.error.details).toEqual({ field: 'email' })
  })

  it('未知错误返回 500 INTERNAL_ERROR', async () => {
    const error = new Error('Unexpected')
    const reply = {
      status: (code: number) => ({ send: (body: unknown) => ({ code, body }) }),
    } as any

    const result = await errorHandler(error, {} as any, reply)
    expect(result.code).toBe(500)
    expect(result.body).toEqual({
      success: false,
      error: { type: 'INTERNAL_ERROR', message: 'Internal server error' },
    })
  })
})

describe('ErrorType constants', () => {
  it('包含所有错误类型', () => {
    expect(ErrorType.VALIDATION).toBe('VALIDATION_ERROR')
    expect(ErrorType.AUTH).toBe('AUTH_ERROR')
    expect(ErrorType.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorType.CONFLICT).toBe('CONFLICT')
    expect(ErrorType.INTERNAL).toBe('INTERNAL_ERROR')
    expect(ErrorType.EXTERNAL).toBe('EXTERNAL_ERROR')
  })
})
