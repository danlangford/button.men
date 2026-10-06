# Design

## Context

The game view receives the current board and `gameActionLog` from the existing
`loadGameData` API. Upstream `BMInterface::load_api_game_data` returns the
current game data and human-readable log entries; it does not return historical
board snapshots. `BMGameAction::friendly_message_attack` formats attack
messages from `preAttackDice` and `postAttackDice`, including the pre-attack
attacker and defender notation and post-attack captures and rerolls.
Upstream source references: `src/engine/BMInterface.php::load_api_game_data`,
`src/engine/BMInterfaceGameAction.php::load_game_action_log`,
`src/engine/BMGameAction.php::friendly_message_attack`,
`src/engine/BMGameAction.php::messageAttacker` /
`messageDefender`, and
`src/engine/BMSkill.php::skill_name_abbreviation_mapping` (`z` is Speed).

## Goals / Non-Goals

**Goals:**

- Reconstruct useful attack and result views from the log data currently
  available, without moving game rules or state authority into button.men.
- Keep log parsing pure and reusable outside the game-view renderer.
- Keep replay read-only and preserve the exact API-provided current board.

**Non-Goals:**

- Guarantee exact historical state where logs omit a change or an earlier
  entry is outside the API's returned log window.
- Reimplement attack legality, game rules, or submit actions from replay.

## Decisions

- **Parse upstream attack prose into data, then walk it backward from the
  current board.** `BMGameAction::friendly_message_attack` uses a stable
  `using [...] against [...]` pre-attack clause and appends defender and attacker
  outcomes. Reverse walking lets each parsed attack seed its pre-attack dice
  from the log while retaining unaffected dice from the nearest known state.
  A parser failure skips that entry rather than inventing dice or blocking
  other valid steps. Parsing the internal database action representation is
  not possible through the current public API.
- **Expose a pure parser module.** Export functions that parse die descriptors
  and build replay steps from `{player, message}` logs plus the current player
  data. This avoids coupling parsing to DOM/API concerns and permits reuse.
- **Interpret known die recipe forms conservatively.** The value after the last
  colon is the displayed roll; side count comes from an explicit swing value or
  recipe size, and recipe skill prefixes are retained as notation. For example,
  `z(8):3` is an 8-sided die showing 3 and `V=6:3` is a 6-sided V swing showing
  3. Unknown fields are inherited from a matching current die when possible.
- **Use all action-log entries returned by the API, in timestamp order.** Replay
  omits chat, gives each non-attack action entry (including passes and option
  selection) a best-effort event step, inserts separate attack and result steps,
  and always appends the exact current state. A non-attack event retains the
  nearest reconstructed board because the public log does not provide snapshots.
- **Reuse the existing game screen and 3D/flat switch.** Add replay controls,
  non-colour attacker/target labels and emphasis, a 3D directional arrow and a
  flat-view direction label, selected action-log row highlighting, and a
  history notice to the existing game-view renderer. Both renderers consume
  the same selected snapshot and marker metadata. No new dependency or server
  component is needed.
- **Address proposal suggestions.** Keep replay inside the game screen
  (adopted); preserve separate attack/result steps (adopted); use the existing
  hash-query route with a numeric step index (adopted); visibly mark attackers
  and targets with text/borders as well as color and show their direction
  (adapted); use upstream log prose for best-effort reconstruction rather than
  adding API snapshots (adapted per the developer's direction). Replay covers
  all action-log entries returned by the API, while chat is excluded. The
  existing view already provides both 3D and flat modes.

## Risks / Trade-offs

- **[Risk] The upstream action log is truncated or its prose changes.** →
  Clearly label replay as best-effort, ignore unrecognized messages, and keep
  the current state as the final step.
- **[Risk] Recipe notation is more expressive than the parser's supported
  cases.** → Preserve the raw recipe, parse only recognized side/value forms,
  and inherit other die attributes from a matching board die.
- **[Risk] Reverse reconstruction retains unrelated dice from later states.** →
  Mark attack participants and results explicitly and avoid claiming exactness.

## Migration Plan

No data migration or API change is needed. Deploy the static client files
together; rolling them back restores the existing current-state game view.
