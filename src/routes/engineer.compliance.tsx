import { createFileRoute } from '@tanstack/react-router';
import { RequireActiveProject } from '@/components/RequireActiveProject';
import { useProjects } from '@/state/projects';
import { evaluate, score } from '@/services/rules/library';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';

export const Route = createFileRoute('/engineer/compliance')({
  component: () => <RequireActiveProject>{(id) => <Compliance id={id} />}</RequireActiveProject>,
});

function Compliance({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const findings = evaluate(p);
  const s = score(findings);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Compliance Score" value={`${s.score}%`} status={s.score >= 80 ? 'compliant' : s.score >= 50 ? 'warning' : 'noncompliant'} />
        <MetricCard label="Compliant" value={s.breakdown.compliant} status="compliant" />
        <MetricCard label="Review" value={s.breakdown.warning} status="warning" />
        <MetricCard label="Non-compliant" value={s.breakdown.noncompliant} status="noncompliant" />
      </div>
      <div className="border bg-card divide-y">
        {findings.map((f) => (
          <div key={f.ruleId} className="p-4 grid md:grid-cols-[160px_1fr_auto] gap-4 items-start">
            <StatusBadge status={f.status} />
            <div>
              <div className="font-semibold text-sm">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{f.message}</div>
              <div className="text-xs text-muted-foreground mt-2 italic">{f.explanation}</div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{f.codeRef}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
