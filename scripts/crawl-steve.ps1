# Steve Harvey 批量爬取脚本（100 个分 P，支持 token 自动续期）
# 用法: powershell -File scripts\crawl-steve.ps1
$base = 'http://localhost:3002/api/v1'

# 注册一个临时用户拿 token（个人开发环境）
$login = Invoke-RestMethod -Uri "$base/auth/register" -Method Post -Body (@{
  email = "steve_$([guid]::NewGuid().ToString('N').Substring(0,8))@test.com"
  username = "stevebatch"
  password = "TestPass123!"
} | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 8
$script:tok = $login.data.accessToken
$script:refreshTok = $login.data.refreshToken

function Get-AuthHeaders {
  return @{ Authorization = "Bearer $script:tok" }
}

# 401 时用 refresh token 续期（递归重试，避免 PS5 解析 while+try 的 bug）
function Invoke-CrawlOnce {
  param([string]$sourceId)
  try {
    $r = Invoke-RestMethod -Uri "$base/crawler/sources/$sourceId/crawl" -Method Post -Headers (Get-AuthHeaders) -Body '{}' -ContentType 'application/json' -TimeoutSec 900
    return @{ ok = $true; inserted = $r.data.inserted }
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401 -and $script:refreshTok) {
      try {
        $refresh = Invoke-RestMethod -Uri "$base/auth/refresh" -Method Post -Body (@{ refreshToken = $script:refreshTok } | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 15
        $script:tok = $refresh.data.accessToken
        if ($refresh.data.refreshToken) { $script:refreshTok = $refresh.data.refreshToken }
        return $null  # signal: refreshed, retry
      } catch {
        return @{ ok = $false; error = "refresh failed" }
      }
    }
    return @{ ok = $false; error = $_.Exception.Message }
  }
}

function Invoke-CrawlWithRetry {
  param([string]$sourceId, [string]$name)
  for ($attempt = 1; $attempt -le 4; $attempt++) {
    $res = Invoke-CrawlOnce -sourceId $sourceId
    if ($null -eq $res) {
      Write-Output "[$name] token refreshed, retrying ($attempt/4)"
      continue
    }
    return $res
  }
  return @{ ok = $false; error = "exhausted retries" }
}

$sources = (Invoke-RestMethod -Uri "$base/crawler/sources" -Headers (Get-AuthHeaders) -TimeoutSec 15).data |
  Where-Object { $_.type -eq 'BILIBILI' }
Write-Output "BILIBILI sources: $($sources.Count)"

$i = 0
$inserted = 0
foreach ($s in $sources) {
  $i++
  $res = Invoke-CrawlWithRetry -sourceId $s.id -name $s.name
  if ($res.ok) {
    $inserted += $res.inserted
    Write-Output "[$i/$($sources.Count)] $($s.name): inserted=$($res.inserted)"
  } else {
    Write-Output "[$i/$($sources.Count)] $($s.name): ERROR $($res.error)"
  }
}
Write-Output "=== Steve batch done, total inserted: $inserted ==="

