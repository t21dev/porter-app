import type { CSSProperties } from 'react';

/** Skeleton rows that mirror the port list while the first scan runs. */
export function PortScanLoader() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" aria-busy="true" aria-label="Scanning ports">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="reveal relative flex h-12 items-center gap-3 overflow-hidden border-b border-border px-3.5 last:border-b-0"
          style={{ '--i': i } as CSSProperties}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-elevated" />
          <span className="h-3 w-10 rounded bg-elevated" />
          <span className="h-3 w-20 rounded bg-elevated/70" />
          <span className="h-3 flex-1 rounded bg-elevated/50" style={{ maxWidth: `${120 + ((i * 53) % 140)}px` }} />
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.035] to-transparent"
            style={{ animation: `shimmer 1.6s var(--ease-in-out) ${i * 80}ms infinite` }}
          />
        </div>
      ))}
    </div>
  );
}
