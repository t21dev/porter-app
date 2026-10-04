import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncWindowBackground } from '@/lib/window';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: getSystemTheme(),
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
        void syncWindowBackground(theme);
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        const apply = () => get().setTheme(newTheme);
        const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (doc.startViewTransition && !reduced) {
          doc.startViewTransition(apply);
        } else {
          apply();
        }
      },
    }),
    {
      name: 'porter-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark');
        } else {
          // If no saved theme, use system preference
          const systemTheme = getSystemTheme();
          document.documentElement.classList.toggle('dark', systemTheme === 'dark');
        }
      },
    }
  )
);
