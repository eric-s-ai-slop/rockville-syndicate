# Roadmap

## Tech Debt

### 🟠 Boss and combat AI behaviors are procedurally hardcoded
`src/game/modes/` — Complex behaviors (boss attack loops, bullet patterns, NPC movement AI) are procedurally coded inside TypeScript files.
**Future Plan:** Parse these behaviors from declarative configs (e.g., `boss_patterns.json`) using a state machine/behavior tree parser so LLM agents and designers can modify/add attack behaviors without modifying core engine logic.
