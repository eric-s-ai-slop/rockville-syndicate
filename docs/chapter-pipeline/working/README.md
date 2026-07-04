# Working Drafts — Status Ledger

Per-chapter scratch output from the pipeline stages. **Once a chapter ships, its draft
here is a stale snapshot** — the canonical config lives in `src/data/chapters/`, and any
`.ts` file in these folders will drift from the live one. Never copy code from a shipped
draft back into `src/`; verify against the source.

| Folder | Status | Shipped as |
|--------|--------|-----------|
| `maria_brooke/` | ✅ shipped | `src/data/chapters/chapter0.maria-brooke.ts` |
| `ben_umbc/` | ✅ shipped | `src/data/chapters/chapter3b.umbc-incident.ts` (draft filename says "chapter10" — ignore it) |
| `rose/` | ✅ shipped | `src/data/chapters/chapter5b.rose.ts` |
| `cabin_from_hell_2025/` | ✅ shipped | `src/data/chapters/chapter11.cabin-from-hell.ts` |
| `new_ben_game/` | 💤 unshipped plan | benTrivia mode exists (`src/game/modes/benTrivia/`) but is not wired into a chapter |

When adding a new working folder, add a row here. When a chapter ships, flip its row to
✅ instead of deleting the folder (the briefs/specs stay useful as design history).
