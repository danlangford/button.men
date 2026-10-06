# Tasks

## 1. Reusable log parser

- [x] 1.1 Add pure helpers to parse Buttonweavers die notations and attack messages, and verify standard, skill, swing, and malformed notation with unit tests.
- [x] 1.2 Reconstruct attack and post-attack snapshots backward from current data, and verify captures, rerolls, actor mapping, skipped entries, and exact final state.

## 2. Replay game view

- [ ] 2.1 Add replay controls, separate attack/result steps, past-state read-only indication, and current-state return; verify boundaries and controls with UI tests.
- [ ] 2.2 Mark attackers and targets in both flat and 3D views and show the best-effort limitation; verify markers are textually distinct and current rendering remains intact.
- [ ] 2.3 Add hash-step deep links, invalid-step fallback notice, and current-state default; verify valid, invalid, and missing step routing.

## 3. Integration validation

- [ ] 3.1 Run OpenSpec strict validation, lint, unit tests, and browser tests; resolve regressions and verify the final diff is limited to replay.
