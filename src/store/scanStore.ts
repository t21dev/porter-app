import { create } from 'zustand';

const KEY = 'porter-show-connections';
const PINNED_ONLY_KEY = 'porter-pinned-only';

function read(key: string = KEY): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function write(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* storage blocked: keep it for this session */
  }
}

interface ScanState {
  /**
   * Also list the local port of every connection this machine has open, not
   * just listening ports. Off by default: it is most of the list on a normal
   * desktop, nothing you can free up, and costs a process lookup per row.
   */
  showConnections: boolean;
  setShowConnections: (value: boolean) => void;
  /**
   * Show only pinned ports: no Other ports section, and search and the counts
   * cover pinned ports alone. Off by default.
   */
  pinnedOnly: boolean;
  setPinnedOnly: (value: boolean) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  showConnections: read(),
  setShowConnections: (value) => {
    write(KEY, value);
    set({ showConnections: value });
  },
  pinnedOnly: read(PINNED_ONLY_KEY),
  setPinnedOnly: (value) => {
    write(PINNED_ONLY_KEY, value);
    set({ pinnedOnly: value });
  },
}));
