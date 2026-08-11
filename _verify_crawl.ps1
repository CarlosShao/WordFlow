$urls = @(
  'https://feeds.bbci.co.uk/learningenglish/english/features/rss.xml',
  'https://www.theguardian.com/world/rss',
  'https://feeds.npr.org/1001/rss.xml',
  'https://learningenglish.voanews.com/api/zjmme'
)
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -TimeoutSec 20 -UseBasicParsing
    $items = ($r.Content -split '<item>').Count - 1
    Write-Host "OK  $u  items=$items"
  } catch {
    Write-Host "FAIL $u  $($_.Exception.Message)"
  }
}
