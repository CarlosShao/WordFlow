#!/usr/bin/env python3
"""
Key & Peele full-season collection crawler.

Pipeline per part:
  1. Download audio via Bilibili DASH API (q=64, AAC).
  2. Transcribe with local faster-whisper (large-v3-turbo, GPU, int8) —
     NO cloud ASR, free. Gives word-level timestamps.
  3. Translate English segments to Chinese with the free agnes LLM
     (OpenAI-compatible chat/completions), batching 8 sentences per call.
  4. Insert into DB as a VIDEO content row (source = "Key and Peele S<season>",
     sourceUrl = BV?...p=N).

Resumable via progress.json (D:\\AI\\w\\kp_progress.json).
Idempotent: skips parts already in DB (matched by sourceUrl).

Usage: python kp_crawl.py [--part=1..5] [--force]
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request

BV = "BV1n3DYBQEzo"
TITLE = "基和皮尔 全五季"
MODEL_DIR = r"D:\work\AI\tools\whisper-models"
MODEL = "large-v3-turbo"
WORKDIR = r"D:\AI\w"
PROGRESS_FILE = os.path.join(WORKDIR, "kp_progress.json")

# Free agnes LLM (primary)
AGNES_BASE = "https://api.agnes-ai.cn/v1"
AGNES_KEY = "sk-kqvGeyVkvO2JXn2AWw1MJDgQ6doGPpKfQVI8GYgUyuEtd459"
AGNES_MODEL = "agnes-2.5-flash"

# stepfun fallback (used when agnes rate-limits)
STEPFUN_BASE = "https://api.stepfun.com/step_plan/v1"
STEPFUN_KEY = "4ht7XMQIza75P819zfna8rCZEnCegevBfA5zfbiqMU1iUYInE9Jd1GLFAXbSllYn3"
STEPFUN_MODEL = "step-3.7-flash"

PSQL = ["docker", "exec", "wordflow-postgres", "psql", "-U", "wordflow", "-d", "wordflow", "-t", "-A", "-c"]
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

BATCH = 8
CONCURRENCY = 1  # agnes free tier rate-limits (429); keep it gentle

import psycopg2
import psycopg2.extras

DB_DSN = "postgresql://wordflow:wordflow@localhost:5432/wordflow"


def db_conn():
    return psycopg2.connect(DB_DSN)


def db_query(sql: str) -> str:
    r = subprocess_run(PSQL + [sql])
    return r


def subprocess_run(cmd):
    import subprocess
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(f"cmd failed: {r.stderr[:500]}")
    return r.stdout


def get_cookie() -> str:
    return subprocess_run(
        ["docker", "exec", "wordflow-api", "sh", "-c", "echo $BILIBILI_COOKIE"]
    ).strip()


def http_json(url: str, headers=None, retries=4):
    h = {"User-Agent": UA, "Referer": "https://www.bilibili.com"}
    if headers:
        h.update(headers)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            last = e
            time.sleep(1.0 * (i + 1))
    raise RuntimeError(f"HTTP failed: {last}")


def get_pages() -> list[dict]:
    j = http_json(f"https://api.bilibili.com/x/web-interface/view?bvid={BV}")
    d = j.get("data", {})
    return d.get("pages") or []


def download_audio(cid: int, dest: str, cookie: str) -> str:
    if os.path.exists(dest):
        return dest
    params = f"bvid={BV}&cid={cid}&q=64&fnval=16"
    j = http_json(f"https://api.bilibili.com/x/player/wbi/playurl?{params}", headers={"Cookie": cookie})
    audio = (j.get("data", {}).get("dash") or {}).get("audio") or []
    if not audio:
        raise RuntimeError("no DASH audio")
    url = audio[0]["baseUrl"]
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://www.bilibili.com"})
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    return dest


SYSTEM_PROMPT = (
    "你是专业英译中翻译，面向英语学习者。把下列英文逐句翻译成自然、准确的中文。"
    "严格保持编号（如 \"1. ...\"），每行一句，不要额外解释或前后缀。"
    "即使某些句子很短，也要为每个编号输出对应翻译。"
)


def _chat_request(base: str, key: str, model: str, texts: list[str]) -> str:
    numbered = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(texts))
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{numbered}\n\n请只输出带编号的中文翻译，每行一条："},
        ],
        "temperature": 0.3,
        "max_tokens": 4096,
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    return (j["choices"][0]["message"].get("content") or "").strip()


def translate_with_providers(texts: list[str]) -> list[str]:
    """Try agnes first; on 429 switch to stepfun for this batch, then back to
    agnes on the next call (round-robin across batches)."""
    providers = [
        (AGNES_BASE, AGNES_KEY, AGNES_MODEL, "agnes"),
        (STEPFUN_BASE, STEPFUN_KEY, STEPFUN_MODEL, "stepfun"),
    ]
    # Try providers in order: agnes first, stepfun on 429/error
    last_err: Exception | None = None
    for base, key, model, name in providers:
        for attempt in range(3):
            try:
                text = _chat_request(base, key, model, texts)
                lines = [re.sub(r"^\s*\d+[.)]\s*", "", l).strip() for l in text.split("\n") if l.strip()]
                if lines:
                    return lines
                raise RuntimeError(f"{name} returned empty")
            except urllib.error.HTTPError as e:
                last_err = e
                if e.code == 429:
                    wait = 2 * (2 ** attempt)
                    print(f"    {name} 429, backing off {wait}s (attempt {attempt + 1}/3)", file=sys.stderr)
                    time.sleep(wait)
                    continue  # retry same provider
                break  # non-429: move to next provider
            except Exception as e:
                last_err = e
                time.sleep(2)
                break  # move to next provider
        print(f"    switching agnes->stepfun" if name == "agnes" and last_err else "", end="\n" if name == "agnes" and last_err else "")
    raise RuntimeError(f"translate failed on all providers: {last_err}")


def agnes_translate(texts: list[str]) -> list[str]:
    """Backward-compat wrapper."""
    return translate_with_providers(texts)


def translate_all(segs: list[dict], cache_file: str) -> list[dict]:
    """Translate en->zh in batches, persisting results incrementally to disk so
    an interruption never loses finished batches. Serial (CONCURRENCY=1) to
    stay under the agnes free-tier rate limit."""
    total = len(segs)
    # Load any partial progress already on disk
    done_zh: list[str] = []
    if os.path.exists(cache_file):
        with open(cache_file, encoding="utf-8") as f:
            done_zh = json.load(f)
        print(f"  translation cache: {len(done_zh)}/{total} already done")

    batches = [list(range(i, min(i + BATCH, total))) for i in range(0, total, BATCH)]
    out: list[str] = [""] * total
    if done_zh:
        for i, v in enumerate(done_zh):
            if v:
                out[i] = v

    for bi, idxs in enumerate(batches):
        if all(out[i] for i in idxs):
            continue  # already done
        texts = [segs[i]["en"] for i in idxs]
        try:
            res = agnes_translate(texts)
            for j, i in enumerate(idxs):
                out[i] = res[j] if j < len(res) else ""
        except Exception as e:
            print(f"    translate batch {bi} failed after retries: {e}", file=sys.stderr)
        # Persist every batch
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False)
        if (bi + 1) % 10 == 0:
            print(f"    translated {min((bi + 1) * BATCH, total)}/{total}")

    for i, s in enumerate(segs):
        s["zh"] = out[i]
    return segs


def insert_content(season: int, page: int, part_title: str, segs: list[dict], duration_s: int, cookie: str) -> bool:
    """Insert a VIDEO content row via parameterized SQL; returns False if already exists."""
    source_url = f"https://www.bilibili.com/video/{BV}?p={page}"
    segments_json = json.dumps(
        [
            {"en": s["en"], "zh": s.get("zh", ""), "start": int(s["start"] * 1000), "end": int(s["end"] * 1000)}
            for s in segs
        ],
        ensure_ascii=False,
    )
    translation = "\n".join(s.get("zh", "") for s in segs if s.get("zh"))
    content_text = "\n".join(s["en"] for s in segs)
    source = f"Key and Peele S{season}"

    import uuid
    new_id = str(uuid.uuid4())
    conn = db_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM contents WHERE source_url = %s;",
                (source_url,),
            )
            if cur.fetchone()[0] > 0:
                return False
            cur.execute(
                "INSERT INTO contents (id, type, title, source, source_url, author, content, translation, "
                "segments, duration, is_published, published_at, created_at, updated_at) "
                "VALUES (%s, 'VIDEO', %s, %s, %s, 'Key & Peele', %s, %s, %s, %s, true, now(), now(), now());",
                (new_id, part_title, source, source_url, content_text, translation, segments_json, duration_s),
            )
        conn.commit()
        return True
    finally:
        conn.close()


def load_progress() -> dict:
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_progress(p: dict) -> None:
    os.makedirs(WORKDIR, exist_ok=True)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--part", type=int, default=0, help="process only this season (1-5)")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    cookie = get_cookie()
    if not cookie:
        print("ERROR: no cookie", file=sys.stderr)
        sys.exit(1)

    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL, device="cuda", compute_type="int8", download_root=MODEL_DIR)

    pages = get_pages()
    print(f"BV {BV}: {len(pages)} parts")

    progress = load_progress()
    for page, p in enumerate(pages, start=1):
        if args.part and page != args.part:
            continue
        season = page
        cid = p["cid"]
        part_title = p.get("part") or f"Season {season}"
        duration_s = int(p.get("duration", 0))
        print(f"\n=== Season {season} ({duration_s}s): {part_title} ===")

        source_url = f"https://www.bilibili.com/video/{BV}?p={page}"
        key = f"s{season}"

        # Skip if already in DB (unless --force)
        if not args.force:
            exists = db_query(f"SELECT count(*) FROM contents WHERE source_url = '{source_url}';").strip()
            if exists and exists != "0":
                print("  already in DB, skip")
                continue
            if key in progress:
                print("  already in progress, skip")
                continue

        audio_path = os.path.join(WORKDIR, f"kp_s{season}.m4s")
        segs_cache = os.path.join(WORKDIR, f"kp_s{season}_segs.json")
        zh_cache = os.path.join(WORKDIR, f"kp_s{season}_zh.json")

        # 1) Transcription — cached on disk so an interruption never re-burns GPU time
        segs: list[dict] = []
        if os.path.exists(segs_cache):
            with open(segs_cache, encoding="utf-8") as f:
                segs = json.load(f)
            print(f"  transcription cache: {len(segs)} segments")

        if not segs:
            print("  downloading audio...")
            download_audio(cid, audio_path, cookie)
            print("  transcribing with whisper...")
            t0 = time.time()
            seg_iter, info = model.transcribe(
                audio_path, language="en", beam_size=5, word_timestamps=True, vad_filter=True,
            )
            for s in seg_iter:
                text = s.text.strip()
                if text:
                    segs.append({"start": s.start, "end": s.end, "en": text})
            elapsed = time.time() - t0
            print(f"  transcribed in {elapsed / 60:.1f} min, {len(segs)} segments")
            with open(segs_cache, "w", encoding="utf-8") as f:
                json.dump(segs, f, ensure_ascii=False)
            # free the audio as soon as transcription is persisted
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except Exception:
                pass

        if not segs:
            print("  ERROR: empty transcription", file=sys.stderr)
            continue

        # 2) Translation — incremental cache
        print("  translating with providers...")
        segs = translate_all(segs, zh_cache)

        # 2b) Self-check: retry any segments whose zh is still empty (up to 2
        # rounds), so no row ships with missing Chinese.
        for round_no in range(2):
            missing_idx = [i for i, s in enumerate(segs) if not s.get("zh") or len(s.get("zh", "").strip()) <= 1]
            if not missing_idx:
                break
            print(f"  self-check: {len(missing_idx)} segments missing zh, retrying (round {round_no + 1})...")
            try:
                texts = [segs[i]["en"] for i in missing_idx]
                res = translate_with_providers(texts)
                for j, i in enumerate(missing_idx):
                    if j < len(res) and res[j] and len(res[j]) > 1:
                        segs[i]["zh"] = res[j]
            except Exception as e:
                print(f"  self-check retry failed: {e}", file=sys.stderr)
            with open(zh_cache, "w", encoding="utf-8") as f:
                json.dump([s.get("zh", "") for s in segs], f, ensure_ascii=False)
        still_missing = sum(1 for s in segs if not s.get("zh") or len(s.get("zh", "").strip()) <= 1)
        if still_missing:
            print(f"  WARNING: {still_missing} segments still missing zh after retries", file=sys.stderr)

        print("  inserting into DB...")
        ok = insert_content(season, page, part_title, segs, duration_s, cookie)
        if ok:
            progress[key] = {"season": season, "segs": len(segs), "ts": time.time()}
            save_progress(progress)
            print(f"  OK: {len(segs)} segments inserted")
        else:
            print("  already existed (race), skip")

        # cleanup
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception:
            pass

    save_progress(progress)
    print("\n=== KP CRAWL DONE ===")


if __name__ == "__main__":
    main()
