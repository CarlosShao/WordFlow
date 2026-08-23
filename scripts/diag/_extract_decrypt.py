import re

for name in ["b728bb1.js", "2c9ba92.js"]:
    path = "/tmp/youdao_js/" + name
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        js = f.read()
    print(f"=== {name} size={len(js)} ===")

    # find decrypt function definitions / calls
    # show lines around 'decrypt' (200 chars window)
    for m in re.finditer(r'(?i)decrypt', js):
        start = max(0, m.start() - 200)
        end = min(len(js), m.end() + 200)
        snippet = js[start:end]
        if any(k in snippet for k in ["encryptedData", "AES", "cipher", "CryptoJS", "parse", "enc"]):
            print("\n--- snippet ---\n", snippet.replace("\n", " "))

    # look for hardcoded key/iv patterns (common in youdao: e, t, n strings)
    # find strings of length 16,24,32 near AES
    for m in re.finditer(r'(?i)AES', js):
        snippet = js[max(0, m.start()-150):m.end()+300]
        if "decrypt" in snippet or "encrypt" in snippet:
            print("\n*** AES snippet ***\n", snippet.replace("\n", " "))

print("done")
