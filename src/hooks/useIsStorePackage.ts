import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

/**
 * True when Porter runs from its Microsoft Store package. The Store delivers
 * those updates, so the GitHub update check stays off there.
 */
export function useIsStorePackage() {
  return useQuery({
    queryKey: ['store-package'],
    queryFn: () => invoke<boolean>('is_store_package').catch(() => false),
    staleTime: Infinity,
  });
}
