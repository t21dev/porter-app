import type { CSSProperties } from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

type Variant = 'free' | 'occupied' | 'system';

interface StatsCardProps {
  count: number;
  label: string;
  variant: Variant;
}

const dot: Record<Variant, string> = {
  free: 'bg-free',
  occupied: 'bg-occupied',
  system: 'bg-system',
};

export function StatsCard({ count, label, variant }: StatsCardProps) {
  const value = useCountUp(count);

  return (
    <div className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', dot[variant])} />
        <span className="text-[11.5px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="font-mono text-[26px] font-medium leading-none tracking-[-0.03em] text-foreground tabular">
        {value}
      </div>
    </div>
  );
}

interface StatsOverviewProps {
  free: number;
  occupied: number;
  system: number;
}

/** Three counters sharing one surface, with a proportional distribution bar. */
export function StatsOverview({ free, occupied, system }: StatsOverviewProps) {
  const total = Math.max(1, free + occupied + system);
  const segments: { key: Variant; n: number }[] = [
    { key: 'free', n: free },
    { key: 'occupied', n: occupied },
    { key: 'system', n: system },
  ];

  return (
    <div
      className="reveal overflow-hidden rounded-xl border border-border bg-card"
      style={{ '--i': 1 } as CSSProperties}
    >
      <div className="grid grid-cols-3 divide-x divide-border">
        <StatsCard count={free} label="Free" variant="free" />
        <StatsCard count={occupied} label="Occupied" variant="occupied" />
        <StatsCard count={system} label="System" variant="system" />
      </div>
      <div
        className="flex h-[3px] w-full origin-left gap-px bg-border/60"
        style={{ animation: 'grow-x 900ms var(--ease-out) 120ms both' }}
        aria-hidden
      >
        {segments.map(
          (s) =>
            s.n > 0 && (
              <div
                key={s.key}
                className={cn(dot[s.key], 'opacity-80')}
                style={{ width: `${(s.n / total) * 100}%` }}
              />
            )
        )}
      </div>
    </div>
  );
}
