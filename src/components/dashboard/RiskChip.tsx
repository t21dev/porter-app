import type { Risk } from '@/types/api';
import { cn } from '@/lib/utils';

const tone: Record<Risk, string> = {
  high: 'text-destructive border-destructive/30 bg-destructive/8',
  medium: 'text-occupied border-occupied/30 bg-occupied/8',
  low: 'text-muted-foreground border-border',
  ok: 'text-free border-free/25',
};

const label: Record<Risk, string> = { high: 'High', medium: 'Medium', low: 'Low', ok: 'OK' };

/** Risk as a word in its tone, never a bare colour (DESIGN.md, Risk chip). */
export function RiskChip({ risk, className }: { risk: Risk; className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-md border px-1.5 py-px text-[10.5px] font-medium',
        tone[risk],
        className
      )}
    >
      {label[risk]}
    </span>
  );
}

/** How far a port reaches, in the words a row shows. */
export const reachLabel = {
  local: 'this machine',
  private: 'local network',
  public: 'public address',
  all: 'all interfaces',
} as const;
