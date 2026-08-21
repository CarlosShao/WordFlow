"""Benchmark faster-whisper transcription speed on a 10-minute audio clip."""
import os
import time

from faster_whisper import WhisperModel

MODEL_DIR = r"D:\work\AI\tools\whisper-models"
AUDIO = r"D:\AI\w\kp_p1_10min.mp3"


def main():
    t0 = time.time()
    model = WhisperModel("large-v3-turbo", device="cuda", compute_type="int8", download_root=MODEL_DIR)
    print(f"model loaded in {time.time() - t0:.1f}s")

    t0 = time.time()
    segs, info = model.transcribe(
        AUDIO, language="en", beam_size=5, word_timestamps=True, vad_filter=True,
    )
    seg_list = list(segs)
    elapsed = time.time() - t0
    n_chars = sum(len(s.text) for s in seg_list)
    print(f"transcribed 600s audio in {elapsed:.1f}s -> {600 / elapsed:.1f}x realtime")
    print(f"segments={len(seg_list)}, chars={n_chars}")
    print(f"per-hour: {3600 / (600 / elapsed):.0f}s wall -> ~{(3600 / (600 / elapsed) / 60):.1f} min per hour of audio")


if __name__ == "__main__":
    main()
