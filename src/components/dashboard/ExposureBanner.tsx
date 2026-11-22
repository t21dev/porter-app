import { ArrowRight, ShieldAlert } from 'lucide-react';
import type { Port } from '@/types/api';
import { cn } from '@/lib/utils';

/** Medium and high ports reachable beyond this machine, riskiest first. */
export function flaggedPorts(ports: Port[]): Port[] {
  return ports
    .filter((p) => p.advice && p.advice.exposure !== 'local' && (p.advice.risk === 'high' || p.advice.risk === 'medium'))
    .sort((a, b) => Number(b.advice!.risk === 'high') - Number(a.advice!.risk === 'high') || a.port - b.port);
}

/**
 * Shown under the stats while anything medium or high is reachable from the
 * network (DESIGN.md, Exposure banner). Review opens the Exposed view.
 */
export function ExposureBanner({ ports, onReview }: { ports: Port[]; onReview: () => void }) {
  const flagged = flaggedPorts(ports);
  if (flagged.length === 0) return null;
  const high = flagged.filter((p) => p.advice!.risk === 'high').length;
  const medium = flagged.length - high;
  const worst = flagged[0];
  const name = worst.advice!.service ?? `Port ${worst.port}`;
  const isHigh = high > 0;
  const counts = [high > 0 && `${high} high`, medium > 0 && `${medium} medium`].filter(Boolean).join(', ');

  return (
    <div
      role="status"
      className={cn(
        'reveal flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[13px]',
        isHigh ? 'border-destructive/20 bg-destructive/6' : 'border-occupied/20 bg-occupied/6'
      )}
    >
      <ShieldAlert className={cn('h-4 w-4 shrink-0', isHigh ? 'text-destructive' : 'text-occupied')} strokeWidth={1.75} />
      <p className="min-w-0 flex-1 truncate">
        <span className="font-medium text-foreground">{name} is open to the network.</span>{' '}
        <span className="text-muted-foreground">
          {flagged.length === 1 ? 'It needs a look.' : `${flagged.length} ports need a look: ${counts}.`}
        </span>
      </p>
      <button
        type="button"
        onClick={onReview}
        className={cn(
          'flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2',
          isHigh
            ? 'text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40'
            : 'text-occupied hover:bg-occupied/10 focus-visible:ring-occupied/40'
        )}
      >
        Review
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
