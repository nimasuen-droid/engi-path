import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProjects } from "@/state/projects";
import { evaluate, score } from "@/services/rules/library";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Activity,
  BookOpen,
  Calculator,
  Database,
  FileSearch,
  FileText,
  FolderKanban,
  HelpCircle,
  History,
  ListChecks,
  Network,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/engineer/")({
  component: Dashboard,
});

const MODULES = [
  { to: "/engineer/manual", label: "User Guide", icon: HelpCircle },
  { to: "/engineer/projects", label: "Projects", icon: FolderKanban },
  { to: "/engineer/basis", label: "Design Basis", icon: ListChecks },
  { to: "/engineer/calculations", label: "Calculations", icon: Calculator },
  { to: "/engineer/workflow", label: "Workflow", icon: Network },
  { to: "/engineer/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/engineer/review", label: "Assurance", icon: FileSearch },
  { to: "/engineer/integrity", label: "Integrity", icon: Activity },
  { to: "/engineer/codes", label: "Codes", icon: BookOpen },
  { to: "/engineer/reports", label: "Reports", icon: FileText },
  { to: "/engineer/audit", label: "Audit Trail", icon: History },
];

function Dashboard() {
  const { projects, loadSampleData, setActive } = useProjects();
  const navigate = useNavigate();
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

      <section className="app-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Engineering Modules</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Open the next design, calculation, assurance, or reporting workspace.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.to}
                to={module.to}
                className="tap-target flex min-h-24 flex-col items-center justify-center gap-2 rounded-sm border bg-background px-2 py-3 text-center text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 focus-visible:border-primary"
                aria-label={`Open ${module.label}`}
              >
                <span className="grid size-10 place-items-center rounded-sm bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="line-clamp-2 leading-tight">{module.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

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
                  onClick={() => {
                    setActive(p.id);
                    void navigate({ to: "/engineer/basis" });
                  }}
                  className="text-left border bg-card p-4 hover:border-primary transition-colors"
                  aria-label={`Continue ${p.name} in Design Basis`}
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
