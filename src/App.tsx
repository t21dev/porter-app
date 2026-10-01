import { useState, useMemo, useEffect, type CSSProperties, type ReactNode } from 'react';
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
import { PortScanLoader } from './components/dashboard/PortScanLoader';
import { useAllPorts, useRefreshPorts } from './hooks/usePorts';
import { killProcess, isElevated } from './lib/tauri';
import { cn } from './lib/utils';
import { Port } from './types/api';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';

const queryClient = new QueryClient();

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllPorts, setShowAllPorts] = useState(false);
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

  // Get pinned port numbers for checking
  const [pinnedPortNumbers, setPinnedPortNumbers] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Migrate from old key if needed
    const oldSaved = localStorage.getItem('porter-custom-ports');
    if (oldSaved && !localStorage.getItem('porter-pinned-ports')) {
      localStorage.setItem('porter-pinned-ports', oldSaved);
      localStorage.removeItem('porter-custom-ports');
    }

    const saved = localStorage.getItem('porter-pinned-ports');
    if (saved) {
      try {
        const ports = JSON.parse(saved);
        setPinnedPortNumbers(new Set(ports));
      } catch (e) {
        console.error('Failed to load pinned ports:', e);
      }
    }

    const handlePortsChange = (e: CustomEvent) => {
      setPinnedPortNumbers(new Set(e.detail));
    };

    window.addEventListener('pinned-ports-changed', handlePortsChange as EventListener);
    return () => {
      window.removeEventListener('pinned-ports-changed', handlePortsChange as EventListener);
    };
  }, []);

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

    // Add remaining ports to other list
    allPorts.forEach(port => {
      if (!pinnedPortNumbers.has(port.port)) {
        other.push(port);
      }
    });

    return { pinnedPortsList: pinned, otherPortsList: other };
  }, [allPorts, pinnedPortNumbers]);

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
      if (searchQuery) {
        filtered = filtered.filter((port) => {
          return port.port.toString().includes(searchQuery);
        });
      }

      return filtered;
    };

    return {
      filteredPinnedPorts: applyFilters(pinnedPortsList),
      filteredOtherPorts: applyFilters(otherPortsList)
    };
  }, [pinnedPortsList, otherPortsList, searchQuery, selectedStatuses]);

  const handleKillProcess = async (pid: number) => {
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
  };

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

                      <div className="collapse-grid mt-2" data-open={showAllPorts}>
                        <div>
                          {showAllPorts && (
                            <ListSurface>
                              {filteredOtherPorts.map((port, i) => (
                                <PortListItem
                                  key={port.port}
                                  port={port}
                                  index={i}
                                  onKill={handleKillProcess}
                                  isPinned={false}
                                />
                              ))}
                            </ListSurface>
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
