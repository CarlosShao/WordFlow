"""Test faster-whisper GPU transcription with word timestamps.

Downloads the model into D:\\work\\AI\\tools\\whisper-models (download_root),
transcribes the P1 test audio (copied from the container), prints segments +
word timestamps so we can validate accuracy before the full run.
"""
import os
import sys
import shutil
import time

MODEL_DIR = r"D:\work\AI\tools\whisper-models"
MODEL = "large-v3-turbo"

# Copy the P1 test audio out of the container (it lives in /tmp of the api container).
def fetch_test_audio():
    local = os.path.join(MODEL_DIR, "p1_test.m4s")
    if os.path.exists(local):
        return local
    os.makedirs(MODEL_DIR, exist_ok=True)
    r = os.system(
        'docker cp wordflow-api:/tmp/p1.m4s "{}"'.format(local)
    )
    if r != 0:
        print("docker cp failed — is wordflow-api running?", file=sys.stderr)
        sys.exit(1)
    return local


def main():
    audio_path = fetch_test_audio()
    print(f"[1/2] audio: {audio_path} ({os.path.getsize(audio_path) / 1024 / 1024:.1f} MB)")

    from faster_whisper import WhisperModel

    t0 = time.time()
    print(f"[2/2] loading {MODEL} into GPU (download_root={MODEL_DIR}) ...")
    # GTX 1060 is compute capability 6.1 — float16/int8_float16 are emulated.
    # Use int8 (weights quantized, activations float32) which IS supported on
    # Pascal and gives near-float32 accuracy at lower memory.
    model = WhisperModel(
        MODEL,
        device="cuda",
        compute_type="int8",
        download_root=MODEL_DIR,
    )
    print(f"      model loaded in {time.time() - t0:.1f}s")

    t0 = time.time()
    segments, info = model.transcribe(
        audio_path,
        language="en",
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
    )
    segs = list(segments)
    print(f"      transcribed in {time.time() - t0:.1f}s, {len(segs)} segments")
    print(f"      language={info.language} prob={info.language_probability:.2f}")

    for s in segs[:10]:
        words = ""
        if s.words:
            w = s.words[:6]
            words = " | ".join(f"{x.word.strip()}[{x.start:.2f}-{x.end:.2f}]" for x in w)
        print(f"  [{s.start:6.2f} - {s.end:6.2f}] {s.text.strip()[:70]}")
        if words:
            print(f"          words: {words}")

    print("\n=== DONE ===")


if __name__ == "__main__":
    main()
