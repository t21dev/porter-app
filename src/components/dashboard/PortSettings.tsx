import { useState, useEffect } from 'react';
import { Settings2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DEFAULT_PINNED_PORTS = [
  3000, 5173, 8080, 5432, 27017
];

const MAX_PINNED_PORTS = 10;

export function PortSettings() {
  const [pinnedPorts, setPinnedPorts] = useState<number[]>(DEFAULT_PINNED_PORTS);
  const [newPort, setNewPort] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

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
        toast({
          variant: "destructive",
          title: "Maximum ports reached",
          description: `You can only pin up to ${MAX_PINNED_PORTS} ports.`,
        });
        return;
      }
      savePinnedPorts([...pinnedPorts, port].sort((a, b) => a - b));
      setNewPort('');
      toast({
        title: "Port pinned",
        description: `Port ${port} has been added to your pinned ports.`,
      });
    }
  };

  const removePort = (port: number) => {
    savePinnedPorts(pinnedPorts.filter(p => p !== port));
  };

  const resetToDefaults = () => {
    savePinnedPorts(DEFAULT_PINNED_PORTS);
  };

  const full = pinnedPorts.length >= MAX_PINNED_PORTS;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Pinned port settings"
          title="Pinned ports"
          className={cn(isOpen && 'bg-accent text-foreground')}
        >
          <Settings2 className="h-[15px] w-[15px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Pinned ports</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Always shown at the top, running or not.
            </p>
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            className="shrink-0 rounded-md px-2 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          >
            Reset
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3">
          <Input
            type="number"
            value={newPort}
            onChange={(e) => setNewPort(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') addPort();
            }}
            placeholder="Port number"
            className="h-8 font-mono tabular placeholder:font-sans"
            min="1"
            max="65535"
            autoFocus
          />
          <Button
            size="sm"
            onClick={addPort}
            disabled={!newPort}
            className="h-8 shrink-0 px-2.5"
            aria-label="Pin port"
          >
            <Plus className="h-3.5 w-3.5" />
            Pin
          </Button>
        </div>

        <div className="max-h-60 overflow-y-auto border-t border-border px-4 py-3">
          {pinnedPorts.length === 0 ? (
            <p className="text-[12px] text-subtle">No pinned ports yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pinnedPorts.map((port) => (
                <span
                  key={port}
                  className="group inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background pl-2 pr-1 font-mono text-[12px] text-foreground tabular animate-in fade-in zoom-in-95 duration-200"
                >
                  {port}
                  <button
                    type="button"
                    onClick={() => removePort(port)}
                    aria-label={`Unpin port ${port}`}
                    className="flex h-5 w-5 items-center justify-center rounded text-subtle transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-elevated">
            <div
              className={cn(
                'h-full origin-left rounded-full transition-transform duration-300 ease-out',
                full ? 'bg-occupied' : 'bg-foreground/50'
              )}
              style={{ transform: `scaleX(${pinnedPorts.length / MAX_PINNED_PORTS})` }}
            />
          </div>
          <span className="font-mono text-[11px] text-subtle tabular">
            {pinnedPorts.length}/{MAX_PINNED_PORTS}
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
