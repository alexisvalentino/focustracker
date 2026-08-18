import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Match the native status bar to the app's light, theme-aware background.
 * - Android: paints the status bar with the current theme's sky-100 and uses
 *   dark icons, so it blends with the app's gradient instead of a black bar.
 * - iOS: keeps the default (webview below the status bar, dark text) which
 *   already matches — the calls are no-ops there where unsupported.
 *
 * Call it on app mount and whenever the active theme changes.
 */
export const syncStatusBar = (): void => {
  if (typeof window === 'undefined') return;
  const root = document.querySelector<HTMLElement>('[data-theme]');
  if (!root) return;
  const sky = getComputedStyle(root).getPropertyValue('--sky-100').trim();
  const color = sky ? `rgb(${sky})` : '#E0F2FE';
  // setBackgroundColor is Android-only; on iOS it rejects and is ignored.
  void StatusBar.setBackgroundColor({ color }).catch(() => {});
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
};
