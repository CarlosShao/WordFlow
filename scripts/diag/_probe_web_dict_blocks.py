import urllib.request, re

url = "https://dict.youdao.com/w/hello"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9",
})
html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "ignore")

for block_id in ["collinsResult", "authTrans", "tEETrans", "tPETrans"]:
    m = re.search(r'<div[^>]*id="' + block_id + r'"[^>]*>(.*?)</div>\s*</div>', html, re.S | re.I)
    if not m:
        print(f"[{block_id}] not found")
        continue
    block = m.group(1)
    text = re.sub(r'<[^>]+>', ' ', block)
    text = re.sub(r'\s+', ' ', text).strip()
    print(f"[{block_id}] len={len(text)}\n{text[:800]}\n---")
