import { useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/dashboard/Header';
import { SearchBar } from './components/dashboard/SearchBar';
import { PortGrid } from './components/dashboard/PortGrid';
import { PortDetailModal } from './components/dashboard/PortDetailModal';
import { useCommonPorts, useRefreshPorts } from './hooks/usePorts';
import { killProcess } from './lib/tauri';
import { Port } from './types/api';

const queryClient = new QueryClient();

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);

  const { data: ports = [], isLoading, isRefetching } = useCommonPorts();
  const { refreshPorts } = useRefreshPorts();

  const filteredPorts = useMemo(() => {
    if (!searchQuery) return ports;

    const query = searchQuery.toLowerCase();
    return ports.filter((port) => {
      return (
        port.port.toString().includes(query) ||
        port.status.toLowerCase().includes(query) ||
        port.process?.name.toLowerCase().includes(query)
      );
    });
  }, [ports, searchQuery]);

  const handleKillProcess = async (pid: number) => {
    try {
      await killProcess(pid);
      refreshPorts();
      // Success - could add a toast notification here
      alert('Process terminated successfully');
    } catch (error) {
      console.error('Failed to kill process:', error);
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to kill process:\n\n${errorMessage}\n\nTip: You may need to run Porter as Administrator to kill this process.`);
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

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-success">{stats.free}</div>
            <div className="text-sm text-muted-foreground">Free Ports</div>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-destructive">{stats.occupied}</div>
            <div className="text-sm text-muted-foreground">Occupied Ports</div>
          </div>
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-warning">{stats.system}</div>
            <div className="text-sm text-muted-foreground">System Ports</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Port Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading ports...
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                Common Developer Ports
                {searchQuery && ` (${filteredPorts.length} results)`}
              </h2>
            </div>
            <PortGrid ports={filteredPorts} onPortClick={setSelectedPort} />
          </>
        )}
      </main>

      {/* Port Detail Modal */}
      <PortDetailModal
        port={selectedPort}
        onClose={() => setSelectedPort(null)}
        onKill={handleKillProcess}
      />
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
