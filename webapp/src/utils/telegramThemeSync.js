/** Telegram chrome colors — must match App.css `--bg-app` per theme */
export const APP_BG_BY_THEME = {
  light: '#FDFBF0',
  dark: '#121212'
};

export function getAppBgColor(theme) {
  return APP_BG_BY_THEME[theme] || APP_BG_BY_THEME.light;
}

/** Read live CSS token when available (after data-theme is set) */
export function readAppBgFromDom(fallbackTheme = 'light') {
  if (typeof document === 'undefined') return getAppBgColor(fallbackTheme);
  const css = getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim();
  return css || getAppBgColor(fallbackTheme);
}

export function syncTelegramChrome(tg, theme) {
  if (!tg?.isVersionAtLeast?.('6.1')) return;
  const color = readAppBgFromDom(theme);
  try {
    tg.setHeaderColor?.(color);
    tg.setBackgroundColor?.(color);
  } catch {
    /* Telegram WebApp API may reject in some clients */
  }
}
