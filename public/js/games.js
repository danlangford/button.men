import { BUTTONWEAVERS } from './config.js';

export function gameUrl(gameId) {
  return `${BUTTONWEAVERS}/ui/game.html?game=${encodeURIComponent(gameId)}`;
}

// Turn buttonweavers' parallel arrays into one object per game,
// with the games waiting on the player first.
export function gameList(data) {
  const games = data.gameIdArray.map((id, i) => ({
    id,
    href: gameUrl(id),
    opponent: data.opponentNameArray[i],
    myButton: data.myButtonNameArray[i],
    opponentButton: data.opponentButtonNameArray[i],
    wins: data.nWinsArray[i],
    losses: data.nLossesArray[i],
    draws: data.nDrawsArray[i],
    target: data.nTargetWinsArray[i],
    description: data.gameDescriptionArray[i],
    yourTurn: Boolean(data.isAwaitingActionArray[i]),
  }));
  return games.filter((g) => g.yourTurn).concat(games.filter((g) => !g.yourTurn));
}
