#!/usr/bin/env python3
"""
One-off: synthesize a single line and write it to public/voice/.

Used for the hand-placed "You're next." clip — the full pipeline (generate.py)
is for bulk voicing. Run inside the venv:

    scripts/voicegen/.venv-tts/bin/python scripts/voicegen/gen_one.py

Edit REF / TEXT / OUT below to make another one-off.
"""
import os
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

REF = HERE / "refs" / "Ben_voice.wav"
TEXT = "You're next."
OUT = ROOT / "public" / "voice" / "ben_youre_next.mp3"

os.environ.setdefault("COQUI_TOS_AGREED", "1")


def main() -> None:
    assert REF.exists(), f"reference wav not found: {REF}"
    OUT.parent.mkdir(parents=True, exist_ok=True)

    from TTS.api import TTS
    print("Loading XTTS-v2 (first run downloads ~2GB)...")
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = tmp.name
    try:
        print(f"Synthesizing: {TEXT!r}")
        tts.tts_to_file(text=TEXT, speaker_wav=str(REF), language="en", file_path=wav)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error",
             "-i", wav, "-codec:a", "libmp3lame", "-qscale:a", "4", str(OUT)],
            check=True,
        )
    finally:
        os.unlink(wav)

    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
