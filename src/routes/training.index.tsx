import { createFileRoute, Link } from '@tanstack/react-router';
import { SCENARIOS } from '@/services/training/scenarios';
import { MetricCard } from '@/components/MetricCard';
import { useTraining } from '@/state/training';

export const Route = createFileRoute('/training/')({
  component: TrainingDashboard,
});

function TrainingDashboard() {
  const { results } = useTraining();
  const completed = Object.keys(results).length;
  const avg = completed ? Math.round(Object.values(results).reduce((a, b) => a + b, 0) / completed) : 0;
  const next = SCENARIOS.find((s) => !(s.id in results)) ?? SCENARIOS[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Assigned" value={SCENARIOS.length} />
        <MetricCard label="Completed" value={completed} status="compliant" />
        <MetricCard label="Avg Score" value={`${avg}%`} status={avg >= 80 ? 'compliant' : avg >= 50 ? 'warning' : 'incomplete'} />
        <MetricCard label="Next Recommended" value={next.title} />
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Scenarios</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {SCENARIOS.map((s) => (
            <Link key={s.id} to="/training/scenarios" search={{ id: s.id }} className="border bg-card p-4 hover:border-primary transition-colors">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{s.title}</div>
                <span className="text-[10px] font-mono uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded-sm">{s.category}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
              {s.id in results && <div className="mt-2 text-[10px] font-mono text-compliant">Score: {results[s.id]}%</div>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
