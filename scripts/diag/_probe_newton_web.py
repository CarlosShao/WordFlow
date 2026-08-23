import urllib.request, re

word = "arrive"
url = "https://dict.youdao.com/w/" + word
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9",
})
try:
    html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", "ignore")
except Exception as e:
    print("FETCH_ERR", e)
    raise SystemExit

# search for 牛顿 / newton / NEW related dictionary names in the page
for kw in ["牛顿", "newton", "Newton", "新世纪", "新牛津", "NEW"]:
    idxs = [m.start() for m in re.finditer(re.escape(kw), html)]
    if idxs:
        print(f"FOUND '{kw}' x{len(idxs)}")
        for i in idxs[:3]:
            snippet = html[max(0,i-40):i+40].replace("\n"," ")
            print("   ...", snippet, "...")

# also list tab-like anchors / headings that mention dictionary sources
print("=== dictionary-like section ids ===")
for m in re.finditer(r'id="([^"]*(?:Result|dict|Dict|trans|collins|oxford|webster|newton|newton|baike|wiki)[^"]*)"', html, re.I):
    print("  id:", m.group(1))
