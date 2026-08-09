import type { CrawlerSource, CrawlItem, CrawlStrategy } from '../types.js'
import { logger } from '../../../common/logger.js'

export const puppeteerStrategy: CrawlStrategy = {
  async crawl(source: CrawlerSource): Promise<CrawlItem[]> {
    const { default: puppeteer } = await import('puppeteer')
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    try {
      const page = await browser.newPage()
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      )
      await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 30_000 })

      const result = await page.evaluate(() => {
        // Remove non-content elements
        document.querySelectorAll('script, style, nav, footer, header, aside').forEach((el) => el.remove())

        const title = document.title || document.querySelector('h1')?.textContent?.trim() || ''
        const authorMeta = document.querySelector('meta[name="author"]')
        const author = authorMeta?.getAttribute('content') ?? undefined
        const publishMeta =
          document.querySelector('meta[property="article:published_time"]') ??
          document.querySelector('time[datetime]')
        const publishTime = publishMeta?.getAttribute('content') ?? publishMeta?.getAttribute('datetime') ?? undefined
        const ogImage = document.querySelector('meta[property="og:image"]')
        const coverUrl = ogImage?.getAttribute('content') ?? undefined

        const article = document.querySelector('article, main, .post-content, .entry-content, .article-body')
        const content = article?.textContent?.replace(/\s+/g, ' ').trim()
          ?? document.body.textContent?.replace(/\s+/g, ' ').trim()
          ?? ''

        return { title, author, publishTime, coverUrl, content }
      })

      logger.info({ source: source.name, title: result.title }, 'Puppeteer page scraped')

      return [
        {
          title: result.title,
          sourceUrl: source.url,
          summary: result.content.slice(0, 5000),
          author: result.author,
          publishedAt: result.publishTime ? new Date(result.publishTime) : undefined,
          coverUrl: result.coverUrl,
        },
      ]
    } finally {
      await browser.close()
    }
  },
}
