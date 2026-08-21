#!/usr/bin/env python3
"""Patch the single remaining missing-zh segment in S5 ("said" @7194s)."""
import json
import sys

sys.path.insert(0, r"d:\work\java\AI-workspace\WordFlow\scripts")
from kp_crawl import translate_with_providers, db_conn

conn = db_conn()
try:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, segments FROM contents WHERE source = 'Key and Peele S5';"
        )
        row_id, segments = cur.fetchone()
        segs = segments if isinstance(segments, list) else json.loads(segments)

        missing_idx = [i for i, s in enumerate(segs) if not s.get("zh") or len(str(s.get("zh", "")).strip()) <= 1]
        print(f"missing: {missing_idx}")
        if not missing_idx:
            print("nothing to do")
            sys.exit(0)

        texts = [segs[i]["en"] for i in missing_idx]
        try:
            res = translate_with_providers(texts)
            for j, i in enumerate(missing_idx):
                if j < len(res) and res[j] and len(res[j].strip()) > 1:
                    segs[i]["zh"] = res[j].strip()
                    print(f"  [{i}] -> {res[j]}")
        except Exception as e:
            print(f"translate failed: {e}", file=sys.stderr)
            sys.exit(1)

        new_segments = json.dumps(segs, ensure_ascii=False)
        translation = "\n".join(s.get("zh", "") for s in segs if s.get("zh"))
        with conn.cursor() as cur2:
            cur2.execute(
                "UPDATE contents SET segments = %s::jsonb, translation = %s WHERE id = %s;",
                (new_segments, translation, row_id),
            )
        conn.commit()
        print("updated OK")
finally:
    conn.close()
