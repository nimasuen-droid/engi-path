import { cn } from '@/lib/utils';

export function MetricCard({ label, value, unit, hint, status, className }: { label: string; value: string | number; unit?: string; hint?: string; status?: 'compliant' | 'warning' | 'noncompliant' | 'incomplete'; className?: string }) {
  const border = status === 'compliant' ? 'border-l-compliant' : status === 'warning' ? 'border-l-warning' : status === 'noncompliant' ? 'border-l-noncompliant' : 'border-l-primary';
  return (
    <div className={cn('border bg-card p-4 border-l-4', border, className)}>
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-2xl font-semibold font-mono">{value}</div>
        {unit && <div className="text-xs text-muted-foreground">{unit}</div>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
