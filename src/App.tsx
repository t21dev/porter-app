import { useState, useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/dashboard/Header';
import { SearchBar } from './components/dashboard/SearchBar';
import { AdminWarning } from './components/dashboard/AdminWarning';
import { StatsCard } from './components/dashboard/StatsCard';
import { PortListItem } from './components/dashboard/PortListItem';
import { StatusFilter } from './components/dashboard/StatusFilter';
import { Footer } from './components/dashboard/Footer';
import { PortScanLoader } from './components/dashboard/PortScanLoader';
import { useCommonPorts, useAllPorts, useRefreshPorts } from './hooks/usePorts';
import { killProcess, isElevated } from './lib/tauri';
import { Button } from './components/ui/button';

const queryClient = new QueryClient();

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(['free', 'occupied', 'system'])
  );

  const { data: commonPorts = [], isLoading: isLoadingCommon, isRefetching: isRefetchingCommon } = useCommonPorts();
  const { data: allPorts = [], isLoading: isLoadingAll, isRefetching: isRefetchingAll } = useAllPorts();
  const { refreshPorts } = useRefreshPorts();

  const ports = showAllPorts ? allPorts : commonPorts;
  const isLoading = showAllPorts ? isLoadingAll : isLoadingCommon;
  const isRefetching = showAllPorts ? isRefetchingAll : isRefetchingCommon;

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

  const filteredPorts = useMemo(() => {
    let filtered = ports;

    // Filter by status
    filtered = filtered.filter((port) => selectedStatuses.has(port.status));

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((port) => {
        return (
          port.port.toString().includes(query) ||
          port.status.toLowerCase().includes(query) ||
          port.process?.name.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [ports, searchQuery, selectedStatuses]);

  const handleKillProcess = async (pid: number) => {
    if (!isAdmin) {
      alert(
        'Cannot kill process: Administrator privileges required.\n\n' +
        'Please restart Porter as Administrator:\n' +
        '1. Close Porter\n' +
        '2. Right-click on Porter\n' +
        '3. Select "Run as administrator"'
      );
      return;
    }

    try {
      await killProcess(pid);
      refreshPorts();
      alert('Process terminated successfully');
    } catch (error) {
      console.error('Failed to kill process:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to kill process:\n\n${errorMessage}`);
    }
  };

  const stats = useMemo(() => {
    const free = ports.filter(p => p.status === 'free').length;
    const occupied = ports.filter(p => p.status === 'occupied').length;
    const system = ports.filter(p => p.status === 'system').length;
    return { free, occupied, system };
  }, [ports]);

  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={refreshPorts} isRefreshing={isRefetching} />

      <main className="container px-4 py-4 mx-auto max-w-7xl">
        {/* Admin Warning */}
        {/* {!isAdmin && <AdminWarning />} */}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatsCard count={stats.free} label="Free Ports" variant="free" />
          <StatsCard count={stats.occupied} label="Occupied Ports" variant="occupied" />
          <StatsCard count={stats.system} label="System Ports" variant="system" />
        </div>

        {/* Search Bar and Filter */}
        <div className="flex gap-2 items-center mb-3">
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
        <div className="flex gap-2 items-center mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {showAllPorts ? 'All Running Ports' : 'Common Developer Ports'}
            {searchQuery && ` (${filteredPorts.length} results)`}
          </h2>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowAllPorts(!showAllPorts)}
            className="text-[10px] h-6 px-2"
          >
            {showAllPorts ? 'Show Common' : 'Show All'}
          </Button>
        </div>

        {isLoading ? (
          <PortScanLoader />
        ) : (
          <div className="space-y-2">
            {filteredPorts.map((port) => (
              <PortListItem
                key={port.port}
                port={port}
                onKill={handleKillProcess}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
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
