import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Settings2, X, Plus, Search, Type, List, Pin, Terminal, type LucideIcon } from 'lucide-react';
import SimpleBar from 'simplebar-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { isMac } from '@/lib/platform';
import { UI_SCALES, useUiScaleStore } from '@/store/uiScaleStore';
import { useScanStore } from '@/store/scanStore';
import { MAX_PINNED_PORTS, usePinStore } from '@/store/pinStore';
import { getCliStatus, setCliOnPath, type CliStatus } from '@/lib/tauri';

type SectionId = 'appearance' | 'list' | 'pinned' | 'cli';

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'appearance', label: 'Appearance', icon: Type },
  { id: 'list', label: 'Port list', icon: List },
  { id: 'pinned', label: 'Pinned ports', icon: Pin },
  { id: 'cli', label: 'Command line', icon: Terminal },
];

/** Every setting the search can find, with the words people might type for it. */
const SETTINGS: { id: string; section: SectionId; title: string; keywords: string }[] = [
  { id: 'interface-size', section: 'appearance', title: 'Interface size', keywords: 'zoom scale text font bigger smaller' },
  { id: 'pinned-only', section: 'list', title: 'Only show pinned ports', keywords: 'hide other ports filter shorter' },
  { id: 'show-connections', section: 'list', title: 'Show outgoing connections', keywords: 'established client sockets' },
  { id: 'show-udp', section: 'list', title: 'Show UDP ports', keywords: 'dns vpn sockets protocol' },
  { id: 'pinned-ports', section: 'pinned', title: 'Pinned ports', keywords: 'pin unpin add remove reset favourite favorite' },
  { id: 'cli-path', section: 'cli', title: 'Command line tool', keywords: 'porter terminal path cli audit shell' },
];

const sectionLabel = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.label;

export function PortSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [section, setSection] = useState<SectionId>('appearance');
  const [query, setQuery] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return SETTINGS.filter((s) => {
      const hay = `${s.title} ${s.keywords} ${sectionLabel(s.section)}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [query]);

  const goTo = (settingId: string, target: SectionId) => {
    setSection(target);
    setQuery('');
    setFlash(settingId);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 900);
    // Wait for the section to render before scrolling to the setting.
    requestAnimationFrame(() =>
      document.getElementById(`setting-${settingId}`)?.scrollIntoView({ block: 'nearest' })
    );
  };

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Settings"
          className={cn(isOpen && 'bg-accent text-foreground')}
        >
          <Settings2 className="h-[15px] w-[15px]" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[min(420px,calc(100vh-3rem))] max-w-[600px] flex-col gap-0 overflow-hidden p-0"
        // Radix catches Escape before the input sees it: clear a search first, close on the next press.
        onEscapeKeyDown={(e) => {
          if (query) {
            e.preventDefault();
            setQuery('');
          }
        }}
      >
        <div className="flex h-12 shrink-0 items-center border-b border-border pl-5 pr-12">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Interface size, which ports are listed, pinned ports and the command line tool.
          </DialogDescription>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav aria-label="Settings sections" className="flex w-[184px] shrink-0 flex-col gap-2 border-r border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results?.[0]) {
                    goTo(results[0].id, results[0].section);
                  }
                }}
                placeholder="Search settings"
                aria-label="Search settings"
                className="h-8 pl-8 pr-2 text-[12.5px] [&::-webkit-search-cancel-button]:hidden"
              />
            </div>

            {results ? (
              <div className="flex flex-col gap-0.5" role="list" aria-label="Matching settings">
                {results.length === 0 ? (
                  <p className="px-2.5 py-2 text-[12px] text-muted-foreground">No settings match.</p>
                ) : (
                  results.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="listitem"
                      onClick={() => goTo(s.id, s.section)}
                      className="rounded-md px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span className="block text-[12.5px] font-medium text-foreground">{s.title}</span>
                      <span className="block text-[11px] text-subtle">{sectionLabel(s.section)}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {SECTIONS.map(({ id, label, icon: Icon }) => {
                  const active = id === section;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setSection(id)}
                      className={cn(
                        'flex h-8 items-center gap-2 rounded-md px-2.5 text-left text-[13px]',
                        'transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
                        active
                          ? 'bg-elevated font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', active ? 'text-foreground' : 'text-subtle')} />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          <SimpleBar className="min-w-0 flex-1" style={{ height: '100%' }}>
            <div key={section} className="animate-in fade-in duration-200">
              {section === 'appearance' && <AppearanceSection flash={flash} />}
              {section === 'list' && <ListSection flash={flash} />}
              {section === 'pinned' && <PinnedSection flash={flash} />}
              {section === 'cli' && <CliSetting open={isOpen} flash={flash} />}
            </div>
          </SimpleBar>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One setting block. Briefly tinted when the search jumps to it. */
function SettingBlock({
  id,
  flash,
  className,
  children,
}: {
  id: string;
  flash: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={`setting-${id}`}
      className={cn(
        'border-t border-border px-5 py-3.5 transition-colors duration-300 ease-out first:border-t-0',
        flash === id && 'bg-accent',
        className
      )}
    >
      {children}
    </div>
  );
}

function SwitchRow({
  id,
  flash,
  title,
  on,
  onToggle,
  disabled,
  children,
}: {
  id: string;
  flash: string | null;
  title: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <SettingBlock id={id} flash={flash} className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 id={`${id}-label`} className="text-[13px] font-semibold text-foreground">
          {title}
        </h3>
        {children}
      </div>
      <Switch on={on} labelledBy={`${id}-label`} onToggle={onToggle} disabled={disabled} />
    </SettingBlock>
  );
}

function AppearanceSection({ flash }: { flash: string | null }) {
  const { scale, setScale } = useUiScaleStore();
  const activeScale = UI_SCALES.find((s) => s.value === scale) ?? UI_SCALES[1];

  return (
    <SettingBlock id="interface-size" flash={flash}>
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
    </SettingBlock>
  );
}

function ListSection({ flash }: { flash: string | null }) {
  const { showConnections, setShowConnections, pinnedOnly, setPinnedOnly, showUdp, setShowUdp } = useScanStore();

  return (
    <>
      <SwitchRow
        id="pinned-only"
        flash={flash}
        title="Only show pinned ports"
        on={pinnedOnly}
        onToggle={() => setPinnedOnly(!pinnedOnly)}
      >
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Hide Other ports for a cleaner, shorter view. Search and the counts cover your pinned ports only.
        </p>
      </SwitchRow>
      <SwitchRow
        id="show-connections"
        flash={flash}
        title="Show outgoing connections"
        on={showConnections}
        onToggle={() => setShowConnections(!showConnections)}
      >
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Also list the local port of every connection this machine has open, not just listening ports. A much
          longer list, and more work each refresh.
        </p>
      </SwitchRow>
      <SwitchRow id="show-udp" flash={flash} title="Show UDP ports" on={showUdp} onToggle={() => setShowUdp(!showUdp)}>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          List UDP sockets too, such as DNS and VPNs. Most on a desktop are apps' own outgoing sockets. The Exposed
          view always includes them.
        </p>
      </SwitchRow>
    </>
  );
}

function PinnedSection({ flash }: { flash: string | null }) {
  const [newPort, setNewPort] = useState('');
  const { toast } = useToast();
  const { pins: pinnedPorts, pin, unpin: removePort, reset: resetToDefaults } = usePinStore();
  const full = pinnedPorts.length >= MAX_PINNED_PORTS;

  const addPort = () => {
    const port = parseInt(newPort);
    if (isNaN(port) || port < 1 || port > 65535 || pinnedPorts.includes(port)) return;
    if (pin(port) === 'full') {
      toast({
        variant: 'destructive',
        title: 'Maximum ports reached',
        description: `You can pin up to ${MAX_PINNED_PORTS} ports.`,
      });
      return;
    }
    setNewPort('');
    toast({
      title: 'Port pinned',
      description: `Port ${port} has been added to your pinned ports.`,
    });
  };

  return (
    <SettingBlock id="pinned-ports" flash={flash}>
      <div className="flex items-start justify-between gap-3">
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

      <div className="mt-3 flex gap-2">
        <Input
          type="number"
          value={newPort}
          onChange={(e) => setNewPort(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addPort();
          }}
          placeholder="Port number"
          aria-label="Port number to pin"
          className="h-8 font-mono tabular placeholder:font-sans"
          min="1"
          max="65535"
        />
        <Button size="sm" onClick={addPort} disabled={!newPort} className="h-8 shrink-0 px-2.5" aria-label="Pin port">
          <Plus className="h-3.5 w-3.5" />
          Pin
        </Button>
      </div>

      <div className="mt-3">
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

      <div className="mt-3.5 flex items-center gap-2">
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
    </SettingBlock>
  );
}

/**
 * "Command line tool": whether `porter`, the terminal version installed with
 * the app, works in a new terminal. The installer turns it on; this lets people
 * turn it off, or on again later.
 */
function CliSetting({ open, flash }: { open: boolean; flash: string | null }) {
  const [status, setStatus] = useState<CliStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  // Read fresh each time the section opens: the installer or a terminal may
  // have changed it since.
  useEffect(() => {
    if (!open) return;
    let live = true;
    getCliStatus()
      .then((s) => live && setStatus(s))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [open]);

  if (!status) {
    return (
      <SettingBlock id="cli-path" flash={flash}>
        <h3 className="text-[13px] font-semibold text-foreground">Command line tool</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {failed ? 'Couldn’t check whether porter is on your PATH.' : 'Checking…'}
        </p>
      </SettingBlock>
    );
  }

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
    <SwitchRow
      id="cli-path"
      flash={flash}
      title="Command line tool"
      on={status.on_path}
      onToggle={toggle}
      disabled={!status.can_toggle || busy}
    >
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
    </SwitchRow>
  );
}

/** An on/off switch for a setting whose heading has the id `labelledBy`. */
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
