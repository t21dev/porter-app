import { create } from 'zustand';

const KEY = 'porter-show-connections';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
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
}

export const useScanStore = create<ScanState>((set) => ({
  showConnections: read(),
  setShowConnections: (value) => {
    try {
      localStorage.setItem(KEY, String(value));
    } catch {
      /* storage blocked: keep it for this session */
    }
    set({ showConnections: value });
  },
}));
