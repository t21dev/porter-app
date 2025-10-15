import { useState, useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { Header } from './components/dashboard/Header';
import { SearchBar } from './components/dashboard/SearchBar';
import { AdminWarning } from './components/dashboard/AdminWarning';
import { StatsCard } from './components/dashboard/StatsCard';
import { PortListItem } from './components/dashboard/PortListItem';
import { StatusFilter } from './components/dashboard/StatusFilter';
import { PortScanLoader } from './components/dashboard/PortScanLoader';
import { useAllPorts, useRefreshPorts } from './hooks/usePorts';
import { killProcess, isElevated } from './lib/tauri';
import { Button } from './components/ui/button';
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

  const { data: allPorts = [], isLoading: isLoadingAll, isRefetching: isRefetchingAll } = useAllPorts();
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
  // Note: Only shows ports that are actively detected by the system scan
  // If a pinned port isn't running or accessible, it won't appear in the list
  const { pinnedPortsList, otherPortsList } = useMemo(() => {
    const pinned: Port[] = [];
    const other: Port[] = [];

    allPorts.forEach(port => {
      if (pinnedPortNumbers.has(port.port)) {
        pinned.push(port);
      } else {
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
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Administrator privileges required",
        description: "Please restart Porter as Administrator to kill processes.",
      });
      return;
    }

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

  return (
    <div className="flex overflow-hidden flex-col h-screen bg-background">
      <Toaster />
      {/* Sticky Header */}
      <Header onRefresh={refreshPorts} isRefreshing={isRefetching} />

      <main className="flex overflow-hidden flex-col flex-1">
        <div className="container flex flex-col px-4 mx-auto max-w-7xl h-full">
          {/* Fixed Top Section */}
          <div className="flex-shrink-0 py-4 space-y-4">
            {/* Admin Warning */}
            {!isAdmin && <AdminWarning />}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatsCard count={stats.free} label="Free Ports" variant="free" />
              <StatsCard count={stats.occupied} label="Occupied Ports" variant="occupied" />
              <StatsCard count={stats.system} label="System Ports" variant="system" />
            </div>

            {/* Search Bar and Filter */}
            <div className="flex gap-2 items-center">
              <div className="flex-[3]">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
              <div className="flex-1">
                <StatusFilter
                  selectedStatuses={selectedStatuses}
                  onStatusToggle={handleStatusToggle}
                />
              </div>
            </div>

            {/* Port List Header */}
            <div className="flex gap-2 items-center">
              <h2 className="text-sm font-semibold text-foreground">
                📌 Pinned Ports
                {searchQuery && ` (${filteredPinnedPorts.length + filteredOtherPorts.length} results)`}
              </h2>
            </div>
          </div>

          {/* Scrollable Port List */}
          <div className="overflow-hidden flex-1">
            <SimpleBar style={{ height: '100%' }}>
              {isLoading ? (
                <PortScanLoader />
              ) : (
                <div className="pr-2 pb-8 space-y-2">
                  {/* When searching, show all results together */}
                  {searchQuery ? (
                    <>
                      {[...filteredPinnedPorts, ...filteredOtherPorts].map((port) => (
                        <PortListItem
                          key={port.port}
                          port={port}
                          onKill={handleKillProcess}
                          isPinned={pinnedPortNumbers.has(port.port)}
                        />
                      ))}
                    </>
                  ) : (
                    <>
                      {/* Pinned Ports Section */}
                      {filteredPinnedPorts.map((port) => (
                        <PortListItem
                          key={port.port}
                          port={port}
                          onKill={handleKillProcess}
                          isPinned={true}
                        />
                      ))}

                      {/* Divider and Show Other Ports Button */}
                      {!searchQuery && filteredOtherPorts.length > 0 && (
                        <div className="py-3">
                          <div className="mb-3 border-t border-border"></div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllPorts(!showAllPorts)}
                            className="w-full text-xs"
                          >
                            {showAllPorts ? 'Hide Other Ports' : `Show Other Ports (${filteredOtherPorts.length})`}
                          </Button>
                        </div>
                      )}

                      {/* Other Ports Section (shown when button clicked) */}
                      {showAllPorts && filteredOtherPorts.map((port) => (
                        <PortListItem
                          key={port.port}
                          port={port}
                          onKill={handleKillProcess}
                          isPinned={false}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </SimpleBar>
          </div>
        </div>
      </main>
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
