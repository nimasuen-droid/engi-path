import { createFileRoute, Link } from "@tanstack/react-router";
import { useProjects } from "@/state/projects";
import { evaluate, score } from "@/services/rules/library";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Database } from "lucide-react";

export const Route = createFileRoute("/engineer/")({
  component: Dashboard,
});

function Dashboard() {
  const { projects, loadSampleData, setActive } = useProjects();
  const active = projects.filter((p) => !p.archived);
  const totals = active.reduce(
    (acc, p) => {
      const f = evaluate(p);
      const s = score(f);
      acc.scoreSum += s.score;
      acc.unresolved += s.breakdown.noncompliant + s.breakdown.warning;
      return acc;
    },
    { scoreSum: 0, unresolved: 0 },
  );
  const avg = active.length ? Math.round(totals.scoreSum / active.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Projects" value={active.length} />
        <MetricCard
          label="Avg. Compliance"
          value={`${avg}%`}
          status={avg >= 80 ? "compliant" : avg >= 50 ? "warning" : "noncompliant"}
        />
        <MetricCard
          label="Unresolved Issues"
          value={totals.unresolved}
          status={totals.unresolved ? "warning" : "compliant"}
        />
        <MetricCard
          label="Archived"
          value={projects.filter((p) => p.archived).length}
          hint="Excluded from metrics"
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </h2>
          <Link to="/engineer/projects" className="text-xs text-primary hover:underline">
            Manage →
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="border bg-card p-8 text-center text-sm text-muted-foreground">
            <div>
              No projects yet. Load the sample engineering data or create your first guided project.
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => void loadSampleData()}
                className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-sm"
              >
                <Database className="size-3.5" /> Load 5 Sample Data
              </button>
              <Link
                to="/engineer/projects"
                className="inline-flex items-center text-xs border px-3 py-1.5 rounded-sm hover:bg-muted"
              >
                Create Project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map((p) => {
              const f = evaluate(p);
              const s = score(f);
              const status =
                s.score >= 80 ? "compliant" : s.score >= 50 ? "warning" : "noncompliant";
              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p.id)}
                  className="text-left border bg-card p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.client}</div>
                    </div>
                    <StatusBadge status={status}>{s.score}%</StatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
                    <div>
                      FLUID: <span className="text-foreground">{p.fluidType}</span>
                    </div>
                    <div>
                      CODE: <span className="text-foreground">{p.designCode}</span>
                    </div>
                    <div>
                      L: <span className="text-foreground">{p.length_km} km</span>
                    </div>
                    <div>
                      P: <span className="text-foreground">{p.designPressure_MPa} MPa</span>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-muted-foreground">
                    {s.breakdown.noncompliant} crit · {s.breakdown.warning} warn ·{" "}
                    {s.breakdown.compliant} ok
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
