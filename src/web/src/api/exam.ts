import client from './client'

export type BookDataSource = 'LEGACY' | 'CURATED'

export interface DataSourceOption {
  dataSource: BookDataSource
  label: string
  bookCount: number
}

export interface ExamBook {
  id: string
  category: 'TOEFL' | 'IELTS' | 'GRE' | 'CET4' | 'CET6' | 'KAOYAN'
  dataSource: BookDataSource
  title: string
  sectionCount: number
  questionCount: number
}

export interface ExamSection {
  id: string
  type: string
  title: string
  bookOrder: number
  audioUrl: string | null
  content: string | null
  questionCount: number
}

export interface ExamQuestion {
  id: string
  type: string
  stem: string
  options: string[] | null
  answer: string[]
  explanation: string | null
  order: number
}

export const DATA_SOURCE_LABELS: Record<BookDataSource, string> = {
  LEGACY: '网盘筛选',
  CURATED: '精选题库',
}

export const examApi = {
  async listBooks(
    category?: string,
    dataSource?: BookDataSource,
  ): Promise<ExamBook[]> {
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (dataSource) params.dataSource = dataSource
    const data = await client.get('/api/v1/exam/books', { params })
    return (data as unknown as { data?: ExamBook[] })?.data ?? (data as unknown as ExamBook[])
  },

  async listDataSources(): Promise<DataSourceOption[]> {
    const data = await client.get('/api/v1/exam/data-sources')
    return (data as unknown as { data?: DataSourceOption[] })?.data ?? (data as unknown as DataSourceOption[])
  },

  async getBook(id: string): Promise<{ id: string; title: string; category: string; sections: ExamSection[] }> {
    const data = await client.get(`/api/v1/exam/books/${id}`)
    // client 响应拦截器已经解包 { success: true, data }，但保留双重写法做兼容
    const unpacked = data as unknown as {
      data?: { id: string; title: string; category: string; sections: ExamSection[] }
      id?: string; sections?: ExamSection[]
    }
    return unpacked.data ?? (unpacked as { id: string; title: string; category: string; sections: ExamSection[] })
  },

  async getQuestions(contentId: string): Promise<{ content: ExamSection; questions: ExamQuestion[] }> {
    const data = await client.get(`/api/v1/exam/content/${contentId}/questions`)
    const unpacked = data as unknown as {
      data?: { content: ExamSection; questions: ExamQuestion[] }
      content?: ExamSection; questions?: ExamQuestion[]
    }
    return unpacked.data ?? (unpacked as { content: ExamSection; questions: ExamQuestion[] })
  },
}
