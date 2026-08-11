import { buildItemFromMedia } from './src/modules/crawler/strategies/mediaItem.js'
import { voaStrategy } from './src/modules/crawler/strategies/voa.js'
import type { CrawlerSource } from './src/modules/crawler/types.js'

async function main() {
  // 1. TED single video (should come with bilingual subtitles, no AI needed)
  console.log('=== TEST 1: TED video ===')
  const tedUrl = 'https://www.youtube.com/watch?v=8S0FDjFBj8o' // a known TED talk on YT
  const tedItem = await buildItemFromMedia(tedUrl, { audio: false })
  if (tedItem) {
    console.log('title:', tedItem.title)
    console.log('videoUrl:', tedItem.videoUrl)
    console.log('segments count:', (tedItem.segments as any[])?.length)
    console.log('first seg en:', (tedItem.segments as any[])?.[0]?.en?.slice(0, 80))
    console.log('first seg zh:', (tedItem.segments as any[])?.[0]?.zh?.slice(0, 80))
    console.log('has translation:', !!tedItem.translation)
  } else {
    console.log('TED: FAILED to build item')
  }

  // 2. VOA strategy (English-only, needs AI translation)
  console.log('\n=== TEST 2: VOA RSS ===')
  const fakeSource: CrawlerSource = {
    id: 'test-voa',
    name: 'VOA Test',
    url: 'https://learningenglish.voanews.com/api/',
    type: 'VOA' as any,
    contentType: 'ARTICLE' as any,
    difficulty: 'BEGINNER' as any,
    crawlInterval: 1440,
    enabled: true,
    lastCrawledAt: null,
    lastStatus: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as CrawlerSource
  try {
    const voaItems = await voaStrategy.crawl(fakeSource)
    console.log('VOA items:', voaItems.length)
    const first = voaItems[0]
    if (first) {
      console.log('title:', first.title)
      console.log('segments count:', (first.segments as any[])?.length)
      console.log('first seg en:', (first.segments as any[])?.[0]?.en?.slice(0, 80))
      console.log('first seg zh:', (first.segments as any[])?.[0]?.zh?.slice(0, 80))
      console.log('translation present:', !!first.translation)
    }
  } catch (e) {
    console.log('VOA crawl error:', (e as Error).message)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
