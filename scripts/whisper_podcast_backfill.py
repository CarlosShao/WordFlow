#!/usr/bin/env python3
"""
Local faster-whisper re-transcription backfill for PODCAST contents.

Podcasts in the DB currently have tiny/empty subtitles because the crawler only
falls back to ASR when the RSS body is short, and even then it uses yt-dlp
auto-subtitles (which podcast feeds don't provide). This script gives every
podcast REAL word-level timestamps from local faster-whisper instead.

Pipeline per podcast:
  1. Read row from DB (id, title, audio_url).
  2. Decode HTML entities in audio_url (&amp; -> &) and download the audio.
  3. Whisper transcribe (language=en, word_timestamps=True, vad_filter=True).
  4. Assemble segments: one per Whisper sentence, start/end = real seconds.
  5. Write segments (ms timestamps) + content (en text). Leave translation/zh
     to the Node translate step (scripts/translate_podcast.ts).
  6. UPDATE contents SET segments, content.

Resumable: writes a progress file; --limit / --offset / --ids control scope.
Idempotent: re-running overwrites segments for the same rows (unless skipped).

Usage:
  python whisper_podcast_backfill.py --limit=1
  python whisper_podcast_backfill.py --ids=<uuid>,<uuid>
  python whisper_podcast_backfill.py --force
"""
import argparse
import html
import json
import os
import subprocess
import sys
import time
import urllib.request

MODEL_DIR = r"D:\work\AI\tools\whisper-models"
MODEL = "large-v3-turbo"
WORKDIR = r"D:\AI\w"
PROGRESS_FILE = os.path.join(WORKDIR, "progress_podcast.json")
if not os.path.exists(WORKDIR):
    os.makedirs(WORKDIR, exist_ok=True)
# Short system temp to avoid Windows MAX_PATH (260) issues from ctranslate2.
for k in ("TMP", "TEMP", "TMPDIR"):
    os.environ[k] = WORKDIR

PSQL = ["docker", "exec", "wordflow-postgres", "psql", "-U", "wordflow", "-d", "wordflow", "-t", "-A", "-c"]
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def db_query(sql: str) -> str:
    r = subprocess.run(PSQL + [sql], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(f"psql failed: {r.stderr[:500]}")
    return r.stdout


def db_exec(sql: str) -> None:
    # Pass SQL via stdin (-f -) instead of `-c "<sql>"` to avoid the Windows
    # command-line length limit (WinError 206) when segments JSON is huge.
    cmd = [
        "docker", "exec", "-i", "wordflow-postgres",
        "psql", "-U", "wordflow", "-d", "wordflow", "-q", "-f", "-",
    ]
    r = subprocess.run(cmd, input=sql, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(f"psql exec failed: {r.stderr[:500]}")


def download_audio(url: str, dest: str) -> str:
    if os.path.exists(dest):
        return dest
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    return dest


def segments_to_json(segs: list[dict]) -> str:
    return json.dumps(
        [{"en": s["en"], "zh": "", "start": int(s["start"] * 1000), "end": int(s["end"] * 1000)} for s in segs],
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
    ap.add_argument("--device", type=str, default="cuda", choices=["cuda", "cpu"],
                    help="inference device (default cuda; GTX 1060 uses int8_float32)")
    ap.add_argument("--compute-type", type=str, default="int8_float32",
                    help="ctranslate2 compute type (int8_float32 for Pascal GPUs)")
    args = ap.parse_args()

    if args.ids:
        id_list = ",".join(f"'{x.strip()}'" for x in args.ids.split(",") if x.strip())
        rows_sql = f"SELECT id, title, audio_url FROM contents WHERE id IN ({id_list}) ORDER BY title;"
    else:
        limit_clause = f"LIMIT {args.limit}" if args.limit > 0 else ""
        rows_sql = (
            "SELECT id, title, audio_url FROM contents "
            "WHERE type='PODCAST' AND audio_url IS NOT NULL AND audio_url <> '' "
            f"ORDER BY source, title {limit_clause} OFFSET {args.offset};"
        )
    out = db_query(rows_sql)
    rows = []
    for line in out.strip().splitlines():
        parts = line.split("|")
        if len(parts) >= 3:
            rows.append({"id": parts[0].strip(), "title": parts[1].strip(), "url": parts[2].strip()})
    print(f"rows to process: {len(rows)}")

    from faster_whisper import WhisperModel
    # GPU-first: ctranslate2 sees the NVIDIA GPU (GTX 1060, Pascal CC 6.1).
    # Pascal does NOT support float16, so use int8_float32 (int8 weights + fp32
    # activations) — a big speedup over the CPU path the previous run used.
    model = WhisperModel(MODEL, device=args.device, compute_type=args.compute_type, download_root=MODEL_DIR)

    progress = load_progress()
    ok = fail = skip = 0
    for i, row in enumerate(rows):
        key = row["id"]
        if not args.force and key in progress:
            skip += 1
            continue
        print(f"[{i + 1}/{len(rows)}] {row['title'][:50]} ({row['id'][:8]})")
        audio_path = os.path.join(WORKDIR, f"{row['id'][:8]}.mp3")
        cache_path = os.path.join(WORKDIR, f"segs_{row['id'][:8]}.json")
        en_segs = []
        try:
            # Resume: if a previous run already transcribed this audio (and we
            # were killed before writing to DB), reuse the cached segments JSON
            # instead of re-running whisper (which takes 30+ min on CPU).
            if os.path.exists(cache_path) and not args.force:
                with open(cache_path, encoding="utf-8") as f:
                    en_segs = json.load(f)
                print(f"    RESUME from cache ({len(en_segs)} segs)")
            else:
                url = html.unescape(row["url"])
                download_audio(url, audio_path)

                segs_iter, info = model.transcribe(
                    audio_path, language="en", beam_size=5, word_timestamps=True, vad_filter=True,
                )
                for s in segs_iter:
                    text = s.text.strip()
                    if text:
                        en_segs.append({"start": float(s.start), "end": float(s.end), "en": text})
                if not en_segs:
                    raise RuntimeError("empty transcription")
                # Persist immediately so a crash/restart doesn't lose the work.
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(en_segs, f, ensure_ascii=False)
                print(f"    transcribed segs={len(en_segs)} lang={info.language} (cached)")

            segs_json = segments_to_json(en_segs)
            content = "\n".join(s["en"] for s in en_segs)
            esc = segs_json.replace("'", "''")
            content_esc = content.replace("'", "''")
            db_exec(
                f"UPDATE contents SET segments='{esc}', content='{content_esc}' "
                f"WHERE id='{row['id']}';"
            )
            progress[key] = {"title": row["title"], "ts": time.time(), "segs": len(en_segs), "chars": len(content)}
            save_progress(progress)
            ok += 1
            print(f"    OK segs={len(en_segs)} chars={len(content)}")
        except Exception as e:
            fail += 1
            print(f"    FAIL {e}", file=sys.stderr)
        finally:
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except Exception:
                pass
        if (i + 1) % 3 == 0:
            save_progress(progress)

    save_progress(progress)
    print(f"\n=== DONE ok={ok} fail={fail} skip={skip} ===")


if __name__ == "__main__":
    main()
