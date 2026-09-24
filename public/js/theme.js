export const THEME_KEY = 'theme';

// choice is 'auto', 'light' or 'dark'; auto follows the device.
export function resolveTheme(choice, prefersDark) {
  if (choice === 'light' || choice === 'dark') return choice;
  return prefersDark ? 'dark' : 'light';
}

export function storedChoice(storage = globalThis.localStorage) {
  try {
    return storage.getItem(THEME_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export function saveChoice(choice, storage = globalThis.localStorage) {
  try {
    storage.setItem(THEME_KEY, choice);
  } catch {
    // Private browsing can block storage; the choice just won't stick.
  }
}
