# Roadmap

## Current Foundations

- Agent work routes through a drift-tested context map covering code domains and verification commands.
- Compact validation selects focused tests from changed files and safely falls back to the full suite.
- Chapters have a minimal scaffolder and typed per-chapter image manifests.
- React story/QTE bridges and Phaser chase behavior live in focused modules; scene subsystems use narrow structural contracts.

## Tech Debt

### 🟠 Boss and combat AI behaviors are procedurally hardcoded
`src/game/modes/` — Complex behaviors (boss attack loops, bullet patterns, NPC movement AI) are procedurally coded inside TypeScript files.
**Future Plan:** Parse these behaviors from declarative configs (e.g., `boss_patterns.json`) using a state machine/behavior tree parser so LLM agents and designers can modify/add attack behaviors without modifying core engine logic.
