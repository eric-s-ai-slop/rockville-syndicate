# Voice generation (offline bake)

Pre-generate character voice clips with XTTS-v2 and commit the MP3s. The game
loads them as static assets — no model, server, or runtime synthesis required.

## How it fits together

```
voices.json        speaker id -> reference wav (you edit this)
refs/*.wav         6-30s clean mono sample per character (you provide)
extract-lines.ts   walks CHAPTERS -> lines.json (every voiced line + its key)
generate.py        lines.json -> src/assets/audio/voice/<key>.mp3
```

The clip **key** is `sha1("<speaker>|<line text>").slice(0,12)`. The runtime
loader recomputes the same key to find the clip, so there's nothing to register
and editing a line auto-invalidates its old clip.

## One-time setup

Run everything from the repo root. The venv lives at `scripts/voicegen/.venv-tts`
(gitignored). coqui-tts does **not** pull in its own torch stack, and its 0.27.x
release sits in an awkward dependency window, so the install is four steps, not one:

```bash
brew install ffmpeg

# NOTE: use 3.12. Homebrew's python@3.11 currently ships a broken pyexpat
# (libexpat symbol mismatch) that breaks `python -m venv` at the ensurepip step.
python3.12 -m venv scripts/voicegen/.venv-tts
V=scripts/voicegen/.venv-tts/bin

$V/pip install coqui-tts
$V/pip install torch torchaudio
$V/pip install "transformers>=4.49,<5"   # 5.x removed isin_mps_friendly, which coqui-tts 0.27 imports
$V/pip install torchcodec                # torch 2.9+ requires it for audio IO
```

Verify the stack before generating:

```bash
scripts/voicegen/.venv-tts/bin/python -c "import torch, TTS; from TTS.api import TTS; print('OK')"
```

If a future `pip install coqui-tts` resolves a different version, the exact pins
above may shift — the failure mode is always an `ImportError` on a transformers
symbol; pin transformers up or down until `import TTS` is clean.

## Add reference voices

1. For each character, drop a 6-30s clean **mono wav** at `refs/<speaker>.wav`
   (the path in `voices.json`). One person, no music, minimal noise.
2. List the speaker -> ref mapping in `voices.json`. Only speakers listed there
   get voiced. The id must match `beat.speaker` in the chapter configs
   (e.g. `ben`, `maharko`, `eric`, `nick_f`).

No real recording of a character? Use any consenting voice sample that fits —
XTTS clones whatever wav you give it.

## Generate — one-off single clip

For a single hand-placed line (e.g. Ben's "You're next."). Output goes to
`public/voice/<name>.mp3` and the game loads it by URL — a missing file just
stays silent, so the build never breaks on it.

```bash
COQUI_TOS_AGREED=1 scripts/voicegen/.venv-tts/bin/python scripts/voicegen/gen_one.py
```

Edit `REF` / `TEXT` / `OUT` at the top of `gen_one.py` to cut another one-off.
First run downloads the ~2GB XTTS-v2 model; later runs are fast.

Currently wired one-offs (load + play already in code, just drop the MP3):

| line | output path | played by |
|------|-------------|-----------|
| Ben — "You're next." | `public/voice/ben_youre_next.mp3` | `basementScene` mode `onDialogue`, key `sfx_ben_youre_next` |

## Generate — bulk pipeline

For voicing many lines at once. Output goes to `src/assets/audio/voice/<key>.mp3`
(hash-named) and the runtime loader finds clips by recomputing the key.

```bash
npx tsx scripts/voicegen/extract-lines.ts                 # refresh the work list
COQUI_TOS_AGREED=1 scripts/voicegen/.venv-tts/bin/python scripts/voicegen/generate.py
```

Then commit the new MP3s under `src/assets/audio/voice/`. Re-running is
incremental — only lines without an existing clip are synthesized.

> The two flows use different load strategies on purpose: one-offs load by URL
> from `public/` (resilient, hand-managed); the bulk pipeline loads hash-named
> clips from `src/assets/` via the glob loader (zero registration). The bulk
> runtime loader is not wired yet — see the handoff notes.

## Notes

- **Determinism:** XTTS samples, so each synth varies slightly. You commit the
  takes you like; they won't change on someone else's machine.
- **Short lines** ("You're next.") can get odd prosody. If a clip sounds clipped,
  re-run that one — delete its MP3 and regenerate, or temporarily pad the text
  ("You're next. You're next.") and trim the second half in an editor.
- **Speed/voice tuning:** pass `speed=` to `tts.tts_to_file` in `generate.py` for
  per-character pacing, or set it per speaker in `voices.json` and thread it
  through if you want finer control.
- **Choices:** v1 only voices `dialogue` beats. To voice choice reactions, extend
  the loop in `extract-lines.ts` (noted inline).
