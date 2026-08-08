import { vi } from 'vitest'

/**
 * 内存版 Prisma mock，用于单元测试（不依赖真实数据库）
 */
export function createMockPrisma() {
  const data: Record<string, any[]> = {
    vocabulary: [],
    content: [],
    practiceSession: [],
    mistake: [],
    userContentInteraction: [],
  }

  function makeModel(modelName: string) {
    const items = data[modelName]
    return {
      findMany: vi.fn(async (args: any = {}) => {
        let result = [...items]
        if (args.where) {
          result = result.filter((item) =>
            Object.entries(args.where).every(([key, value]: [string, any]) => {
              if (value?.contains) {
                return String(item[key]).toLowerCase().includes(value.contains.toLowerCase())
              }
              if (value?.lte) return item[key] <= value.lte
              if (value?.gte) return item[key] >= value.gte
              if (value?.in) return value.in.includes(item[key])
              return item[key] === value
            })
          )
        }
        if (args.orderBy) {
          const [field, dir] = Object.entries(args.orderBy)[0]
          result.sort((a, b) => (dir === 'asc' ? a[field] - b[field] : b[field] - a[field]))
        }
        if (args.skip) result = result.slice(args.skip)
        if (args.take) result = result.slice(0, args.take)
        return result
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return items.find((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value)
        ) || null
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return items.find((item) =>
          Object.entries(where).every(([key, value]: [string, any]) => {
            if (typeof value === 'object' && value !== null) {
              return Object.entries(value).every(([k, v]) => item[key]?.[k] === v)
            }
            return item[key] === value
          })
        ) || null
      }),
      create: vi.fn(async ({ data: input }: any) => {
        const item = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...input }
        items.push(item)
        return item
      }),
      update: vi.fn(async ({ where, data: input }: any) => {
        const idx = items.findIndex((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value)
        )
        if (idx === -1) return null
        items[idx] = { ...items[idx], ...input, updatedAt: new Date() }
        return items[idx]
      }),
      delete: vi.fn(async ({ where }: any) => {
        const idx = items.findIndex((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value)
        )
        if (idx !== -1) items.splice(idx, 1)
        return {}
      }),
      count: vi.fn(async ({ where = {} }: any = {}) => {
        return items.filter((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value)
        ).length
      }),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const existing = items.find((item) =>
          Object.entries(where).every(([key, value]: [string, any]) => {
            if (typeof value === 'object') {
              return Object.entries(value).every(([k, v]) => item[key]?.[k] === v)
            }
            return item[key] === value
          })
        )
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() })
          return existing
        }
        const item = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...create }
        items.push(item)
        return item
      }),
      aggregate: vi.fn(async () => ({ _sum: { correctCount: 0 } })),
    }
  }

  return {
    vocabulary: makeModel('vocabulary'),
    content: makeModel('content'),
    practiceSession: makeModel('practiceSession'),
    mistake: makeModel('mistake'),
    userContentInteraction: makeModel('userContentInteraction'),
    $disconnect: vi.fn(async () => {}),
    _data: data,
    _reset: () => {
      Object.keys(data).forEach((key) => (data[key] = []))
    },
  }
}

export type MockPrisma = ReturnType<typeof createMockPrisma>
