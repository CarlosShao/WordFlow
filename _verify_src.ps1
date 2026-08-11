$urls = @(
  'https://learningenglish.voanews.com/api/ztptn',
  'https://feeds.bbci.co.uk/learningenglish/english/features/rss.xml',
  'http://rss.cnn.com/rss/edition.rss',
  'https://feeds.npr.org/1001/rss.xml',
  'https://feeds.reuters.com/Reuters/worldNews',
  'https://feeds.apnews.com/rss/apf-topnews',
  'https://www.theguardian.com/world/rss',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://www.france24.com/en/rss',
  'https://www.ted.com/talks/rss',
  'https://www.youtube.com/feeds/videos.xml?user=TEDEd',
  'https://www.scientificamerican.com/podcast/60-second-science/rss.xml',
  'https://www.nationalgeographic.com/index.rss',
  'https://feeds.feedburner.com/crashcourse',
  'https://www.youtube.com/feeds/videos.xml?user=khanacademy',
  'https://www.youtube.com/feeds/videos.xml?user=Kurzgesagt',
  'https://www.youtube.com/feeds/videos.xml?user=veritasium',
  'https://www.youtube.com/feeds/videos.xml?user=vsauce',
  'https://www.youtube.com/feeds/videos.xml?user=EnglishwithLucy',
  'https://www.youtube.com/feeds/videos.xml?user=RachelsEnglish',
  'https://www.youtube.com/feeds/videos.xml?user=mmmEnglish',
  'https://www.youtube.com/feeds/videos.xml?user=engvidenglish',
  'https://www.youtube.com/feeds/videos.xml?user=BBCLearningEnglish',
  'https://www.youtube.com/feeds/videos.xml?user=VOALearningEnglish',
  'https://feeds.npr.org/500005/rss.xml',
  'https://feeds.bbci.co.uk/news/podcasts/world_report/rss.xml',
  'https://learningenglish.voanews.com/podcast/voa-feature-magazine/2277.html',
  'https://www.eslpod.com/website/feed.xml',
  'https://feeds.transistor.fm/all-ears-english-podcast',
  'https://lukespodcast.podbean.com/feed.xml',
  'https://feeds.bbci.co.uk/worldservice/learningenglish/language/english_we_speak/rss.xml',
  'https://feeds.bbci.co.uk/worldservice/learningenglish/grammar/6minute/rss.xml',
  'https://www.thisamericanlife.org/podcast/rss.xml',
  'https://feeds.npr.org/510289/rss.xml',
  'https://feeds.megaphone.fm/freakonomics-radio',
  'https://feeds.megaphone.fm/radiolab',
  'https://feeds.npr.org/510308/rss.xml',
  'https://feeds.megaphone.fm/serial',
  'https://feeds.megaphone.fm/stuff-you-should-know',
  'https://www.newyorker.com/feed/news',
  'https://www.theatlantic.com/feed/all/',
  'https://www.economist.com/finance-and-economics/rss.xml',
  'https://www.wired.com/feed/rss',
  'https://hbr.org/rss/topic/leadership',
  'https://www.chinadaily.com.cn/rss/china_rss.xml',
  'https://www.cgtn.com/rss/world.xml',
  'https://www.sixthtone.com/rss'
)
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -TimeoutSec 20 -UseBasicParsing
    $c = $r.Content
    $items = if ($c -match '<item') { ($c -split '<item>').Count - 1 } else { 0 }
    $yt = if ($c -match 'yt:videoId|<entry') { 'YT' } else { '' }
    Write-Host "OK   items=$items $yt  $u"
  } catch {
    Write-Host "FAIL $u  $($_.Exception.Message)"
  }
}
