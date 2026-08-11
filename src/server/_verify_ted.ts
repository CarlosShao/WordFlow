import 'dotenv/config'
import { tedStrategy } from './src/modules/crawler/strategies/ted.js'

async function main() {
  const items = await tedStrategy.crawl({
    id: 'verify',
    name: 'TED verify',
    type: 'TED',
    url: 'https://feeds.feedburner.com/TEDTalks_video',
    enabled: true,
  } as never)

  console.log(`\n=== TED items: ${items.length} ===`)
  const item = items[0]
  if (!item) {
    console.log('NO ITEMS')
    return
  }

  const segs = item.segments as unknown as { en: string; zh?: string }[]
  const withZh = segs.filter((s) => s.zh).length

  console.log('title      :', item.title)
  console.log('sourceUrl  :', item.sourceUrl)
  console.log('duration   :', item.duration)
  console.log('segments   :', segs.length)
  console.log('with zh    :', withZh, `(${Math.round((withZh / segs.length) * 100)}%)`)
  console.log('\n--- first 6 aligned pairs ---')
  for (const s of segs.slice(0, 6)) {
    console.log('  EN:', s.en)
    console.log('  ZH:', s.zh ?? '(missing)')
    console.log('')
  }
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
