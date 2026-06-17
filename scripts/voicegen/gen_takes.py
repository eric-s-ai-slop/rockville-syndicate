#!/usr/bin/env python3
"""
Generate N takes of a single line for auditioning.

XTTS samples stochastically, so each take differs. Writes numbered MP3s to
public/voice/takes/ — listen, then copy the best over the real path:

    cp public/voice/takes/ben_youre_next_03.mp3 public/voice/ben_youre_next.mp3

Run (model loads once, then N quick synths):

    COQUI_TOS_AGREED=1 scripts/voicegen/.venv-tts/bin/python scripts/voicegen/gen_takes.py
"""
import os
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

REF = HERE / "refs" / "Ben_voice.wav"
TEXT = "You're next."
TAKES = 7
OUT_DIR = ROOT / "public" / "voice" / "takes"
NAME = "ben_youre_next"

os.environ.setdefault("COQUI_TOS_AGREED", "1")


def main() -> None:
    assert REF.exists(), f"reference wav not found: {REF}"
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    from TTS.api import TTS
    print("Loading XTTS-v2...")
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

    for i in range(1, TAKES + 1):
        out = OUT_DIR / f"{NAME}_{i:02d}.mp3"
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav = tmp.name
        try:
            print(f"  take {i}/{TAKES} -> {out.name}")
            tts.tts_to_file(text=TEXT, speaker_wav=str(REF), language="en", file_path=wav)
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error",
                 "-i", wav, "-codec:a", "libmp3lame", "-qscale:a", "4", str(out)],
                check=True,
            )
        finally:
            os.unlink(wav)

    print(f"\nDone. {TAKES} takes in {OUT_DIR}")
    print(f"Pick one and copy it over the live clip:")
    print(f"  cp {OUT_DIR.relative_to(ROOT)}/{NAME}_NN.mp3 public/voice/{NAME}.mp3")


if __name__ == "__main__":
    main()
