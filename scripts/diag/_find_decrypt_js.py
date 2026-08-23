import urllib.request, re, os, sys

PAGE_URLS = [
    "https://dict.youdao.com/w/hello",
    "https://www.youdao.com/result?word=hello&lang=en",
]

OUT_DIR = "/tmp/youdao_js"
os.makedirs(OUT_DIR, exist_ok=True)

for page_url in PAGE_URLS:
    print("===", page_url, "===")
    req = urllib.request.Request(page_url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
    })
    try:
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "ignore")
    except Exception as e:
        print("fetch err", e)
        continue

    # find script src
    srcs = re.findall(r'<script[^>]+src="([^"]+)"', html)
    # also inline scripts
    inline_count = len(re.findall(r'<script[\s>]', html))
    print("script srcs:", len(srcs), "inline:", inline_count)

    keywords = ["encryptedData", "oxfordAdvance", "decrypt", "AES", "CryptoJS", "crypto", "cipher", "parse", "key", "iv"]
    found_any = False
    for src in srcs:
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = "https://dict.youdao.com" + src
        elif src.startswith("http"):
            pass
        else:
            continue
        try:
            js = urllib.request.urlopen(src, timeout=20).read().decode("utf-8", "ignore")
        except Exception as e:
            continue
        hits = [kw for kw in keywords if kw in js]
        if hits:
            found_any = True
            name = os.path.basename(src.split("?")[0]) or "inline"
            path = os.path.join(OUT_DIR, name)
            with open(path, "w", encoding="utf-8") as f:
                f.write(js)
            print("  HIT", src[:80], "->", hits, "saved", path, "size", len(js))
    if not found_any:
        print("  no keyword hits")

print("done")
