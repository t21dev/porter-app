import type { CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Port } from '@/types/api';
import { cn, portKey } from '@/lib/utils';
import { useAdviceStore } from '@/store/adviceStore';
import { AdvicePanel } from './AdvicePanel';
import { flaggedPorts } from './ExposureBanner';
import { RiskChip, reachLabel } from './RiskChip';

const RANK = { high: 0, medium: 1, low: 2, ok: 3 } as const;

function owner(p: Port): string {
  if (p.container) return `container ${p.container.name} (${p.container.image})`;
  if (p.process) return `${p.process.name} ${p.process.pid}`;
  return 'owner hidden';
}

/** The view's intro already says Porter doesn't read firewall rules. */
function cardNotes(p: Port): string[] {
  return p.advice!.notes.filter((n) => !n.startsWith('It accepts connections on every network'));
}

/**
 * Only what's reachable beyond this machine (DESIGN.md, View switcher):
 * medium and high as cards with the full advice, the rest one line each.
 */
export function ExposedView({ ports }: { ports: Port[] }) {
  const exposed = ports.filter((p) => p.advice && p.advice.exposure !== 'local');
  const flagged = flaggedPorts(exposed);
  const flaggedKeys = new Set(flagged.map(portKey));
  const rest = exposed
    .filter((p) => !flaggedKeys.has(portKey(p)))
    .sort((a, b) => RANK[a.advice!.risk] - RANK[b.advice!.risk] || a.port - b.port);

  if (exposed.length === 0) {
    return (
      <div className="reveal flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-[13px] font-medium text-free">Nothing is reachable from the network</p>
        <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
          Every port in use only accepts connections from this machine.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="px-0.5 text-[12px] text-muted-foreground">
        <span className="font-mono text-foreground tabular">{exposed.length}</span> of{' '}
        <span className="font-mono tabular">{ports.length}</span> ports accept connections from the network.
        Porter doesn't read firewall rules, so a firewall may still block some of them.
      </p>

      {flagged.length > 0 && (
        <div className="space-y-2">
          {flagged.map((p, i) => (
            <article
              key={portKey(p)}
              className="reveal space-y-2 rounded-xl border border-border bg-card px-3.5 py-3 text-[12.5px]"
              style={{ '--i': Math.min(i, 14) } as CSSProperties}
            >
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <RiskChip risk={p.advice!.risk} />
                <span className="font-mono text-[14px] font-medium tracking-[-0.02em] tabular">{p.port}</span>
                {p.protocol === 'UDP' && <span className="font-mono text-[10.5px] text-subtle">UDP</span>}
                <span className="font-medium">{p.advice!.service ?? 'Unknown service'}</span>
                <span className="truncate text-[12px] text-subtle">
                  {owner(p)}, {reachLabel[p.advice!.exposure]} ({p.ip_address})
                </span>
              </header>
              <p className="text-muted-foreground">{p.advice!.purpose}</p>
              <p className="border-l-2 border-border pl-2.5 text-foreground">{p.advice!.recommendation}</p>
              {cardNotes(p).length > 0 && (
                <ul className="space-y-1 text-[12px] text-muted-foreground">
                  {cardNotes(p).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline gap-2 px-0.5">
            <h2 className="text-[12px] font-medium text-muted-foreground">Expected or low risk</h2>
            <span className="font-mono text-[11px] text-subtle tabular">{rest.length}</span>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {rest.map((p) => (
              <BriefRow key={portKey(p)} port={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BriefRow({ port }: { port: Port }) {
  const key = portKey(port);
  const open = useAdviceStore((s) => s.open === key);
  const toggle = useAdviceStore((s) => s.toggle);
  const panelId = `exposed-${port.port}-${port.protocol}`;
  const a = port.advice!;
  return (
    <div>
      <button
        type="button"
        onClick={() => toggle(key)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'group flex h-10 w-full items-center gap-3 px-3.5 text-left text-[12.5px] transition-colors duration-150 hover:bg-accent focus-visible:outline-hidden focus-visible:bg-accent',
          open && 'bg-accent'
        )}
      >
        <RiskChip risk={a.risk} className="w-[52px] text-center" />
        <span className="w-[52px] shrink-0 font-mono text-[13px] font-medium tabular">{port.port}</span>
        <span className="flex w-[150px] shrink-0 items-center gap-1.5 truncate text-muted-foreground">
          {port.protocol === 'UDP' && <span className="font-mono text-[10.5px] text-subtle">UDP</span>}
          <span className="truncate">{a.service ?? 'Unknown'}</span>
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{port.container?.name ?? port.process?.name ?? 'owner hidden'}</span>
        <span className="shrink-0 text-[11.5px] text-subtle">{reachLabel[a.exposure]}</span>
        <ChevronRight
          aria-hidden
          className={cn('h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-200 ease-out', open && 'rotate-90')}
        />
      </button>
      <AdvicePanel port={port} open={open} id={panelId} />
    </div>
  );
}
