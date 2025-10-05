import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getCommonPorts, getActivePorts } from '@/lib/tauri';

export function useCommonPorts(refreshInterval: number = 2000) {
  const [customPorts, setCustomPorts] = useState<number[] | undefined>(undefined);

  useEffect(() => {
    const loadPorts = () => {
      const saved = localStorage.getItem('porter-custom-ports');
      if (saved) {
        try {
          setCustomPorts(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load custom ports:', e);
        }
      }
    };

    loadPorts();

    const handlePortsChange = (e: CustomEvent) => {
      setCustomPorts(e.detail);
    };

    window.addEventListener('ports-config-changed', handlePortsChange as EventListener);
    return () => {
      window.removeEventListener('ports-config-changed', handlePortsChange as EventListener);
    };
  }, []);

  return useQuery({
    queryKey: ['ports', 'common', customPorts],
    queryFn: () => getCommonPorts(customPorts),
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
