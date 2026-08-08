import { describe, it, expect } from 'vitest'
import { calculateSm2 } from '../modules/vocabulary/index.js'

describe('SM-2 Algorithm', () => {
  it('初始状态 + quality 5 → interval=1, repetitions=1', () => {
    const result = calculateSm2(2.5, 0, 0, 5)
    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(1)
    // efactor = 2.5 + (0.1 - 0) = 2.6
    expect(result.efactor).toBeCloseTo(2.6, 1)
  })

  it('第二次复习 quality 5 → interval=3, repetitions=2', () => {
    const result = calculateSm2(2.6, 1, 1, 5)
    expect(result.repetitions).toBe(2)
    expect(result.interval).toBe(3)
  })

  it('第三次复习 quality 5 → interval=round(3 * efactor)', () => {
    const result = calculateSm2(2.7, 3, 2, 5)
    expect(result.repetitions).toBe(3)
    expect(result.interval).toBe(Math.round(3 * 2.7)) // 8
  })

  it('复习失败 quality < 3 → interval 重置为 1，repetitions 重置为 0', () => {
    const result = calculateSm2(2.5, 10, 5, 1)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
  })

  it('efactor 最低不低于 1.3', () => {
    let efactor = 2.5
    for (let i = 0; i < 10; i++) {
      const result = calculateSm2(efactor, 1, 1, 0)
      efactor = result.efactor
    }
    expect(efactor).toBeGreaterThanOrEqual(1.3)
  })

  it('quality=4 → efactor 减少', () => {
    const result = calculateSm2(2.5, 1, 1, 4)
    // efactor = 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02)) = 2.5 - 0.1 = 2.4
    expect(result.efactor).toBeCloseTo(2.4, 0)
  })

  it('连续答对 4 次 + interval >= 14 → MASTERED 条件触发', () => {
    let state = { efactor: 2.5, interval: 0, repetitions: 0 }
    for (let i = 0; i < 5; i++) {
      state = calculateSm2(state.efactor, state.interval, state.repetitions, 5)
    }
    // repetitions >= 4 且 interval >= 14 应该成立
    expect(state.repetitions).toBeGreaterThanOrEqual(4)
    expect(state.interval).toBeGreaterThanOrEqual(14)
  })
})
