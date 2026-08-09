/**
 * AI Processing Service
 *
 * Core pipeline logic for processing crawled content:
 * 1. Extract vocabulary (LLM)
 * 2. Generate summary (LLM, if empty)
 * 3. Rate difficulty (LLM, if not set)
 * 4. Write vocabulary to public word bank (userId = system)
 */

import { getPrisma } from '../../common/prisma.js'
import { AppError } from '../../common/errors.js'
import { logger } from '../../common/logger.js'
import { extractVocabulary, generateSummary, rateDifficulty } from './llm.js'
import type { ProcessingResult, BatchProcessingResult, ExtractedVocabulary } from './types.js'

/**
 * System user ID for public vocabulary bank.
 * In production, this should reference a real "system" user record.
 */
const SYSTEM_USER_ID = 'system'

/**
 * Get the text content from a Content record for LLM processing.
 * For ARTICLE: use summary (which stores the raw text in our schema).
 * For VIDEO/PODCAST: use summary (transcript placeholder).
 */
function getContentText(content: { type: string; summary: string | null; title: string }): string {
  // In this schema, summary stores the raw crawled text for processing
  // For video/podcast, it would be the transcript
  return content.summary || content.title
}

/**
 * Process a single content item through the AI pipeline.
 *
 * Steps (serial):
 * 1. Extract vocabulary from content text
 * 2. Generate summary if not present
 * 3. Rate difficulty if not set
 * 4. Write extracted vocabulary to public word bank
 * 5. Mark content as processed
 */
export async function processContent(contentId: string): Promise<ProcessingResult> {
  const prisma = getPrisma()

  // Fetch content
  const content = await prisma.content.findUnique({
    where: { id: contentId },
  })

  if (!content) {
    throw new AppError('NOT_FOUND', '内容不存在', 404)
  }

  const contentText = getContentText(content)

  if (!contentText.trim()) {
    throw new AppError('VALIDATION', '内容为空，无法处理', 400)
  }

  // Step 1: Extract vocabulary
  logger.info({ contentId }, 'Step 1: Extracting vocabulary')
  const vocabItems = await extractVocabulary(contentText, content.title)

  // Step 2: Generate summary if not present
  let summaryGenerated = false
  if (!content.summary || content.summary.trim() === '' || content.summary === content.title) {
    logger.info({ contentId }, 'Step 2: Generating summary')
    try {
      const newSummary = await generateSummary(contentText, content.title)
      if (newSummary) {
        await prisma.content.update({
          where: { id: contentId },
          data: { summary: newSummary },
        })
        summaryGenerated = true
      }
    } catch (err) {
      logger.warn({ err, contentId }, 'Summary generation failed, continuing pipeline')
    }
  }

  // Step 3: Rate difficulty if not set
  let difficultyRated = false
  if (!content.difficulty) {
    logger.info({ contentId }, 'Step 3: Rating difficulty')
    try {
      const rating = await rateDifficulty(contentText, content.title)
      if (rating) {
        await prisma.content.update({
          where: { id: contentId },
          data: { difficulty: rating.difficulty },
        })
        difficultyRated = true
      }
    } catch (err) {
      logger.warn({ err, contentId }, 'Difficulty rating failed, continuing pipeline')
    }
  }

  // Step 4: Write vocabulary to public word bank
  logger.info({ contentId, count: vocabItems.length }, 'Step 4: Writing vocabulary to public word bank')
  await writeVocabularyToPublicBank(vocabItems, contentId)

  // Step 5: Mark content as processed
  await prisma.content.update({
    where: { id: contentId },
    data: { processedAt: new Date() },
  })

  logger.info(
    { contentId, vocabCount: vocabItems.length, summaryGenerated, difficultyRated },
    'Content processing completed',
  )

  return {
    contentId,
    vocabularyExtracted: vocabItems.length,
    summaryGenerated,
    difficultyRated,
    vocabulary: vocabItems.map((v) => ({
      word: v.word,
      phonetic: v.phonetic,
      translation: v.translation,
      definition: v.definition,
      examples: v.examples,
    })),
  }
}

/**
 * Write extracted vocabulary to the public word bank (userId = system).
 * Skips words that already exist in the public bank.
 */
async function writeVocabularyToPublicBank(
  items: Array<{ word: string; phonetic?: string; translation: string; definition?: string; examples?: string[] }>,
  contentId: string,
): Promise<number> {
  const prisma = getPrisma()
  let written = 0

  for (const item of items) {
    try {
      // Check if word already exists in public bank
      const existing = await prisma.vocabulary.findUnique({
        where: {
          userId_word: {
            userId: SYSTEM_USER_ID,
            word: item.word,
          },
        },
      })

      if (existing) {
        continue
      }

      await prisma.vocabulary.create({
        data: {
          userId: SYSTEM_USER_ID,
          word: item.word,
          phonetic: item.phonetic,
          translation: item.translation,
          definition: item.definition,
          examples: item.examples ?? [],
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: new Date(),
        },
      })
      written++
    } catch (err) {
      logger.warn({ err, word: item.word }, 'Failed to write vocabulary to public bank')
    }
  }

  return written
}

/**
 * Batch process unprocessed content items.
 * Processes up to `limit` items that have no processedAt timestamp.
 */
export async function batchProcessContent(
  limit: number,
  type?: 'ARTICLE' | 'VIDEO' | 'PODCAST',
): Promise<BatchProcessingResult> {
  const prisma = getPrisma()

  const where: Record<string, unknown> = {
    processedAt: null,
  }
  if (type) {
    where.type = type
  }

  const contents = await prisma.content.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  logger.info({ count: contents.length, type }, 'Batch processing started')

  let processed = 0
  let failed = 0
  const results: ProcessingResult[] = []

  for (const content of contents) {
    try {
      const result = await processContent(content.id)
      results.push(result)
      processed++
    } catch (err) {
      logger.error({ err, contentId: content.id }, 'Failed to process content in batch')
      failed++
    }
  }

  logger.info({ processed, failed, total: contents.length }, 'Batch processing completed')

  return { processed, failed, results }
}

/**
 * Get all vocabulary extracted from AI processing (public bank).
 */
export async function getProcessedVocabulary(
  page: number,
  limit: number,
  keyword?: string,
): Promise<{ items: ExtractedVocabulary[]; total: number }> {
  const prisma = getPrisma()

  const where: Record<string, unknown> = {
    userId: SYSTEM_USER_ID,
  }
  if (keyword) {
    where.OR = [
      { word: { contains: keyword, mode: 'insensitive' as const } },
      { translation: { contains: keyword, mode: 'insensitive' as const } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.vocabulary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        word: true,
        phonetic: true,
        translation: true,
        definition: true,
        examples: true,
        id: true,
        createdAt: true,
      },
    }),
    prisma.vocabulary.count({ where }),
  ])

  return { items, total }
}
