import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Pause } from 'lucide-react';
import { Port } from '@/types/api';
import { getPortTypeInfo } from '@/lib/portTypes';
import { cn } from '@/lib/utils';
import { PortListItem } from './PortListItem';

type SortKey = 'port' | 'service' | 'process' | 'status';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'process';

interface ViewPrefs {
  sortKey: SortKey;
  sortDir: SortDir;
  groupBy: GroupBy;
}

const PREFS_KEY = 'porter-other-ports-view';
const DEFAULT_PREFS: ViewPrefs = { sortKey: 'port', sortDir: 'asc', groupBy: 'none' };

function loadPrefs(): ViewPrefs {
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

const STATUS_RANK: Record<Port['status'], number> = { occupied: 0, system: 1, free: 2 };

const processName = (p: Port) => (p.status !== 'free' && p.process?.name) || '';

function comparePorts(a: Port, b: Port, key: SortKey): number {
  switch (key) {
    case 'service':
      return getPortTypeInfo(a.port).label.localeCompare(getPortTypeInfo(b.port).label);
    case 'process': {
      const an = processName(a).toLowerCase();
      const bn = processName(b).toLowerCase();
      // Ports without a process sink to the bottom in ascending order.
      if (!an !== !bn) return an ? -1 : 1;
      return an.localeCompare(bn);
    }
    case 'status':
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    default:
      return 0;
  }
}

function sortPorts(ports: Port[], key: SortKey, dir: SortDir): Port[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...ports].sort((a, b) => {
    const primary = comparePorts(a, b, key) * sign;
    // Port number is always the tie-breaker, so equal keys never shuffle.
    return primary !== 0 ? primary : (a.port - b.port) * (key === 'port' ? sign : 1);
  });
}

interface OtherPortsListProps {
  ports: Port[];
  onKill: (pid: number) => void;
  /** Pin a port from its row, without going into settings. */
  onTogglePin?: (port: number) => void;
}

/**
 * The "Other ports" table: sortable columns, optional grouping by app, and a
 * frozen order while the pointer is over it so live refreshes never move rows
 * out from under the user.
 */
export function OtherPortsList({ ports, onKill, onTogglePin }: OtherPortsListProps) {
  const [prefs, setPrefs] = useState<ViewPrefs>(loadPrefs);
  const [paused, setPaused] = useState(false);
  // Groups start collapsed, like Task Manager; this tracks the open ones.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [killed, setKilled] = useState<Set<number>>(new Set());
  const frozen = useRef<{ order: number[]; snapshot: Map<number, Port> } | null>(null);
  const resumeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Preferences are a convenience; ignore storage failures.
    }
  }, [prefs]);

  const sorted = useMemo(
    () => sortPorts(ports, prefs.sortKey, prefs.sortDir),
    [ports, prefs.sortKey, prefs.sortDir],
  );

  const freeze = (rows: Port[]) => {
    frozen.current = {
      order: rows.map((p) => p.port),
      snapshot: new Map(rows.map((p) => [p.port, p])),
    };
  };

  // Changing the sort while paused re-freezes in the new order.
  useEffect(() => {
    if (paused) freeze(sortPorts(ports, prefs.sortKey, prefs.sortDir));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.sortKey, prefs.sortDir]);

  // Fresh data has arrived and confirmed the kill; stop hiding those rows.
  useEffect(() => {
    if (killed.size === 0) return;
    const alive = new Set(ports.map((p) => p.process?.pid));
    if ([...killed].some((pid) => !alive.has(pid))) setKilled(new Set());
  }, [ports, killed]);

  const { rows, pendingChanges } = useMemo(() => {
    if (!paused || !frozen.current) {
      return { rows: sorted.filter((p) => !killed.has(p.process?.pid ?? -1)), pendingChanges: 0 };
    }
    const latest = new Map(ports.map((p) => [p.port, p]));
    const { order, snapshot } = frozen.current;
    const frozenSet = new Set(order);
    const visible = order
      .map((n) => latest.get(n) ?? snapshot.get(n)!)
      .filter((p) => !killed.has(p.process?.pid ?? -1));
    const added = ports.filter((p) => !frozenSet.has(p.port)).length;
    const removed = order.filter((n) => !latest.has(n)).length;
    return { rows: visible, pendingChanges: added + removed };
  }, [paused, sorted, ports, killed]);

  const pause = () => {
    window.clearTimeout(resumeTimer.current);
    if (!paused) {
      freeze(sorted);
      setPaused(true);
    }
  };

  const resume = (delay = 500) => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      frozen.current = null;
      setPaused(false);
    }, delay);
  };

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  const handleKill = (pid: number) => {
    setKilled((prev) => new Set(prev).add(pid));
    onKill(pid);
  };

  const toggleSort = (key: SortKey) =>
    setPrefs((p) =>
      p.sortKey === key
        ? { ...p, sortDir: p.sortDir === 'asc' ? 'desc' : 'asc' }
        : { ...p, sortKey: key, sortDir: 'asc' },
    );

  const groups = useMemo(() => {
    if (prefs.groupBy !== 'process') return null;
    const map = new Map<string, Port[]>();
    for (const p of rows) {
      const name = processName(p) || (p.status === 'system' ? 'System' : 'No process');
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(p);
    }
    const entries = [...map.entries()];
    if (prefs.sortKey === 'process') {
      // Rows are already in process order; keep the group order they produced.
      return entries;
    }
    // Otherwise biggest apps first, then alphabetical; unowned ports last.
    return entries.sort(
      (a, b) =>
        Number(a[0] === 'No process') - Number(b[0] === 'No process') ||
        b[1].length - a[1].length ||
        a[0].localeCompare(b[0]),
    );
  }, [rows, prefs.groupBy, prefs.sortKey]);

  const toggleGroup = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div
      onPointerEnter={pause}
      onPointerLeave={() => resume()}
      onFocus={pause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) resume();
      }}
    >
      {/* Toolbar + column header stay pinned while the list scrolls. */}
      <div className="sticky top-0 z-10 bg-background pt-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div
            role="radiogroup"
            aria-label="Group other ports"
            className="flex h-7 items-center gap-0.5 rounded-md border border-border bg-card p-[2px]"
          >
            {(
              [
                { value: 'none', label: 'All ports' },
                { value: 'process', label: 'By app' },
              ] as const
            ).map((option) => {
              const active = prefs.groupBy === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPrefs((p) => ({ ...p, groupBy: option.value }))}
                  className={cn(
                    'h-full rounded-[5px] px-2.5 text-[11.5px] font-medium transition-[background-color,color] duration-150 ease-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    active
                      ? 'bg-elevated text-foreground'
                      : 'text-subtle hover:text-muted-foreground',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              'flex items-center gap-1.5 text-[11.5px] transition-opacity duration-200 ease-out',
              paused ? 'opacity-100' : 'opacity-0',
            )}
            aria-live="polite"
          >
            <Pause className="h-3 w-3 fill-current text-subtle" />
            <span className="text-muted-foreground">Paused while you browse</span>
            {pendingChanges > 0 && (
              <span className="font-mono text-subtle tabular">
                · {pendingChanges} change{pendingChanges === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <div className="flex h-9 items-center gap-3 rounded-t-xl border border-border bg-card px-3.5">
          <span className="w-2 shrink-0" />
          <SortHeader
            label="Port"
            k="port"
            prefs={prefs}
            onSort={toggleSort}
            className="w-[52px]"
          />
          <SortHeader
            label="Service"
            k="service"
            prefs={prefs}
            onSort={toggleSort}
            className="w-[118px]"
          />
          <SortHeader
            label="Process"
            k="process"
            prefs={prefs}
            onSort={toggleSort}
            className="flex-1"
          />
          <SortHeader
            label="Status"
            k="status"
            prefs={prefs}
            onSort={toggleSort}
            className="justify-end"
          />
          {/* Room for the rows' pin and kill buttons, so Status lines up */}
          {onTogglePin && <span className="w-7 shrink-0" />}
          <span className="w-7 shrink-0" />
        </div>
      </div>

      {/* Table body */}
      <div className="rounded-b-xl border-x border-b border-border bg-card">
        {groups ? (
          groups.map(([name, items]) => {
            const isCollapsed = !expanded.has(name);
            return (
              <div key={name} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(name)}
                  aria-expanded={!isCollapsed}
                  className="flex h-10 w-full items-center gap-2 px-3.5 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
                >
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-200 ease-out',
                      !isCollapsed && 'rotate-90',
                    )}
                  />
                  <span className="truncate text-[12.5px] font-medium text-foreground">{name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-subtle tabular">
                    {items.length} port{items.length === 1 ? '' : 's'}
                  </span>
                </button>
                {!isCollapsed && (
                  <Rows>
                    {items.map((port, i) => (
                      <PortListItem key={port.port} port={port} index={i} onKill={handleKill} onTogglePin={onTogglePin} />
                    ))}
                  </Rows>
                )}
              </div>
            );
          })
        ) : (
          <Rows>
            {rows.map((port, i) => (
              <PortListItem key={port.port} port={port} index={i} onKill={handleKill} onTogglePin={onTogglePin} />
            ))}
          </Rows>
        )}
      </div>
    </div>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden [&>*:last-child]:rounded-b-xl">
      {children}
    </div>
  );
}

function SortHeader({
  label,
  k,
  prefs,
  onSort,
  className,
}: {
  label: string;
  k: SortKey;
  prefs: ViewPrefs;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = prefs.sortKey === k;
  const Arrow = prefs.sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      aria-sort={active ? (prefs.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      title={`Sort by ${label.toLowerCase()}`}
      className={cn(
        'group flex shrink-0 items-center gap-1 text-[11px] font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:text-foreground',
        active ? 'text-foreground' : 'text-subtle hover:text-muted-foreground',
        className,
      )}
    >
      {label}
      <Arrow
        className={cn(
          'h-3 w-3 transition-opacity duration-150',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
        )}
      />
    </button>
  );
}
