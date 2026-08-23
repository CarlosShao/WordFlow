import urllib.request, json

word = "arrive"
url = "https://dict.youdao.com/jsonapi?q=" + word + "&le=en"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://dict.youdao.com/",
})
data = json.load(urllib.request.urlopen(req, timeout=10))

def dump(key, maxlen=2000):
    if key not in data:
        print(f"### [{key}] NOT PRESENT")
        return
    v = data[key]
    s = json.dumps(v, ensure_ascii=False)
    print(f"### [{key}] type={type(v).__name__} len={len(s)}")
    print(s[:maxlen])
    print()

dump("webster")
dump("wikipedia_digest")
# also check a simpler word for webster presence
