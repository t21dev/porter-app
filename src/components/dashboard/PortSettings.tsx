import { useState, useEffect } from 'react';
import { Settings, X, Plus, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_PINNED_PORTS = [
  3000, 5173, 8080, 5432, 27017
];

const MAX_PINNED_PORTS = 10;

export function PortSettings() {
  const [pinnedPorts, setPinnedPorts] = useState<number[]>(DEFAULT_PINNED_PORTS);
  const [newPort, setNewPort] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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
        setPinnedPorts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load pinned ports:', e);
      }
    }
  }, []);

  const savePinnedPorts = (newPorts: number[]) => {
    setPinnedPorts(newPorts);
    localStorage.setItem('porter-pinned-ports', JSON.stringify(newPorts));
    // Trigger a custom event to notify the app
    window.dispatchEvent(new CustomEvent('pinned-ports-changed', { detail: newPorts }));
  };

  const addPort = () => {
    const port = parseInt(newPort);
    if (!isNaN(port) && port > 0 && port < 65536 && !pinnedPorts.includes(port)) {
      if (pinnedPorts.length >= MAX_PINNED_PORTS) {
        alert(`You can only pin up to ${MAX_PINNED_PORTS} ports.`);
        return;
      }
      savePinnedPorts([...pinnedPorts, port].sort((a, b) => a - b));
      setNewPort('');
    }
  };

  const removePort = (port: number) => {
    savePinnedPorts(pinnedPorts.filter(p => p !== port));
  };

  const resetToDefaults = () => {
    savePinnedPorts(DEFAULT_PINNED_PORTS);
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
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Pinned Ports</h3>
            </div>
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
            Pin your frequently used ports for quick access
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
              {pinnedPorts.map((port) => (
                <div
                  key={port}
                  className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded text-xs"
                >
                  <Pin className="h-3 w-3" />
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
            {pinnedPorts.length} / {MAX_PINNED_PORTS} port{pinnedPorts.length !== 1 ? 's' : ''} pinned
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
