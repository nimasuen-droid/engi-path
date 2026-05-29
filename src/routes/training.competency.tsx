import { createFileRoute } from "@tanstack/react-router";
import { useTraining, COMPETENCY_LEVELS, levelFor } from "@/state/training";
import { SCENARIOS } from "@/services/training/scenarios";
import { MetricCard } from "@/components/MetricCard";

export const Route = createFileRoute("/training/competency")({
  component: Competency,
});

function Competency() {
  const { results } = useTraining();
  const completed = Object.keys(results).length;
  const avg = completed
    ? Math.round(Object.values(results).reduce((a, b) => a + b, 0) / completed)
    : 0;
  const level = levelFor(completed, avg);
  const idx = COMPETENCY_LEVELS.indexOf(level);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Current Level" value={level} status="compliant" />
        <MetricCard label="Completed" value={completed} />
        <MetricCard
          label="Avg Score"
          value={`${avg}%`}
          status={avg >= 80 ? "compliant" : avg >= 50 ? "warning" : "incomplete"}
        />
      </div>
      <div className="border bg-card p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Progression Ladder
        </div>
        <div className="flex items-center gap-1">
          {COMPETENCY_LEVELS.map((l, i) => (
            <div
              key={l}
              className={`flex-1 px-2 py-2 text-center text-xs border ${i <= idx ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground"}`}
            >
              {l}
            </div>
          ))}
        </div>
      </div>
      <div className="border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Scenario</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Score</th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-1.5">{s.title}</td>
                <td className="px-3 py-1.5 font-mono">{s.category}</td>
                <td className="px-3 py-1.5 font-mono">
                  {results[s.id] !== undefined ? `${results[s.id]}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
