import urllib.request, json, base64, binascii

word = "arrive"
url = "https://dict.youdao.com/jsonapi?q=" + word + "&le=en"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://dict.youdao.com/",
})
data = json.load(urllib.request.urlopen(req, timeout=10))

for key in ["oxford", "oxfordAdvance", "oxfordAdvanceHtml", "oxfordAdvanceTen", "webster"]:
    if key not in data:
        continue
    enc = data[key].get("encryptedData", "")
    if not enc:
        print(f"[{key}] no encryptedData")
        continue
    print(f"[{key}] len={len(enc)}")
    # try urlsafe base64 decode
    try:
        padded = enc + "=" * ((4 - len(enc) % 4) % 4)
        raw = base64.urlsafe_b64decode(padded)
        print(f"   decoded len={len(raw)} hex_head={binascii.hexlify(raw[:32]).decode()}")
        # try standard base64 too
        raw2 = base64.b64decode(padded.replace("-", "+").replace("_", "/"))
        print(f"   std64 decoded len={len(raw2)} hex_head={binascii.hexlify(raw2[:32]).decode()}")
    except Exception as e:
        print(f"   decode err: {e}")
    print()
