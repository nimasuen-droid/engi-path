import { createFileRoute } from '@tanstack/react-router';
import { useTraining } from '@/state/training';
import { SCENARIOS } from '@/services/training/scenarios';

export const Route = createFileRoute('/training/reports')({
  component: Reports,
});

function Reports() {
  const { results } = useTraining();
  return (
    <div className="border bg-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-3 py-2 text-left">Scenario</th><th className="px-3 py-2 text-left">Category</th><th className="px-3 py-2 text-left">Score</th><th className="px-3 py-2 text-left">Status</th></tr>
        </thead>
        <tbody>
          {SCENARIOS.map((s) => {
            const score = results[s.id];
            return (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-1.5">{s.title}</td>
                <td className="px-3 py-1.5 font-mono">{s.category}</td>
                <td className="px-3 py-1.5 font-mono">{score !== undefined ? `${score}%` : '—'}</td>
                <td className="px-3 py-1.5 font-mono">{score === undefined ? 'Not started' : score >= 80 ? 'Pass' : 'Review'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
