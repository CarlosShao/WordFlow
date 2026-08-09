import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'

const execFileAsync = promisify(execFile)

export const webStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const { stdout } = await execFileAsync('curl', ['-sL', '--max-time', '15', source.url], {
      maxBuffer: 5 * 1024 * 1024,
    })

    const { load } = await import('cheerio')
    const $ = load(stdout)

    // Remove non-content elements
    $('script, style, nav, footer, header, aside, .ad, .advertisement').remove()

    const title = $('title').text().trim() || $('h1').first().text().trim()
    const author = $('meta[name="author"]').attr('content') ?? undefined
    const publishTime =
      $('meta[property="article:published_time"]').attr('content') ??
      $('time[datetime]').attr('datetime') ??
      undefined
    const coverUrl =
      $('meta[property="og:image"]').attr('content') ??
      $('meta[name="twitter:image"]').attr('content') ??
      undefined

    // Extract main content area
    let content = ''
    const article = $('article, main, .post-content, .entry-content, .article-body')
    if (article.length) {
      content = article.text().replace(/\s+/g, ' ').trim()
    } else {
      content = $('body').text().replace(/\s+/g, ' ').trim()
    }

    logger.info({ source: source.name, title, contentLen: content.length }, 'Webpage scraped')

    return [
      {
        title,
        sourceUrl: source.url,
        summary: content.slice(0, 5000),
        author,
        publishedAt: publishTime ? new Date(publishTime) : undefined,
        coverUrl,
      },
    ]
  },
}
