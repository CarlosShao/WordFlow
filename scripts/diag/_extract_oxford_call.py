import re

path = "/tmp/youdao_js/b728bb1.js"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

print(f"size={len(js)}")

# find oxfordAdvance occurrences
for m in re.finditer(r'oxfordAdvance', js):
    start = max(0, m.start() - 600)
    end = min(len(js), m.end() + 600)
    print("\n=== oxfordAdvance occurrence ===\n")
    print(js[start:end].replace("\n", " "))

# find encryptedData occurrences
for m in re.finditer(r'encryptedData', js):
    start = max(0, m.start() - 600)
    end = min(len(js), m.end() + 600)
    snippet = js[start:end].replace("\n", " ")
    if "decrypt" in snippet or "AES" in snippet or "CryptoJS" in snippet:
        print("\n=== encryptedData + decrypt occurrence ===\n")
        print(snippet)
