import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { currentMonitor, getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

export const UI_SCALES = [
  { value: 0.9, label: 'Compact' },
  { value: 1, label: 'Default' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Larger' },
] as const;

export type UiScale = (typeof UI_SCALES)[number]['value'];

// Logical window constraints at 100%, mirrored from tauri.conf.json.
const BASE_WIDTH = 700;
const MIN_HEIGHT = 640;

interface UiScaleStore {
  scale: UiScale;
  setScale: (scale: UiScale) => void;
  step: (direction: 1 | -1) => void;
  reset: () => void;
}

// The scale the window is currently sized for; the window opens at 100%.
let appliedScale = 1;

/** Zooms the webview and resizes the window in proportion so the layout keeps its shape. */
async function applyScale(scale: number) {
  const previous = appliedScale;
  appliedScale = scale;

  try {
    await getCurrentWebview().setZoom(scale);
  } catch (e) {
    console.error('Failed to set zoom:', e);
  }

  try {
    const win = getCurrentWindow();
    if (await win.isMaximized()) return;

    const factor = await win.scaleFactor();
    const inner = await win.innerSize();
    const currentHeight = inner.height / factor;

    const width = Math.round(BASE_WIDTH * scale);
    const minHeight = Math.round(MIN_HEIGHT * scale);
    let height = Math.round((currentHeight / previous) * scale);

    // Keep the window inside the monitor's usable area.
    const monitor = await currentMonitor();
    if (monitor) {
      const areaHeight = monitor.workArea.size.height / monitor.scaleFactor;
      height = Math.min(height, Math.floor(areaHeight - 16));
    }

    // Clear constraints first so growing and shrinking both succeed.
    await win.setMinSize(null);
    await win.setMaxSize(null);
    await win.setSize(new LogicalSize(width, height));
    await win.setMinSize(new LogicalSize(width, Math.min(minHeight, height)));
    await win.setMaxSize(new LogicalSize(width, 10000));
  } catch (e) {
    console.error('Failed to resize window for scale:', e);
  }
}

export const useUiScaleStore = create<UiScaleStore>()(
  persist(
    (set, get) => ({
      scale: 1,
      setScale: (scale) => {
        set({ scale });
        applyScale(scale);
      },
      step: (direction) => {
        const i = UI_SCALES.findIndex((s) => s.value === get().scale);
        const next = UI_SCALES[Math.min(UI_SCALES.length - 1, Math.max(0, i + direction))];
        if (next.value !== get().scale) get().setScale(next.value);
      },
      reset: () => get().setScale(1),
    }),
    {
      name: 'porter-ui-scale',
      onRehydrateStorage: () => (state) => {
        if (state && state.scale !== 1) applyScale(state.scale);
      },
    }
  )
);

/** Ctrl/Cmd + = / - / 0 step through the scale presets. */
export function installScaleShortcuts() {
  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const { step, reset } = useUiScaleStore.getState();
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      step(1);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      step(-1);
    } else if (e.key === '0') {
      e.preventDefault();
      reset();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
