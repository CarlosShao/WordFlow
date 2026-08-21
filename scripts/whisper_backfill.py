#!/usr/bin/env python3
"""
Whisper word-level re-transcription backfill for Bilibili VIDEO contents.

Replaces the char-proportion / ai-zh-cue estimated timestamps with REAL
word-level timestamps from faster-whisper (large-v3-turbo, GPU).

Pipeline per video:
  1. Read row from DB (id, sourceUrl, title).
  2. Download audio via Bilibili DASH API (same endpoint the crawler uses).
  3. Whisper transcribe (language=en, word_timestamps=True, vad_filter=True).
  4. Assemble segments: one per Whisper sentence, start/end = real seconds.
  5. Align Chinese: fetch ai-zh subtitle track, pair zh text to en segments by
     time overlap, fill `translation`.
  6. UPDATE contents SET segments, translation.

Resumable: writes a progress file; --limit / --offset / --ids control scope.
Idempotent: re-running overwrites segments for the same rows.

Usage:
  python whisper_backfill.py [--limit=N] [--offset=N]
  python whisper_backfill.py --ids=1817c8ef-...
"""
import argparse
import json
import os
import re
import sys
import time
import subprocess
import urllib.request

MODEL_DIR = r"D:\work\AI\tools\whisper-models"
MODEL = "large-v3-turbo"
# Short path on D: drive to avoid Windows MAX_PATH (260-char) failures from
# faster-whisper internal temp files. A 32-char C:\Users\...\Temp path is fine,
# but `D:\AI\w` is bulletproof.
WORKDIR = r"D:\AI\w"
PROGRESS_FILE = os.path.join(WORKDIR, "progress.json")
if not os.path.exists(WORKDIR):
    os.makedirs(WORKDIR, exist_ok=True)
# Point system temp at a short path too, so ctranslate2's transient files never
# hit the 260-char limit.
for k in ("TMP", "TEMP", "TMPDIR"):
    os.environ[k] = WORKDIR
# DB via docker exec (project convention: all DB writes go through the container)
PSQL = ["docker", "exec", "wordflow-postgres", "psql", "-U", "wordflow", "-d", "wordflow", "-t", "-A", "-c"]

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def db_query(sql: str) -> str:
    r = subprocess.run(PSQL + [sql], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(f"psql failed: {r.stderr[:500]}")
    return r.stdout


def db_exec(sql: str) -> None:
    r = subprocess.run(PSQL + [sql], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(f"psql exec failed: {r.stderr[:500]}")


def get_cookie() -> str:
    r = subprocess.run(
        ["docker", "exec", "wordflow-api", "sh", "-c", "echo $BILIBILI_COOKIE"],
        capture_output=True, text=True, encoding="utf-8",
    )
    return r.stdout.strip()


def http_json(url: str, headers=None, retries=4):
    h = {"User-Agent": UA, "Referer": "https://www.bilibili.com"}
    if headers:
        h.update(headers)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            last = e
            time.sleep(0.8 * (i + 1))
    raise RuntimeError(f"HTTP failed: {last}")


def parse_bvid(url: str) -> str | None:
    m = re.search(r"BV[0-9A-Za-z]+", url or "")
    return m.group(0) if m else None


def parse_page(url: str) -> int:
    m = re.search(r"[?&]p=(\d+)", url or "")
    return max(1, int(m.group(1))) if m else 1


def get_cid(bvid: str, page: int) -> int | None:
    j = http_json(f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}")
    pages = j.get("data", {}).get("pages") or []
    p = pages[page - 1] if page <= len(pages) else pages[0]
    return p.get("cid") if p else None


def download_audio(bvid: str, cid: int, dest: str, cookie: str) -> str:
    if os.path.exists(dest):
        return dest
    params = f"bvid={bvid}&cid={cid}&q=64&fnval=16"
    j = http_json(f"https://api.bilibili.com/x/player/wbi/playurl?{params}", headers={"Cookie": cookie})
    audio = (j.get("data", {}).get("dash") or {}).get("audio") or []
    if not audio:
        raise RuntimeError("no DASH audio")
    url = audio[0]["baseUrl"]
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://www.bilibili.com"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    return dest


def get_zh_cues(bvid: str, cid: int, cookie: str) -> list[dict]:
    """Fetch ai-zh subtitle cues -> [{start,end,text}] in seconds."""
    j = http_json(f"https://api.bilibili.com/x/player/wbi/v2?bvid={bvid}&cid={cid}", headers={"Cookie": cookie})
    subs = (j.get("data", {}).get("subtitle") or {}).get("subtitles") or []
    best = None
    score = -1
    for s in subs:
        lan = str(s.get("lan", ""))
        sc = 3 if lan == "ai-zh" else (2 if lan in ("zh-CN", "zh-Hans") else (1 if lan.startswith("zh") else 0))
        if sc > score:
            score, best = sc, s
    if not best or not best.get("subtitle_url"):
        return []
    url = best["subtitle_url"]
    if url.startswith("//"):
        url = "https:" + url
    j = http_json(url)
    cues = []
    for it in j.get("body") or []:
        cues.append({"start": float(it["from"]), "end": float(it["to"]), "text": it["content"]})
    return cues


def align_zh_to_en(en_segs: list[dict], zh_cues: list[dict]) -> list[dict]:
    """Pair each en segment with the zh cue of greatest time overlap."""
    if not zh_cues:
        return en_segs
    out = []
    for e in en_segs:
        best, best_ov = None, 0.0
        for z in zh_cues:
            ov = min(e["end"], z["end"]) - max(e["start"], z["start"])
            if ov > best_ov:
                best, best_ov = z, ov
        out.append({**e, "zh": best["text"] if best else ""})
    return out


def segments_to_json(segs: list[dict]) -> str:
    return json.dumps(
        [{"en": s["en"], "zh": s.get("zh", ""), "start": int(s["start"] * 1000), "end": int(s["end"] * 1000)} for s in segs],
        ensure_ascii=False,
    )


def load_progress() -> dict:
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_progress(p: dict) -> None:
    os.makedirs(WORKDIR, exist_ok=True)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(p, f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--ids", type=str, default="")
    ap.add_argument("--force", action="store_true", help="re-process even if already done")
    args = ap.parse_args()

    os.makedirs(WORKDIR, exist_ok=True)
    cookie = get_cookie()
    if not cookie:
        print("ERROR: BILIBILI_COOKIE not found", file=sys.stderr)
        sys.exit(1)

    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL, device="cuda", compute_type="int8", download_root=MODEL_DIR)

    # Load rows from DB
    if args.ids:
        id_list = ",".join(f"'{x.strip()}'" for x in args.ids.split(",") if x.strip())
        rows_sql = f"SELECT id, title, source_url FROM contents WHERE id IN ({id_list}) ORDER BY title;"
    else:
        limit_clause = f"LIMIT {args.limit}" if args.limit > 0 else ""
        rows_sql = (
            "SELECT id, title, source_url FROM contents "
            "WHERE type='VIDEO' AND is_published=true AND (source LIKE 'Steve%' OR source LIKE 'SNL%') "
            f"ORDER BY source {limit_clause} OFFSET {args.offset};"
        )
    out = db_query(rows_sql)
    rows = []
    for line in out.strip().splitlines():
        parts = line.split("|")
        if len(parts) >= 3:
            rows.append({"id": parts[0].strip(), "title": parts[1].strip(), "url": parts[2].strip()})
    print(f"rows to process: {len(rows)}")

    progress = load_progress()
    ok = fail = skip = 0
    for i, row in enumerate(rows):
        key = row["id"]
        if not args.force and key in progress:
            skip += 1
            continue
        print(f"[{i + 1}/{len(rows)}] {row['title'][:40]} ({row['id'][:8]})")
        audio_path = os.path.join(WORKDIR, f"{row['id'][:8]}.m4s")
        try:
            bvid = parse_bvid(row["url"])
            if not bvid:
                raise RuntimeError("no bvid")
            page = parse_page(row["url"])
            cid = get_cid(bvid, page)
            if not cid:
                raise RuntimeError("no cid")
            download_audio(bvid, cid, audio_path, cookie)

            segs_iter, info = model.transcribe(
                audio_path, language="en", beam_size=5, word_timestamps=True, vad_filter=True,
            )
            en_segs = []
            for s in segs_iter:
                text = s.text.strip()
                if text:
                    en_segs.append({"start": s.start, "end": s.end, "en": text})
            if not en_segs:
                raise RuntimeError("empty transcription")

            zh_cues = get_zh_cues(bvid, cid, cookie)
            segs = align_zh_to_en(en_segs, zh_cues)
            segs_json = segments_to_json(segs)
            translation = "\n".join(s.get("zh", "") for s in segs if s.get("zh"))

            # Update DB with proper escaping
            esc = segs_json.replace("'", "''")
            trans_esc = translation.replace("'", "''")
            db_exec(
                f"UPDATE contents SET segments='{esc}', "
                f"translation='{trans_esc}'::text WHERE id='{row['id']}';"
            )
            progress[key] = {"title": row["title"], "ts": time.time(), "segs": len(segs)}
            save_progress(progress)
            ok += 1
            print(f"    OK segs={len(segs)} cues={len(zh_cues)}")
        except Exception as e:
            fail += 1
            print(f"    FAIL {e}", file=sys.stderr)
        finally:
            # Best-effort cleanup: never let a failed delete abort the loop.
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except Exception:
                pass
        if (i + 1) % 5 == 0:
            save_progress(progress)

    save_progress(progress)
    print(f"\n=== DONE ok={ok} fail={fail} skip={skip} ===")


if __name__ == "__main__":
    main()
