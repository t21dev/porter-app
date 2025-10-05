interface StatsCardProps {
  count: number;
  label: string;
  variant: 'free' | 'occupied' | 'system';
}

export function StatsCard({ count, label, variant }: StatsCardProps) {
  const colors = {
    free: 'border-emerald-500/40 bg-emerald-500/10',
    occupied: 'border-amber-500/40 bg-amber-500/10',
    system: 'border-blue-500/40 bg-blue-500/10',
  };

  const textColors = {
    free: 'text-emerald-500',
    occupied: 'text-amber-500',
    system: 'text-blue-500',
  };

  return (
    <div className={`rounded-lg border ${colors[variant]} p-3`}>
      <div className={`text-2xl font-bold ${textColors[variant]}`}>{count}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}
