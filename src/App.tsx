import { useState, useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/dashboard/Header';
import { SearchBar } from './components/dashboard/SearchBar';
import { AdminWarning } from './components/dashboard/AdminWarning';
import { StatsCard } from './components/dashboard/StatsCard';
import { PortListItem } from './components/dashboard/PortListItem';
import { StatusFilter } from './components/dashboard/StatusFilter';
import { Footer } from './components/dashboard/Footer';
import { useCommonPorts, useRefreshPorts } from './hooks/usePorts';
import { killProcess, isElevated } from './lib/tauri';

const queryClient = new QueryClient();

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(['free', 'occupied', 'system'])
  );

  const { data: ports = [], isLoading, isRefetching } = useCommonPorts();
  const { refreshPorts } = useRefreshPorts();

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

      <main className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Admin Warning */}
        {!isAdmin && <AdminWarning />}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatsCard count={stats.free} label="Free Ports" variant="free" />
          <StatsCard count={stats.occupied} label="Occupied Ports" variant="occupied" />
          <StatsCard count={stats.system} label="System Ports" variant="system" />
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex gap-3">
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <StatusFilter
            selectedStatuses={selectedStatuses}
            onStatusToggle={handleStatusToggle}
          />
        </div>

        {/* Port List */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Common Developer Ports
            {searchQuery && ` (${filteredPorts.length} results)`}
          </h2>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading ports...
          </div>
        ) : (
          <div className="space-y-3">
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
