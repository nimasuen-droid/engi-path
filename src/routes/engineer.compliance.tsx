import { createFileRoute } from "@tanstack/react-router";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import { useProjects } from "@/state/projects";
import { evaluate, score } from "@/services/rules/library";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import type { ComplianceStatus } from "@/models";
import { AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/engineer/compliance")({
  component: () => <RequireActiveProject>{(id) => <Compliance id={id} />}</RequireActiveProject>,
});

function Compliance({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const findings = evaluate(p);
  const s = score(findings);
  const blockers = findings.filter((f) => f.status === "noncompliant" || f.status === "incomplete");
  const readyForIssue = blockers.length === 0 && s.score >= 85;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Compliance Score"
          value={`${s.score}%`}
          status={s.score >= 80 ? "compliant" : s.score >= 50 ? "warning" : "noncompliant"}
        />
        <MetricCard label="Compliant" value={s.breakdown.compliant} status="compliant" />
        <MetricCard label="Review" value={s.breakdown.warning} status="warning" />
        <MetricCard label="Non-compliant" value={s.breakdown.noncompliant} status="noncompliant" />
      </div>

      <section
        className={`app-card grid gap-3 p-4 md:grid-cols-[auto_1fr_auto] md:items-center ${
          readyForIssue ? "border-compliant/40" : "border-warning/40"
        }`}
      >
        <div
          className={`grid size-12 place-items-center rounded-sm ${
            readyForIssue ? "bg-compliant/10 text-compliant" : "bg-warning/10 text-warning"
          }`}
        >
          {readyForIssue ? (
            <CheckCircle2 className="size-6" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-6" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold">
            {readyForIssue
              ? "Design basis ready for controlled issue"
              : "Engineering review gates remain open"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {readyForIssue
              ? "The current project has no blocking incomplete or non-compliant findings in this screening engine."
              : `${blockers.length} blocking item${blockers.length === 1 ? "" : "s"} must be closed before the design should be issued for approval.`}
          </p>
        </div>
        <div className="rounded-sm border bg-background px-3 py-2 text-xs text-muted-foreground">
          Best practice: close non-compliant and incomplete items before relying on PDF reports.
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {findings.map((f) => (
          <article
            key={f.ruleId}
            className="app-card grid min-h-40 gap-3 p-4 sm:grid-cols-[auto_1fr]"
          >
            <StatusIcon status={f.status} />
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <StatusBadge status={f.status} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.message}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{f.explanation}</p>
              <div className="mt-3 rounded-sm bg-muted px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {f.codeRef}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ComplianceStatus }) {
  const Icon =
    status === "compliant"
      ? CheckCircle2
      : status === "warning"
        ? AlertTriangle
        : status === "incomplete"
          ? CircleDashed
          : ShieldAlert;
  const tone =
    status === "compliant"
      ? "bg-compliant/10 text-compliant"
      : status === "warning"
        ? "bg-warning/10 text-warning"
        : status === "incomplete"
          ? "bg-incomplete/10 text-incomplete"
          : "bg-noncompliant/10 text-noncompliant";
  return (
    <div className={`grid size-10 shrink-0 place-items-center rounded-sm ${tone}`}>
      <Icon className="size-5" aria-hidden="true" />
      <span className="sr-only">{status}</span>
    </div>
  );
}
