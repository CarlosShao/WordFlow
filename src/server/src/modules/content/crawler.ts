import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'
import { getPrisma } from '../../common/prisma.js'
import { logger } from '../../common/logger.js'

const execFileAsync = promisify(execFile)

// RSS/Atom 条目结构
const rssItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  description: z.string().optional(),
  pubDate: z.string().optional(),
  author: z.string().optional(),
  itunesDuration: z.string().optional(), // 播客时长
})

export type RssItem = z.infer<typeof rssItemSchema>

/**
 * 抓取 RSS/Atom feed，返回条目列表
 */
export async function fetchRssFeed(feedUrl: string): Promise<RssItem[]> {
  const { stdout } = await execFileAsync('curl', ['-s', feedUrl], {
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024, // 10MB
  })

  const xml = stdout
  const items: RssItem[] = []

  // 简单解析 RSS <item> 或 Atom <entry>
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
    const linkMatch = block.match(/<link[^>]*>([^<]+)<\/link>/)
    const descMatch = block.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/)
    const dateMatch = block.match(/<(?:pubDate|published|updated)[^>]*>([^<]+)<\/(?:pubDate|published|updated)>/)
    const authorMatch = block.match(/<(?:author|dc:creator)[^>]*>([^<]+)<\/(?:author|dc:creator)>/)
    const durationMatch = block.match(/<itunes:duration>([^<]+)<\/itunes:duration>/)

    if (titleMatch && linkMatch) {
      items.push({
        title: decodeHtmlEntities(titleMatch[1].trim()),
        link: linkMatch[1].trim(),
        description: descMatch ? decodeHtmlEntities(descMatch[1].trim()) : undefined,
        pubDate: dateMatch ? dateMatch[1].trim() : undefined,
        author: authorMatch ? authorMatch[1].trim() : undefined,
        itunesDuration: durationMatch ? durationMatch[1].trim() : undefined,
      })
    }
  }

  logger.info({ feedUrl, count: items.length }, 'RSS feed fetched')
  return items
}

/**
 * 使用 cheerio 解析静态网页内容
 */
export async function scrapeWebpage(url: string): Promise<{
  title: string
  content: string
  author?: string
  publishedAt?: Date
}> {
  const { stdout } = await execFileAsync('curl', ['-sL', '--max-time', '15', url], {
    maxBuffer: 5 * 1024 * 1024,
  })

  // 动态 import cheerio（ESM）
  const { load } = await import('cheerio')
  const $ = load(stdout)

  // 移除脚本和样式
  $('script, style, nav, footer, header').remove()

  const title = $('title').text().trim() || $('h1').first().text().trim()
  const author = $('meta[name="author"]').attr('content')
  const publishTime = $('meta[property="article:published_time"]').attr('content')
    || $('time[datetime]').attr('datetime')

  // 提取正文：优先 article / main，否则 body
  let content = ''
  const article = $('article, main, .post-content, .entry-content')
  if (article.length) {
    content = article.text().replace(/\s+/g, ' ').trim()
  } else {
    content = $('body').text().replace(/\s+/g, ' ').trim()
  }

  return {
    title,
    author,
    content: content.slice(0, 50_000), // 限制 50KB
    publishedAt: publishTime ? new Date(publishTime) : undefined,
  }
}

/**
 * HTML entity 简单解码
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim()
}

/**
 * 使用 Puppeteer 抓取动态页面（SPA / JS 渲染）
 */
export async function scrapeWithPuppeteer(url: string): Promise<{
  title: string
  content: string
}> {
  const { default: puppeteer } = await import('puppeteer')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 })
    const result = await page.evaluate(() => {
      const title = document.title
      const article = document.querySelector('article, main, .post-content, .entry-content')
      const content = article?.textContent?.replace(/\s+/g, ' ').trim()
        || document.body.textContent?.replace(/\s+/g, ' ').trim()
        || ''
      return { title, content }
    })
    return { title: result.title, content: result.content.slice(0, 50_000) }
  } finally {
    await browser.close()
  }
}
