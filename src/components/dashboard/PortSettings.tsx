import { useEffect, useState } from 'react';
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
import { isMac } from '@/lib/platform';
import { UI_SCALES, useUiScaleStore } from '@/store/uiScaleStore';
import { useScanStore } from '@/store/scanStore';
import { MAX_PINNED_PORTS, usePinStore } from '@/store/pinStore';
import { getCliStatus, setCliOnPath, type CliStatus } from '@/lib/tauri';

export function PortSettings() {
  const [newPort, setNewPort] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { pins: pinnedPorts, pin, unpin: removePort, reset: resetToDefaults } = usePinStore();

  const addPort = () => {
    const port = parseInt(newPort);
    if (isNaN(port) || port < 1 || port > 65535 || pinnedPorts.includes(port)) return;
    if (pin(port) === 'full') {
      toast({
        variant: "destructive",
        title: "Maximum ports reached",
        description: `You can pin up to ${MAX_PINNED_PORTS} ports.`,
      });
      return;
    }
    setNewPort('');
    toast({
      title: "Port pinned",
      description: `Port ${port} has been added to your pinned ports.`,
    });
  };

  const full = pinnedPorts.length >= MAX_PINNED_PORTS;
  const { scale, setScale } = useUiScaleStore();
  const activeScale = UI_SCALES.find((s) => s.value === scale) ?? UI_SCALES[1];
  const { showConnections, setShowConnections, pinnedOnly, setPinnedOnly, showUdp, setShowUdp } = useScanStore();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Settings"
          className={cn(isOpen && 'bg-accent text-foreground')}
        >
          <Settings2 className="h-[15px] w-[15px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="px-4 pb-3.5 pt-3.5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Interface size</h3>
            <span className="text-[11.5px] text-muted-foreground">
              {activeScale.label}{' '}
              <span className="font-mono text-subtle tabular">{Math.round(activeScale.value * 100)}%</span>
            </span>
          </div>
          <div
            role="radiogroup"
            aria-label="Interface size"
            className="mt-2.5 grid grid-cols-4 gap-0.5 rounded-lg border border-border bg-background p-[3px]"
          >
            {UI_SCALES.map((option, i) => {
              const active = option.value === scale;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${option.label} (${Math.round(option.value * 100)}%)`}
                  title={`${option.label} · ${Math.round(option.value * 100)}%`}
                  onClick={() => setScale(option.value)}
                  className={cn(
                    'flex h-8 items-center justify-center rounded-md font-medium leading-none',
                    'transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.95]',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
                    active ? 'bg-elevated text-foreground' : 'text-subtle hover:text-muted-foreground'
                  )}
                  style={{ fontSize: `${11 + i * 2.5}px` }}
                >
                  Aa
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-subtle">
            Scales text, icons and spacing. Shortcut:{' '}
            <kbd className="font-mono">{isMac ? '⌘' : 'Ctrl'} +</kbd> /{' '}
            <kbd className="font-mono">{isMac ? '⌘' : 'Ctrl'} −</kbd>
          </p>
        </div>

        <div className="border-t border-border" />

        <div className="flex items-start justify-between gap-4 px-4 py-3.5">
          <div>
            <h3 id="pinned-only-label" className="text-[13px] font-semibold text-foreground">
              Only show pinned ports
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Hide Other ports for a cleaner, shorter view. Search and the counts cover your pinned
              ports only.
            </p>
          </div>
          <Switch on={pinnedOnly} labelledBy="pinned-only-label" onToggle={() => setPinnedOnly(!pinnedOnly)} />
        </div>

        <div className="border-t border-border" />

        <div className="flex items-start justify-between gap-4 px-4 py-3.5">
          <div>
            <h3 id="show-connections-label" className="text-[13px] font-semibold text-foreground">
              Show outgoing connections
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Also list the local port of every connection this machine has open, not just
              listening ports. A much longer list, and more work each refresh.
            </p>
          </div>
          <Switch
            on={showConnections}
            labelledBy="show-connections-label"
            onToggle={() => setShowConnections(!showConnections)}
          />
        </div>

        <div className="border-t border-border" />

        <div className="flex items-start justify-between gap-4 px-4 py-3.5">
          <div>
            <h3 id="show-udp-label" className="text-[13px] font-semibold text-foreground">
              Show UDP ports
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              List UDP sockets too, such as DNS and VPNs. Most on a desktop are apps' own
              outgoing sockets. The Exposed view always includes them.
            </p>
          </div>
          <Switch on={showUdp} labelledBy="show-udp-label" onToggle={() => setShowUdp(!showUdp)} />
        </div>

        <div className="border-t border-border" />

        <CliSetting open={isOpen} />

        <div className="border-t border-border" />

        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Pinned ports</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Always shown at the top, running or not. You can also pin or unpin any port from its row.
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

/** An on/off switch for a setting whose heading has the id `labelledBy`. */
/**
 * "Command line tool": whether `porter`, the terminal version installed with
 * the app, works in a new terminal. The installer turns it on; this lets people
 * turn it off, or on again later.
 */
function CliSetting({ open }: { open: boolean }) {
  const [status, setStatus] = useState<CliStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  // Read fresh each time the menu opens: the installer or a terminal may
  // have changed it since.
  useEffect(() => {
    if (!open) return;
    let live = true;
    getCliStatus()
      .then((s) => live && setStatus(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open]);

  if (!status) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const next = await setCliOnPath(!status.on_path);
      setStatus(next);
      toast({
        title: next.on_path ? 'porter is on your PATH' : 'porter is off your PATH',
        description: next.on_path
          ? 'Open a new terminal and run porter.'
          : 'New terminals won’t find it. You can turn it back on here.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== 'Cancelled.') {
        toast({ variant: 'destructive', title: 'Couldn’t change the PATH', description: message });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <h3 id="cli-path-label" className="text-[13px] font-semibold text-foreground">
          Command line tool
        </h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {status.on_path ? (
            <>
              Run <code className="font-mono text-foreground">porter</code> in any terminal for the live view or{' '}
              <code className="font-mono text-foreground">porter audit</code>.
            </>
          ) : (
            <>
              Add <code className="font-mono text-foreground">porter</code> to your PATH so it runs in any terminal.
            </>
          )}
        </p>
        {status.note && <p className="mt-1 text-[11.5px] text-subtle">{status.note}</p>}
      </div>
      <Switch
        on={status.on_path}
        labelledBy="cli-path-label"
        onToggle={toggle}
        disabled={!status.can_toggle || busy}
      />
    </div>
  );
}

function Switch({
  on,
  labelledBy,
  onToggle,
  disabled = false,
}: {
  on: boolean;
  labelledBy: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ease-out',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        on ? 'border-foreground/60 bg-foreground/80' : 'border-border bg-elevated'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform duration-200 ease-out',
          on ? 'translate-x-4 bg-background' : 'translate-x-0 bg-muted-foreground'
        )}
      />
    </button>
  );
}
