# Playthrough: Chapter

Reached: unverified runtime state — incomplete-coverage
Investigation verdict: inconclusive
Pending checkpoints: none
Run integrity: natural

## Findings

No actionable findings were recorded.
## Coverage

- Scenes reviewed: 0/0
- Choice options exercised: 0
- Walk objectives observed: 0
- Mode attempts observed: 0
- Passive evidence: 0 captured, 0 missed
- Terminal observed: no

Raw execution trace: `qa/release-smoke-tty/session.jsonl`

<!-- omega-playtest-session
{
  "ok": false,
  "completion_status": "incomplete-coverage",
  "errors": 0,
  "warnings": 0,
  "playtest_integrity": "natural",
  "bypasses": [],
  "audit": [],
  "visual_qa": {
    "status": "complete",
    "captured": 6,
    "reviewed": 6,
    "pending": [],
    "reviews": [
      {
        "checkpointId": 1,
        "verdict": "issue-found",
        "note": "Initial scene checkpoint is almost entirely black; only the HUD and a tiny blue mark are visible, so the chapter title/scene presentation is not usable evidence.",
        "timestamp": 1784004397320
      },
      {
        "checkpointId": 2,
        "verdict": "clear",
        "note": "The clinic map, four actors, labels, and dialogue panel are visible and readable with no clipping or black-bar framing.",
        "timestamp": 1784004413128
      },
      {
        "checkpointId": 3,
        "verdict": "clear",
        "note": "Foreground Audrey encounter presentation is visible with the red encounter panel, readable text, player/NPC shadows, and no clipped HUD or black-bar framing.",
        "timestamp": 1784004560396
      },
      {
        "checkpointId": 4,
        "verdict": "clear",
        "note": "Social Collapse loss screen is centered and readable, with the skull, failure message, and RETRY button visible without clipping.",
        "timestamp": 1784004680092
      },
      {
        "checkpointId": 5,
        "verdict": "clear",
        "note": "Chapter title card is centered and readable with the chapter title, subtitle, and location badge visible against the black backdrop.",
        "timestamp": 1784004732981
      },
      {
        "checkpointId": 6,
        "verdict": "clear",
        "note": "Clinic actors, prop art, labels, and group-chat dialogue are visible and readable with the scene framed without black bars or clipping.",
        "timestamp": 1784004740991
      }
    ],
    "reasons": []
  },
  "coverage": {
    "scenes": {
      "checkpointed": [],
      "reviewed": []
    },
    "choices": [],
    "walks": [],
    "modes": [],
    "terminalObserved": false,
    "passive": {
      "captured": [],
      "missed": []
    }
  },
  "investigation_verdict": "inconclusive",
  "findings": []
}
omega-playtest-session -->
