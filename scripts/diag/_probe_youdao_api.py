import urllib.request, json

word = "arrive"
url = "https://dict.youdao.com/jsonapi?q=" + word + "&le=en"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://dict.youdao.com/",
})
try:
    data = json.load(urllib.request.urlopen(req, timeout=10))
except Exception as e:
    print("FETCH_ERROR:", e)
    raise SystemExit

print("TOP_KEYS:", list(data.keys()))
# Look for any third-party dictionary-related keys
interesting = ["collins", "oxford", "longman", "encyclopedia", "web_trans", "auth_sents_part", "thesaurus", "biankui", "discrimination", "etymology", "phrase", "related", "syno", "rel_word", "ee", "ec", "simple", "blng_sents_part", "fanyi", "video", "control", "lang", "st", "basic"]
for k in interesting:
    if k in data:
        v = data[k]
        if isinstance(v, dict):
            print(k, "=> dict keys:", list(v.keys())[:20])
        elif isinstance(v, list):
            print(k, "=> list len:", len(v))
        else:
            print(k, "=>", type(v).__name__)
