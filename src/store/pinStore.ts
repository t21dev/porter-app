import { create } from 'zustand';

const KEY = 'porter-pinned-ports';
const OLD_KEY = 'porter-custom-ports';

export const DEFAULT_PINNED_PORTS = [3000, 5173, 8080, 5432, 27017];
export const MAX_PINNED_PORTS = 50;

function read(): number[] {
  try {
    // Older versions kept the list under another name.
    const old = localStorage.getItem(OLD_KEY);
    if (old && !localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, old);
      localStorage.removeItem(OLD_KEY);
    }
    const saved = localStorage.getItem(KEY);
    if (!saved) return DEFAULT_PINNED_PORTS;
    const list = JSON.parse(saved);
    return Array.isArray(list) ? list.filter((p) => Number.isInteger(p)) : DEFAULT_PINNED_PORTS;
  } catch {
    return DEFAULT_PINNED_PORTS;
  }
}

function write(pins: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pins));
  } catch {
    /* storage blocked: keep them for this session */
  }
}

export type PinResult = 'pinned' | 'unpinned' | 'full';

interface PinState {
  /** Pinned port numbers, ascending. Shown at the top, running or not. */
  pins: number[];
  pin: (port: number) => PinResult;
  unpin: (port: number) => void;
  toggle: (port: number) => PinResult;
  reset: () => void;
}

/**
 * One place for the pinned ports, shared by the main list and the settings
 * menu, so pinning from a row and from settings never disagree.
 */
export const usePinStore = create<PinState>((set, get) => {
  const save = (pins: number[]) => {
    const sorted = [...new Set(pins)].sort((a, b) => a - b);
    write(sorted);
    set({ pins: sorted });
  };
  return {
    pins: read(),
    pin: (port) => {
      const { pins } = get();
      if (pins.includes(port)) return 'pinned';
      if (pins.length >= MAX_PINNED_PORTS) return 'full';
      save([...pins, port]);
      return 'pinned';
    },
    unpin: (port) => save(get().pins.filter((p) => p !== port)),
    toggle: (port) => {
      if (get().pins.includes(port)) {
        get().unpin(port);
        return 'unpinned';
      }
      return get().pin(port);
    },
    reset: () => save(DEFAULT_PINNED_PORTS),
  };
});
