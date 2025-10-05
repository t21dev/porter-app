interface StatsCardProps {
  count: number;
  label: string;
  variant: 'free' | 'occupied' | 'system';
}

export function StatsCard({ count, label, variant }: StatsCardProps) {
  const colors = {
    free: 'border-green-500/50 bg-green-500/5',
    occupied: 'border-red-500/50 bg-red-500/5',
    system: 'border-yellow-500/50 bg-yellow-500/5',
  };

  const textColors = {
    free: 'text-green-500',
    occupied: 'text-red-500',
    system: 'text-yellow-500',
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
