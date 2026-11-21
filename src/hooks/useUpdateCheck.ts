import { useQuery } from '@tanstack/react-query';
import { checkForUpdate } from '@/lib/updates';
import { useIsStorePackage } from './useIsStorePackage';

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Checks GitHub for a newer release on launch and every six hours. Store
 * installs skip it: the Store updates them.
 */
export function useUpdateCheck() {
  const { data: isStorePackage } = useIsStorePackage();
  return useQuery({
    queryKey: ['update-check'],
    queryFn: checkForUpdate,
    enabled: isStorePackage === false,
    staleTime: SIX_HOURS,
    refetchInterval: SIX_HOURS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
