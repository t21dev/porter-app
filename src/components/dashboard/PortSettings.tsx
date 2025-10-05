import { useState, useEffect } from 'react';
import { Settings, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_PORTS = [
  3000, 3001, 4200, 5000, 5173, 8000, 8080, 8888, 9000, 9090,
  80, 443, 5432, 3306, 6379, 27017, 5672, 15672, 11211, 5984
];

export function PortSettings() {
  const [ports, setPorts] = useState<number[]>(DEFAULT_PORTS);
  const [newPort, setNewPort] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('porter-custom-ports');
    if (saved) {
      try {
        setPorts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom ports:', e);
      }
    }
  }, []);

  const savePorts = (newPorts: number[]) => {
    setPorts(newPorts);
    localStorage.setItem('porter-custom-ports', JSON.stringify(newPorts));
    // Trigger a custom event to notify the app
    window.dispatchEvent(new CustomEvent('ports-config-changed', { detail: newPorts }));
  };

  const addPort = () => {
    const port = parseInt(newPort);
    if (!isNaN(port) && port > 0 && port < 65536 && !ports.includes(port)) {
      savePorts([...ports, port].sort((a, b) => a - b));
      setNewPort('');
    }
  };

  const removePort = (port: number) => {
    savePorts(ports.filter(p => p !== port));
  };

  const resetToDefaults = () => {
    savePorts(DEFAULT_PORTS);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Port Configuration</h3>
            <Button
              variant="outline"
              size="xs"
              onClick={resetToDefaults}
              className="text-[10px] h-6 px-2"
            >
              Reset
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Customize which ports are scanned at startup
          </p>

          <div className="flex gap-2">
            <input
              type="number"
              value={newPort}
              onChange={(e) => setNewPort(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPort()}
              placeholder="Add port..."
              className="flex-1 px-2 py-1 text-xs border rounded bg-background"
              min="1"
              max="65535"
            />
            <Button
              size="xs"
              onClick={addPort}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {ports.map((port) => (
                <div
                  key={port}
                  className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded text-xs"
                >
                  <span>{port}</span>
                  <button
                    onClick={() => removePort(port)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            {ports.length} port{ports.length !== 1 ? 's' : ''} configured
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
