import { useQuery } from '@tanstack/react-query';
import { checkForUpdate } from '@/lib/updates';

const SIX_HOURS = 6 * 60 * 60 * 1000;

/** Checks GitHub for a newer release on launch and every six hours. */
export function useUpdateCheck() {
  return useQuery({
    queryKey: ['update-check'],
    queryFn: checkForUpdate,
    staleTime: SIX_HOURS,
    refetchInterval: SIX_HOURS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
