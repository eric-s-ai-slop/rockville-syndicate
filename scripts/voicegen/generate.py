#!/usr/bin/env python3
"""
Voice clip generator (offline bake).

Reads lines.json (produced by extract-lines.ts) and voices.json, synthesizes
each line with XTTS-v2 cloned from that speaker's reference wav, and writes a
hashed MP3 into src/assets/audio/voice/<key>.mp3.

Incremental: a line whose MP3 already exists is skipped, so re-running after
adding dialogue only synthesizes the new lines.

Setup (one time):
    brew install ffmpeg
    python3.11 -m venv .venv-tts
    source .venv-tts/bin/activate
    pip install coqui-tts

Run:
    npx tsx scripts/voicegen/extract-lines.ts   # refresh lines.json
    source .venv-tts/bin/activate
    python scripts/voicegen/generate.py
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE.parent.parent / "src" / "assets" / "audio" / "voice"
MODEL = "tts_models/multilingual/multi-dataset/xtts_v2"

# Skip the interactive Coqui license prompt for unattended batch runs.
os.environ.setdefault("COQUI_TOS_AGREED", "1")


def main() -> None:
    voices = json.loads((HERE / "voices.json").read_text())
    lines = json.loads((HERE / "lines.json").read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    pending = [ln for ln in lines if not (OUT_DIR / f"{ln['key']}.mp3").exists()]
    print(f"{len(lines)} total lines, {len(pending)} to synthesize "
          f"({len(lines) - len(pending)} already cached).")
    if not pending:
        print("Nothing to do.")
        return

    # Load the model once — this is the slow part (and downloads ~2GB on first run).
    from TTS.api import TTS  # imported lazily so --help etc. stay fast
    print("Loading XTTS-v2 (first run downloads the model)...")
    tts = TTS(MODEL)  # CPU by default; fine for a batch job

    for i, ln in enumerate(pending, 1):
        speaker, text, key = ln["speaker"], ln["text"], ln["key"]
        ref = voices.get(speaker)
        if not ref:
            print(f"  [skip] {key}: no ref wav for speaker '{speaker}'")
            continue
        ref_path = HERE / ref
        if not ref_path.exists():
            print(f"  [skip] {key}: ref wav missing at {ref_path}")
            continue

        print(f"  [{i}/{len(pending)}] {speaker}: {text[:54]!r}")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = tmp.name
        try:
            tts.tts_to_file(
                text=text,
                speaker_wav=str(ref_path),
                language="en",
                file_path=wav_path,
            )
            mp3_path = OUT_DIR / f"{key}.mp3"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error",
                 "-i", wav_path, "-codec:a", "libmp3lame", "-qscale:a", "4",
                 str(mp3_path)],
                check=True,
            )
        finally:
            os.unlink(wav_path)

    print(f"Done. Clips in {OUT_DIR}")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        sys.exit(f"Missing file: {e}. Did you run extract-lines.ts first?")
