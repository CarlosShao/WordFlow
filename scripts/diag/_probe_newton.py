import urllib.request, json

for word in ["arrive", "apple", "run", "happy", "water"]:
    url = "https://dict.youdao.com/jsonapi?q=" + word + "&le=en"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://dict.youdao.com/",
    })
    try:
        data = json.load(urllib.request.urlopen(req, timeout=10))
    except Exception as e:
        print(word, "ERR", e)
        continue
    keys = list(data.keys())
    # find newton / NEW / new / 牛顿 related keys
    hit = [k for k in keys if "ewton" in k.lower() or "new" in k.lower() or "webster" in k.lower() or "oxford" in k.lower()]
    print("WORD:", word)
    print("  ALL KEYS:", keys)
    print("  NEWTON-LIKE:", hit)
    for k in hit:
        v = data[k]
        if isinstance(v, dict):
            print("   ", k, "=> dict keys:", list(v.keys())[:10], "| has encryptedData:", "encryptedData" in v)
        else:
            print("   ", k, "=>", type(v).__name__)
    print("----")
