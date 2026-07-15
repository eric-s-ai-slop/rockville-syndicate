# Agent Tooling Implementation Specification

Implementation-ready improvements for making repository tasks faster, cheaper,
and easier to verify. This document is a backlog and contract, not evidence that
an item has shipped.

## Pause Real-Time Gameplay During Required Checkpoint Review

**Observed:** 2026-07-15, while playtesting Chapter 13 minigames with
`--playtest --repl --checkpoints`.

When a foreground-mode checkpoint is emitted, the agent must inspect and review
the PNG before any other state-changing command is accepted. The Phaser loop
continues running during that external inspection, while `pause` is rejected
because the checkpoint is still pending. Timed modes can therefore expire or
hit a stationary player before the required visual review is complete. This
made normal-input coverage inaccurate for the Rust and Patient Zero modes.

**Request:** Automatically pause the game loop when a required foreground-mode
checkpoint is emitted, then resume it after `reviewcheckpoint`, or allow `pause`
as the sole state-changing command while visual review is pending.

**Acceptance criteria:**

- A timed foreground mode does not advance while its required checkpoint awaits
  review.
- Reviewing the checkpoint restores the prior loop state without altering the
  mode timer, physics, tweens, or input state.
- An agent can inspect the PNG, submit `reviewcheckpoint`, and then make a normal
  keyboard or pointer attempt before the mode resolves.
- Background-mode and ordinary scene checkpoints retain explicitly documented
  behavior so automatic pausing cannot silently change story timing.
