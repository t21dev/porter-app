import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCommonPorts, getActivePorts } from '@/lib/tauri';

export function useCommonPorts(refreshInterval: number = 2000) {
  return useQuery({
    queryKey: ['ports', 'common'],
    queryFn: getCommonPorts,
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
