import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCommonPorts, getActivePorts } from '@/lib/tauri';
import { useScanStore } from '@/store/scanStore';
import { usePinStore } from '@/store/pinStore';

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
  const pinnedPorts = usePinStore((s) => s.pins);

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
  const showConnections = useScanStore((s) => s.showConnections);

  // Catch up the moment the window comes back rather than up to one interval later.
  useEffect(() => {
    if (!minimized) queryClient.invalidateQueries({ queryKey: ['ports', 'all'] });
  }, [minimized, queryClient]);

  return useQuery({
    queryKey: ['ports', 'all', showConnections],
    queryFn: () => getActivePorts(showConnections),
    // Keep showing the last list while the other kind loads, instead of the loader.
    placeholderData: (previous) => previous,
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
