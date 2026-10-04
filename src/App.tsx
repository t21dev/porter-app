import { useState, useMemo, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { TitleBar } from './components/TitleBar';
import { Header } from './components/dashboard/Header';
import { SearchBar } from './components/dashboard/SearchBar';
import { AdminWarning } from './components/dashboard/AdminWarning';
import { StatsOverview } from './components/dashboard/StatsCard';
import { PortListItem } from './components/dashboard/PortListItem';
import { StatusFilter } from './components/dashboard/StatusFilter';
import { OtherPortsList } from './components/dashboard/OtherPortsList';
import { PortScanLoader } from './components/dashboard/PortScanLoader';
import { useAllPorts, useRefreshPorts } from './hooks/usePorts';
import { killProcess, isElevated } from './lib/tauri';
import { cn } from './lib/utils';
import { Port } from './types/api';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';
import { installScaleShortcuts } from './store/uiScaleStore';
import { MAX_PINNED_PORTS, usePinStore } from './store/pinStore';
import { useScanStore } from './store/scanStore';
import { ToastAction } from './components/ui/toast';

const queryClient = new QueryClient();

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [otherPortsSettled, setOtherPortsSettled] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(['free', 'occupied', 'system'])
  );
  const { toast } = useToast();

  const {
    data: allPorts = [],
    isLoading: isLoadingAll,
    isRefetching: isRefetchingAll,
    dataUpdatedAt,
  } = useAllPorts();
  const { refreshPorts } = useRefreshPorts();

  // Pinned ports come from one shared store, so a pin made from a row and one
  // made in settings show up in both places at once.
  const pins = usePinStore((s) => s.pins);
  const pinnedOnly = useScanStore((s) => s.pinnedOnly);
  const pinnedPortNumbers = useMemo(() => new Set(pins), [pins]);

  // Pin or unpin from a row. Unpinning a port that is not running makes it
  // vanish from the list, so that toast carries an undo.
  const togglePin = useCallback(
    (port: number) => {
      const result = usePinStore.getState().toggle(port);
      if (result === 'full') {
        toast({
          variant: 'destructive',
          title: 'Maximum ports reached',
          description: `You can pin up to ${MAX_PINNED_PORTS} ports. Unpin one first.`,
        });
      } else if (result === 'unpinned') {
        toast({
          title: `Port ${port} unpinned`,
          action: (
            <ToastAction altText="Undo" onClick={() => usePinStore.getState().pin(port)}>
              Undo
            </ToastAction>
          ),
        });
      } else {
        toast({ title: `Port ${port} pinned`, description: 'It now stays at the top, running or not.' });
      }
    },
    [toast]
  );

  // Separate pinned and other ports from all ports
  // Create Port objects for all pinned ports, even if not currently running
  const { pinnedPortsList, otherPortsList } = useMemo(() => {
    const pinned: Port[] = [];
    const other: Port[] = [];
    const allPortsMap = new Map(allPorts.map(p => [p.port, p]));

    // Add all pinned ports (create placeholder for non-running ones)
    pinnedPortNumbers.forEach(portNum => {
      const existingPort = allPortsMap.get(portNum);
      if (existingPort) {
        pinned.push(existingPort);
      } else {
        // Create a placeholder port object for non-running pinned ports
        pinned.push({
          port: portNum,
          status: 'free',
          protocol: 'TCP',
          ip_address: '0.0.0.0',
          process: undefined
        });
      }
    });

    // Sort pinned ports by port number
    pinned.sort((a, b) => a.port - b.port);

    // Add remaining ports to other list, unless only pinned ports are shown;
    // then search and the counts cover pinned ports alone.
    if (!pinnedOnly) {
      allPorts.forEach(port => {
        if (!pinnedPortNumbers.has(port.port)) {
          other.push(port);
        }
      });
    }

    return { pinnedPortsList: pinned, otherPortsList: other };
  }, [allPorts, pinnedPortNumbers, pinnedOnly]);

  const isLoading = isLoadingAll;
  const isRefetching = isRefetchingAll;

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  useEffect(() => installScaleShortcuts(), []);

  // The expand animation needs overflow clipped; lift it afterwards so the
  // other-ports column header can stay sticky.
  useEffect(() => {
    setOtherPortsSettled(false);
    if (!showAllPorts) return;
    const t = window.setTimeout(() => setOtherPortsSettled(true), 360);
    return () => window.clearTimeout(t);
  }, [showAllPorts]);

  // Check for admin privileges on startup
  useEffect(() => {
    const checkElevation = async () => {
      try {
        const elevated = await isElevated();
        setIsAdmin(elevated);
      } catch (error) {
        console.error('Failed to check elevation:', error);
      }
    };

    checkElevation();
  }, []);

  // Filter pinned and other ports separately
  const { filteredPinnedPorts, filteredOtherPorts } = useMemo(() => {
    const applyFilters = (ports: Port[]) => {
      let filtered = ports;

      // Filter by status
      filtered = filtered.filter((port) => selectedStatuses.has(port.status));

      // Filter by search query
      // Port number, or the name of the process holding it, as the README says.
      if (searchQuery) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (port) =>
            port.port.toString().includes(q) ||
            (port.status !== 'free' && !!port.process?.name.toLowerCase().includes(q))
        );
      }

      return filtered;
    };

    return {
      filteredPinnedPorts: applyFilters(pinnedPortsList),
      filteredOtherPorts: applyFilters(otherPortsList)
    };
  }, [pinnedPortsList, otherPortsList, searchQuery, selectedStatuses]);

  // Stable, so memoised rows are not re-rendered by a new callback each poll.
  const handleKillProcess = useCallback(async (pid: number) => {
    // Always try to kill - on macOS/Linux the backend will prompt for elevation if needed
    try {
      await killProcess(pid);
      refreshPorts();
      toast({
        title: "Process terminated",
        description: "The process was successfully terminated.",
      });
    } catch (error) {
      console.error('Failed to kill process:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Failed to kill process",
        description: errorMessage,
      });
    }
  }, [refreshPorts, toast]);

  const stats = useMemo(() => {
    const allDisplayedPorts = [...pinnedPortsList, ...otherPortsList];
    const free = allDisplayedPorts.filter(p => p.status === 'free').length;
    const occupied = allDisplayedPorts.filter(p => p.status === 'occupied').length;
    const system = allDisplayedPorts.filter(p => p.status === 'system').length;
    return { free, occupied, system };
  }, [pinnedPortsList, otherPortsList]);

  const searchResults = [...filteredPinnedPorts, ...filteredOtherPorts];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Toaster />
      <TitleBar pulseKey={dataUpdatedAt}>
        <Header onRefresh={refreshPorts} isRefreshing={isRefetching} />
      </TitleBar>

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Fixed top section */}
        <div className="shrink-0 space-y-3 px-5 pb-4 pt-5">
          {!isAdmin && <AdminWarning />}

          <StatsOverview free={stats.free} occupied={stats.occupied} system={stats.system} />

          <div className="reveal flex items-center gap-2" style={{ '--i': 2 } as CSSProperties}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <StatusFilter selectedStatuses={selectedStatuses} onStatusToggle={handleStatusToggle} />
          </div>
        </div>

        {/* Scrollable port list */}
        <div className="flex-1 overflow-hidden">
          <SimpleBar style={{ height: '100%' }}>
            <div className="px-5 pb-8">
              {isLoading ? (
                <PortScanLoader />
              ) : searchQuery ? (
                <>
                  <SectionLabel
                    title="Results"
                    count={searchResults.length}
                    hint={`matching “${searchQuery}”`}
                  />
                  {searchResults.length > 0 ? (
                    <ListSurface>
                      {searchResults.map((port, i) => (
                        <PortListItem
                          key={port.port}
                          port={port}
                          index={i}
                          onKill={handleKillProcess}
                          isPinned={pinnedPortNumbers.has(port.port)}
                          showPin
                          onTogglePin={togglePin}
                        />
                      ))}
                    </ListSurface>
                  ) : (
                    <EmptyState
                      title={`No ports match “${searchQuery}”`}
                      body="Try a shorter number, or check the status filters."
                    />
                  )}
                </>
              ) : (
                <>
                  <SectionLabel title="Pinned" count={filteredPinnedPorts.length} />
                  {filteredPinnedPorts.length > 0 ? (
                    <ListSurface>
                      {filteredPinnedPorts.map((port, i) => (
                        <PortListItem
                          key={port.port}
                          port={port}
                          index={i}
                          onKill={handleKillProcess}
                          isPinned={true}
                          onTogglePin={togglePin}
                        />
                      ))}
                    </ListSurface>
                  ) : (
                    <EmptyState
                      title={pinnedPortNumbers.size === 0 ? 'No pinned ports' : 'Nothing to show'}
                      body={
                        pinnedPortNumbers.size === 0
                          ? 'Pin the ports you use most from the settings menu above.'
                          : 'Your pinned ports are hidden by the current status filters.'
                      }
                    />
                  )}

                  {/* Other ports, collapsed by default */}
                  {filteredOtherPorts.length > 0 && (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => setShowAllPorts(!showAllPorts)}
                        aria-expanded={showAllPorts}
                        className="group flex w-full items-center gap-3 rounded-lg py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <span className="text-[12px] font-medium text-muted-foreground transition-colors duration-150 group-hover:text-foreground">
                          {showAllPorts ? 'Hide other ports' : 'Other ports'}
                        </span>
                        <span className="font-mono text-[11px] text-subtle tabular">
                          {filteredOtherPorts.length}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-subtle transition-transform duration-300 ease-out group-hover:text-foreground',
                            showAllPorts && 'rotate-180'
                          )}
                        />
                      </button>

                      <div
                        className="collapse-grid mt-2"
                        data-open={showAllPorts}
                      >
                        {/* Unclip once open so the sticky column header can stick. */}
                        <div style={otherPortsSettled && showAllPorts ? { overflow: 'visible' } : undefined}>
                          {showAllPorts && (
                            <OtherPortsList
                              ports={filteredOtherPorts}
                              onKill={handleKillProcess}
                              onTogglePin={togglePin}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </SimpleBar>
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ title, count, hint }: { title: string; count: number; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2 px-0.5">
      <h2 className="text-[12px] font-medium text-muted-foreground">{title}</h2>
      <span className="font-mono text-[11px] text-subtle tabular">{count}</span>
      {hint && <span className="truncate text-[11.5px] text-subtle">{hint}</span>}
    </div>
  );
}

function ListSurface({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="reveal flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">{body}</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
