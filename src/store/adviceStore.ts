import { create } from 'zustand';

export type View = 'ports' | 'exposed';

interface AdviceState {
  /** The row whose advice panel is open (a portKey), or null. One at a time. */
  open: string | null;
  toggle: (key: string) => void;
  /** Ports, or only what's reachable from the network. */
  view: View;
  setView: (view: View) => void;
}

export const useAdviceStore = create<AdviceState>((set) => ({
  open: null,
  toggle: (key) => set((s) => ({ open: s.open === key ? null : key })),
  view: 'ports',
  setView: (view) => set({ view, open: null }),
}));
