#!/usr/bin/env python3
"""Patch any Key & Peele season whose segments are missing zh.

Reads the season's cached segs/zh JSON (D:\\AI\\w\\kp_sN_*.json), retranslates
the empty ones with provider rotation, rewrites the cache AND updates the DB.

Usage: python fix_missing_zh.py [season]   # default: all seasons found on disk
"""
import json
import os
import sys

sys.path.insert(0, r"d:\work\java\AI-workspace\WordFlow\scripts")
from kp_crawl import translate_with_providers, db_conn

WORKDIR = r"D:\AI\w"


def fix_season(season: int) -> None:
    segs_path = os.path.join(WORKDIR, f"kp_s{season}_segs.json")
    zh_path = os.path.join(WORKDIR, f"kp_s{season}_zh.json")
    if not os.path.exists(segs_path) or not os.path.exists(zh_path):
        print(f"  S{season}: no cache files, skip")
        return
    with open(segs_path, encoding="utf-8") as f:
        segs = json.load(f)
    with open(zh_path, encoding="utf-8") as f:
        zh = json.load(f)

    # zh cache may be shorter than segs; pad it
    if len(zh) < len(segs):
        zh.extend([""] * (len(segs) - len(zh)))

    missing = [i for i, z in enumerate(zh) if not z or len(str(z).strip()) <= 1]
    print(f"  S{season}: {len(segs)} segs, {len(missing)} missing zh")

    # 2 retry rounds
    for round_no in range(2):
        missing = [i for i, z in enumerate(zh) if not z or len(str(z).strip()) <= 1]
        if not missing:
            break
        texts = [segs[i]["en"] for i in missing]
        try:
            res = translate_with_providers(texts)
            for j, i in enumerate(missing):
                if j < len(res) and res[j] and len(res[j]) > 1:
                    zh[i] = res[j]
                    print(f"    [{i}] -> {res[j][:50]}")
        except Exception as e:
            print(f"    retry round {round_no + 1} failed: {e}", file=sys.stderr)
        with open(zh_path, "w", encoding="utf-8") as f:
            json.dump(zh, f, ensure_ascii=False)

    still = sum(1 for z in zh if not z or len(str(z).strip()) <= 1)
    if still:
        print(f"  WARNING S{season}: {still} still missing zh", file=sys.stderr)
        return

    # Update DB
    segments_json = json.dumps(
        [
            {"en": s["en"], "zh": zh[i], "start": int(s["start"] * 1000), "end": int(s["end"] * 1000)}
            for i, s in enumerate(segs)
        ],
        ensure_ascii=False,
    )
    conn = db_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE contents SET segments = %s::jsonb, translation = %s WHERE source = %s;",
                (segments_json, "\n".join(z for z in zh if z), f"Key and Peele S{season}"),
            )
        conn.commit()
        print(f"  S{season}: DB updated OK")
    finally:
        conn.close()


def main() -> None:
    args = sys.argv[1:]
    if args:
        seasons = [int(a) for a in args if a.isdigit()]
    else:
        # auto-detect seasons from cache files
        seasons = []
        for fn in os.listdir(WORKDIR):
            m = fn.startswith("kp_s") and fn.endswith("_segs.json")
            if m:
                seasons.append(int(fn[4:fn.index("_segs")]))
        seasons = sorted(set(seasons))
    print(f"seasons to fix: {seasons}")
    for s in seasons:
        fix_season(s)


if __name__ == "__main__":
    main()
