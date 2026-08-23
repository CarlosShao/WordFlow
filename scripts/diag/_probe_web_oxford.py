import urllib.request, re

for url in ["https://dict.youdao.com/w/hello", "https://www.youdao.com/result?word=hello&lang=en"]:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Cookie": "OUTFOX_SEARCH_USER_ID=1@localhost; _ga=1",
    })
    try:
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "ignore")
    except Exception as e:
        print(url, "ERR", e)
        continue
    print("===", url, "===")
    for kw in ["牛津", "新牛津", "柯林斯", "韦氏", "简明", "百科", "例句"]:
        cnt = html.count(kw)
        if cnt:
            print(f"  '{kw}' x{cnt}")
            idx = html.find(kw)
            print("    snippet:", html[max(0,idx-80):idx+80].replace("\n"," "))
