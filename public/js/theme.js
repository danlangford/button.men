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

// Shared wiring for the theme <select> present on every page: sets the
// control's initial value, applies the saved or device theme, and keeps
// both in sync with manual choices and device changes.
export function initThemeControl(select, { root = document.documentElement, media } = {}) {
  const darkQuery = media ?? window.matchMedia?.('(prefers-color-scheme: dark)');
  const apply = () => {
    root.dataset.bsTheme = resolveTheme(storedChoice(), darkQuery?.matches ?? false);
  };
  select.value = storedChoice();
  select.addEventListener('change', (event) => {
    saveChoice(event.target.value);
    apply();
  });
  darkQuery?.addEventListener?.('change', apply);
  apply();
  return apply;
}
