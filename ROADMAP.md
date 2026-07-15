# Roadmap

## Current Foundations

- Agent work routes through a drift-tested context map covering code domains and verification commands.
- The always-loaded agent guide routes common task intents to existing capabilities before agents search broadly or invent helpers.
- Compact validation selects focused tests from changed files, enforces zero-warning lint and dependency directions, and safely falls back to the full server-free suite.
- Chapter/mode registries have compact machine-readable reports, typed mode-config contracts, and conformance tests; AST declaration ranges are opt-in.
- Live-server CLI protocol tests are isolated from unit tests and run against the already-started gauntlet server in CI.
- Chapters have a minimal scaffolder and typed per-chapter image manifests.
- React story/QTE bridges and Phaser chase behavior live in focused modules; scene subsystems use narrow structural contracts.

Agent infrastructure is frozen at this foundation. Reopen tooling work only for a demonstrated defect/drift or a workflow failure observed at least three times; require a measured token/time benefit before adding machinery.

## Tech Debt

### 🟠 Boss and combat AI behaviors are procedurally hardcoded
`src/game/modes/` — Complex behaviors (boss attack loops, bullet patterns, NPC movement AI) are procedurally coded inside TypeScript files.
**Future Plan:** Parse these behaviors from declarative configs (e.g., `boss_patterns.json`) using a state machine/behavior tree parser so LLM agents and designers can modify/add attack behaviors without modifying core engine logic.
