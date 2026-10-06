export function profileUrl(playerName) {
  return `#profile?player=${encodeURIComponent(playerName)}`;
}
