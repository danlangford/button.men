# Proposal

## Why

Players need to see the current state of their games directly within button.men instead of being redirected out to the legacy site. The traditional buttonweavers interface displays the player's own button and dice at the top and the opponent's at the bottom, inverting standard tabletop and digital gaming conventions (such as chess or card games where a player's pieces sit at the bottom of their view). Displaying the current game state on button.men with an intuitive, perspectival play area, clear die sizes and values, button skills, scores, and integrated chat and action history establishes the visual foundation for upcoming in-app gameplay.

## What Changes

- A new game view screen on button.men that loads and renders the current state of any game via the `loadGameData` API.
- A perspectival play area layout where the viewing player's button, active dice, and captured dice are positioned at the bottom of the screen, and the opponent's button and dice are positioned across at the top. For spectators who are not participating in the game, both players are presented in a clearly distinguished top-and-bottom layout.
- Clear visual representation of dice that communicates each die's current rolled value, size (number of sides / recipe), skills (e.g., Poison, Shadow, Speed, Focus), and current status (e.g., dizzy, disabled, attacker, or target).
- Complete display of player and button details: player usernames, button names, button recipes, active skills / special rules, current round score, and overall match score (wins, losses, draws, target wins).
- Clear indication of whose turn it is, who holds initiative, and who is currently awaiting action.
- An integrated chronological event stream presenting both game action history and player chat, while providing players a way to easily find or isolate chat messages so conversation is not buried under long runs of game actions.
- Full respect for chat privacy settings when a game's chat is designated as private, preventing non-participants from viewing private messages.
- An external link to open the game on buttonweavers so players can perform moves or actions until move selection and submission are implemented on button.men.
- Opening a game from the active games list navigates to the game view on button.men instead of leaving the site.
- Responsive mobile design that fits comfortably on narrow mobile screens (down to 320 CSS pixels) without page-level horizontal scrolling.

## Capabilities

### New Capabilities
- `game-view`: displaying current game state in a perspectival play area with dice, button information, scores, and correlated game actions and chat.

### Modified Capabilities
- `web-ui`: opening an active game from the game list navigates to the game view on button.men rather than linking directly to buttonweavers.

## Impact

- Web UI: adds a new game view and route (e.g., `#game?gameId=...`), updates the active game list item link, and introduces new responsive layout styles.
- API: uses the existing API proxy pass-through to call `loadGameData`.
- No game logic or move submission is introduced on button.men; buttonweavers remains the authority for game state and move resolution.

## Suggestions

- **2D pseudo-3D vs 3D rendering:** Prioritize clean CSS 3D transforms, isometric perspective, or stylized flat representations before evaluating heavier 3D engines (such as Three.js or WebGL). Button Men features a wide variety of die sizes (polyhedral d4 through d30, swing dice, option dice, twin dice) that make custom 3D mesh pipelines complex, whereas responsive CSS/SVG components can convey size and perspective cleanly on mobile devices.
- **Future move selection readiness:** Structure die components and containers so that future interactive states (selection, highlighting, targeting, or notation) can build naturally upon them without rebuilding the layout.
- **Log and chat display ergonomics:** Consider collapsible accordion sections for clustered game action logs, or quick filter toggles (such as "All", "Chat only", "Actions only"), ensuring players can jump straight to unread or recent chat even if dozens of action log entries have accumulated.
- **Spectator orientation:** When a spectator or logged-out visitor views a game, default to player 1 (or the game creator) at the bottom and player 2 at the top, and consider offering a simple perspective-swap toggle.
