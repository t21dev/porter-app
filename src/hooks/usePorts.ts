import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCommonPorts, getActivePorts } from '@/lib/tauri';

/**
 * Whether the window is minimised. The webview keeps reporting itself as
 * visible when minimised, so the browser's own hidden state never pauses
 * polling; the window's events are the only reliable signal.
 */
function useMinimized() {
  const [minimized, setMinimized] = useState(false);
  useEffect(() => {
    const win = getCurrentWindow();
    const check = () => {
      win.isMinimized().then(setMinimized).catch(() => undefined);
    };
    const offs = [win.onResized(check), win.onFocusChanged(check)];
    return () => {
      offs.forEach((p) => void p.then((off) => off()));
    };
  }, []);
  return minimized;
}

export function usePinnedPorts(refreshInterval: number = 2000) {
  const [pinnedPorts, setPinnedPorts] = useState<number[] | undefined>(undefined);

  useEffect(() => {
    const loadPorts = () => {
      // Migrate from old key if needed
      const oldSaved = localStorage.getItem('porter-custom-ports');
      if (oldSaved && !localStorage.getItem('porter-pinned-ports')) {
        localStorage.setItem('porter-pinned-ports', oldSaved);
        localStorage.removeItem('porter-custom-ports');
      }

      const saved = localStorage.getItem('porter-pinned-ports');
      if (saved) {
        try {
          setPinnedPorts(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load pinned ports:', e);
        }
      }
    };

    loadPorts();

    const handlePortsChange = (e: CustomEvent) => {
      setPinnedPorts(e.detail);
    };

    window.addEventListener('pinned-ports-changed', handlePortsChange as EventListener);
    return () => {
      window.removeEventListener('pinned-ports-changed', handlePortsChange as EventListener);
    };
  }, []);

  return useQuery({
    queryKey: ['ports', 'pinned', pinnedPorts],
    queryFn: () => getCommonPorts(pinnedPorts),
    refetchInterval: refreshInterval,
    // Nothing to watch while the window is minimised or hidden.
    refetchIntervalInBackground: false,
  });
}

export function useAllPorts(refreshInterval: number = 3000) {
  const minimized = useMinimized();
  const queryClient = useQueryClient();

  // Catch up the moment the window comes back rather than up to one interval later.
  useEffect(() => {
    if (!minimized) queryClient.invalidateQueries({ queryKey: ['ports', 'all'] });
  }, [minimized, queryClient]);

  return useQuery({
    queryKey: ['ports', 'all'],
    queryFn: getActivePorts,
    refetchInterval: minimized ? false : refreshInterval,
    // Nothing to watch while the window is minimised or hidden.
    refetchIntervalInBackground: false,
  });
}

export function useRefreshPorts() {
  const queryClient = useQueryClient();

  const refreshPorts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ports'] });
  }, [queryClient]);

  return { refreshPorts };
}
