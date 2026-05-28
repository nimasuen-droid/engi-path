import { cn } from '@/lib/utils';
import type { CalcResult } from '@/services/calculations';
import { StatusBadge } from './StatusBadge';

export function CalcResultCard({ title, result, className }: { title: string; result: CalcResult; className?: string }) {
  return (
    <div className={cn('border bg-card p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        {result.pass !== undefined && (
          <StatusBadge status={result.pass ? 'compliant' : 'noncompliant'}>{result.pass ? 'PASS' : 'FAIL'}</StatusBadge>
        )}
      </div>
      <div className="font-mono text-2xl">
        {result.value} <span className="text-sm text-muted-foreground">{result.unit}</span>
      </div>
      <div className="rounded-sm bg-muted p-2 font-mono text-xs">{result.formula}</div>
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Assumptions</div>
        <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
          {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </div>
      <div className="text-[11px] text-muted-foreground">Code ref: <span className="font-mono">{result.codeRef}</span></div>
      {result.notes && <div className="text-xs text-warning">{result.notes}</div>}
    </div>
  );
}
