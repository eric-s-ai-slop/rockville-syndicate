# Playthrough: The Suds & Soles Pool Party

Reached: beat 74 of 74 — incomplete-integrity
Pending checkpoints: none
Run integrity: partially-bypassed
Overall progress: 86%

## Findings

### F001 — [P1] Walkto command to Hot Tub failed

- Category: friction
- Location: scene 0 beat 37
- Reproduction: Attempt to walk to '🌊 Join the crew at the Hot Tub'
- Expected: Player navigates around pool to reach target
- Actual: Player gets stuck on the pool geometry and command times out
- Evidence: observe-shot-002.png

## Coverage

- Coverage obligations: 10/24
- Scenes reviewed: 1/1
- Choice options exercised: 6
- Walk objectives observed: 2
- Mode attempts observed: 1
- Passive evidence: 2 captured, 0 missed
- Terminal observed: yes

Raw execution trace: `qa/suds_and_soles_pool_party/session.jsonl`

<!-- omega-playtest-session
{
  "ok": false,
  "completion_status": "incomplete-integrity",
  "errors": 0,
  "warnings": 0,
  "playtest_integrity": "partially-bypassed",
  "bypasses": [
    {
      "command": "skipbeat",
      "reason": "A beat was force-skipped before natural verification.",
      "timestamp": 1783972017263
    }
  ],
  "audit": [],
  "visual_qa": {
    "status": "complete",
    "captured": 6,
    "reviewed": 6,
    "pending": [],
    "reviews": [
      {
        "checkpointId": 1,
        "verdict": "clear",
        "note": "Title card is centered and fully visible",
        "timestamp": 1783970158870
      },
      {
        "checkpointId": 2,
        "verdict": "clear",
        "note": "Jacob is placed at the bottom center and pool map loaded properly",
        "timestamp": 1783970158969
      },
      {
        "checkpointId": 3,
        "verdict": "clear",
        "note": "Camera panned to show Jacob and Nick F at the grill with the left map edge visible",
        "timestamp": 1783971527316
      },
      {
        "checkpointId": 4,
        "verdict": "clear",
        "note": "Camera panned right slightly, hot tub group visible, left map edge visible",
        "timestamp": 1783971711254
      },
      {
        "checkpointId": 5,
        "verdict": "clear",
        "note": "Final state of the chapter looks correct, characters are by the pool",
        "timestamp": 1783972720156
      },
      {
        "checkpointId": 6,
        "verdict": "clear",
        "note": "Final scorecard shown",
        "timestamp": 1783972739292
      }
    ],
    "reasons": []
  },
  "coverage": {
    "scenes": {
      "checkpointed": [
        0
      ],
      "reviewed": [
        0
      ]
    },
    "choices": [
      {
        "sceneIndex": 0,
        "beatIndex": 6,
        "optionIndex": 0,
        "optionText": "Deploy the nuclear option: 20 lbs of ice. Right now."
      },
      {
        "sceneIndex": 0,
        "beatIndex": 15,
        "optionIndex": 0,
        "optionText": "\"Yeah, they're single.\" — Confirm the intel."
      },
      {
        "sceneIndex": 0,
        "beatIndex": 34,
        "optionIndex": 0,
        "optionText": "\"Jacob I literally texted you. Four. Peach. Red Bulls.\""
      },
      {
        "sceneIndex": 0,
        "beatIndex": 42,
        "optionIndex": 0,
        "optionText": "\"I'll take that bet. $3 says they don't come back.\""
      },
      {
        "sceneIndex": 0,
        "beatIndex": 50,
        "optionIndex": 0,
        "optionText": "\"Jacob. What in the world are you saying right now.\""
      },
      {
        "sceneIndex": 0,
        "beatIndex": 59,
        "optionIndex": 1,
        "optionText": "\"Leave it. I genuinely cannot wait to see this.\""
      }
    ],
    "walks": [
      {
        "sceneIndex": 0,
        "beatIndex": 3,
        "attempts": 1,
        "successes": 1,
        "failures": 0
      },
      {
        "sceneIndex": 0,
        "beatIndex": 37,
        "attempts": 2,
        "successes": 0,
        "failures": 2
      }
    ],
    "modes": [
      {
        "id": "poolParty",
        "beatIndex": 0,
        "kind": "background",
        "inputs": {
          "count": 0,
          "keyboard": 0,
          "pointer": 0,
          "drag": 0
        },
        "ending": "natural"
      }
    ],
    "terminalObserved": true,
    "passive": {
      "captured": [
        "0:19:cameraPan",
        "0:29:cameraPan"
      ],
      "missed": []
    }
  },
  "chapter": {
    "id": "suds_and_soles_pool_party",
    "title": "The Suds & Soles Pool Party"
  },
  "findings": [
    {
      "id": "F001",
      "severity": "P1",
      "category": "friction",
      "title": "Walkto command to Hot Tub failed",
      "location": "scene 0 beat 37",
      "reproduction": "Attempt to walk to '🌊 Join the crew at the Hot Tub'",
      "expected": "Player navigates around pool to reach target",
      "actual": "Player gets stuck on the pool geometry and command times out",
      "evidence": "observe-shot-002.png",
      "status": "open",
      "timestamp": 1783972001119
    }
  ],
  "progress": {
    "schema": "omega-playtest-progress-v1",
    "chapter": {
      "id": "suds_and_soles_pool_party",
      "title": "The Suds & Soles Pool Party"
    },
    "status": "incomplete-integrity",
    "overallPercent": 86,
    "bar": "[█████████████████░░░] 86%",
    "story": {
      "currentBeat": 73,
      "farthestBeat": 73,
      "totalBeats": 74,
      "percent": 100
    },
    "coverage": {
      "completed": 10,
      "total": 24,
      "percent": 42,
      "breakdown": {
        "scenes": {
          "completed": 1,
          "total": 1
        },
        "choices": {
          "completed": 6,
          "total": 18
        },
        "walks": {
          "completed": 1,
          "total": 3
        },
        "foregroundModes": {
          "completed": 0,
          "total": 0
        },
        "backgroundModes": {
          "completed": 1,
          "total": 1
        },
        "terminal": {
          "completed": 1,
          "total": 1
        }
      }
    },
    "visualQa": {
      "captured": 6,
      "reviewed": 6,
      "pending": [],
      "percent": 100
    },
    "findings": {
      "open": 1,
      "dismissed": 0,
      "total": 1
    },
    "updatedAt": "2026-07-13T19:59:12.257Z"
  }
}
omega-playtest-session -->
