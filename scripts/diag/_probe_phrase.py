import urllib.request, json

for word in ["hello", "arrive", "run", "take", "look"]:
    url = "https://dict.youdao.com/jsonapi?q=" + word + "&le=en"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://dict.youdao.com/",
    })
    data = json.load(urllib.request.urlopen(req, timeout=10))
    keys = list(data.keys())
    phrase_like = [k for k in keys if "phrase" in k.lower() or "phrs" in k.lower()]
    print("WORD:", word, "phrase-like keys:", phrase_like)
    for k in phrase_like:
        v = data[k]
        s = json.dumps(v, ensure_ascii=False)
        print("  ", k, "=>", type(v).__name__, "len", len(s), s[:400])
    print()
