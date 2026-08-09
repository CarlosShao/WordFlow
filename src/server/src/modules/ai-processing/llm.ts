/**
 * LLM service wrapper for AI processing module.
 *
 * Uses OpenAI-compatible API (DeepSeek / Moonshot / OpenAI).
 * Follows the same pattern as src/modules/ai/index.ts but with
 * correct config paths (config.ai.apiBaseUrl / apiKey / model).
 */

import { config } from '../../config/index.js'
import { logger } from '../../common/logger.js'

export async function callLlm(messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch(`${config.ai.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.ai.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`LLM API error: ${response.status} - ${error}`)
  }

  const data = await response.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content || ''
}

/**
 * Extract vocabulary from content text using LLM.
 * Returns structured JSON array of vocabulary items.
 */
export async function extractVocabulary(contentText: string, title: string): Promise<
  Array<{ word: string; phonetic?: string; translation: string; definition?: string; examples?: string[] }>
> {
  const systemPrompt = `你是一个专业的英语教材编辑。请从给定的英语内容中提取 5-10 个重点词汇（包括核心词汇、短语、搭配）。
要求：
- 只返回 JSON 数组格式
- 每个词汇包含：word（单词/短语）、phonetic（音标，可选）、translation（中文释义）、definition（英文简释，可选）、examples（例句数组，1-2 个，可选）
- 优先选择对学习者有价值的词汇（高频词、考点词、实用表达）
- 不要选过于简单（如 a, the, is）或过于冷僻的词汇

返回格式示例：
[{"word":"perseverance","phonetic":"/ˌpɜːsəˈvɪərəns/","translation":"毅力，坚持不懈","definition":"continued effort despite difficulties","examples":["Success requires perseverance."]}]`

  const userPrompt = `标题：${title}\n\n内容：\n${contentText.slice(0, 8000)}`

  const result = await callLlm([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item.word && item.translation)
      }
    }
    logger.warn({ result: result.slice(0, 200) }, 'Failed to parse vocabulary extraction result')
    return []
  } catch (err) {
    logger.warn({ err, result: result.slice(0, 200) }, 'JSON parse error in vocabulary extraction')
    return []
  }
}

/**
 * Generate a Chinese summary for the content.
 */
export async function generateSummary(contentText: string, title: string): Promise<string> {
  const systemPrompt = `你是一个专业的英语内容编辑。请为给定的英语内容生成一段中文摘要（100-200 字）。
要求：
- 简明扼要，抓住核心要点
- 使用流畅的中文
- 只返回摘要文本，不加任何前缀或解释`

  const userPrompt = `标题：${title}\n\n内容：\n${contentText.slice(0, 6000)}`

  const result = await callLlm([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  return result.trim()
}

/**
 * Rate the difficulty level of the content.
 */
export async function rateDifficulty(contentText: string, title: string): Promise<{
  difficulty: 'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED' | 'PROFICIENT'
  reason: string
}> {
  const systemPrompt = `你是一个英语水平评估专家。请根据给定的英语内容评估其难度级别。
难度级别（必须从以下选择）：
- BEGINNER（初级）：基础词汇，简单句型，适合小学
- ELEMENTARY（初等）：日常用语，适合初中
- INTERMEDIATE（中等）：较复杂句型和词汇，适合高中
- UPPER_INTERMEDIATE（中高级）：长难句、抽象概念，适合大学六级
- ADVANCED（高级）：专业词汇、复杂论述，适合英语专业/雅思 7+
- PROFICIENT（精通级）：学术/专业深度内容

只返回 JSON 格式：{"difficulty":"级别","reason":"简要评估理由（中文）"}`

  const userPrompt = `标题：${title}\n\n内容片段：\n${contentText.slice(0, 4000)}`

  const result = await callLlm([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const validDifficulties = ['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT']
      if (parsed.difficulty && validDifficulties.includes(parsed.difficulty)) {
        return {
          difficulty: parsed.difficulty,
          reason: parsed.reason || '',
        }
      }
    }
    logger.warn({ result: result.slice(0, 200) }, 'Failed to parse difficulty rating')
    return { difficulty: 'INTERMEDIATE', reason: '默认中等难度' }
  } catch (err) {
    logger.warn({ err }, 'JSON parse error in difficulty rating')
    return { difficulty: 'INTERMEDIATE', reason: '默认中等难度' }
  }
}
