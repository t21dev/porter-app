import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getCommonPorts, getActivePorts } from '@/lib/tauri';

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
    refetchIntervalInBackground: true,
  });
}

export function useAllPorts(refreshInterval: number = 3000) {
  return useQuery({
    queryKey: ['ports', 'all'],
    queryFn: getActivePorts,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: true,
  });
}

export function useRefreshPorts() {
  const queryClient = useQueryClient();

  const refreshPorts = () => {
    queryClient.invalidateQueries({ queryKey: ['ports'] });
  };

  return { refreshPorts };
}
