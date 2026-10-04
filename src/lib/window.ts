import { getCurrentWindow } from '@tauri-apps/api/window';

type Theme = 'light' | 'dark';

// The native window paints this behind the webview, visible on resize and
// before the page loads. Mirrors --background in index.css (see DESIGN.md).
const CANVAS: Record<Theme, string> = { dark: '#0d0d0d', light: '#fbfbfb' };

export function syncWindowBackground(theme: Theme): Promise<void> {
  try {
    return getCurrentWindow().setBackgroundColor(CANVAS[theme]).catch(() => undefined);
  } catch {
    // Not running inside Tauri (plain browser preview).
    return Promise.resolve();
  }
}

/**
 * The window starts hidden (tauri.conf.json) and is shown here once React has
 * painted. Two frames are awaited: the first lands after React commits, the
 * second after the browser has painted that commit. If this never runs, the
 * Rust side shows the window after 3 seconds anyway.
 */
export function revealWindow(): void {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const theme: Theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      try {
        const win = getCurrentWindow();
        void syncWindowBackground(theme)
          .then(() => win.show())
          .then(() => win.setFocus())
          .catch(() => undefined);
      } catch {
        // Not running inside Tauri.
      }
    }),
  );
}
