import urllib.request, json

word = "arrive"
url = "https://dict.youdao.com/jsonapi?q=" + word + "&le=en"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://dict.youdao.com/",
})
data = json.load(urllib.request.urlopen(req, timeout=10))
keys = list(data.keys())
print("ALL KEYS:", keys)
# scan for anything dictionary-ish / chinese-english big dict
for kw in ["century", "Century", "21", "new", "New", "xin", "niu", "Niu", "ce", "CE", "brief", "langdata", "ceNew", "newCentury", "21century"]:
    hit = [k for k in keys if kw in k]
    if hit:
        print("HIT", kw, "=>", hit)
# print a few plaintext-ish blocks that are NOT encrypted, to see what chinese-english dicts exist
print("=== non-encrypted dict-like blocks ===")
for k in keys:
    v = data[k]
    if isinstance(v, dict) and "encryptedData" not in v:
        sub = list(v.keys())
        # heuristic: blocks that look like dictionary content
        if any(s in str(sub).lower() for s in ["tran", "entry", "def", "word", "dict", "sense", "sent", "summary", "etym", "discrim"]):
            print("  ", k, "=>", sub[:12])
