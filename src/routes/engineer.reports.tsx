import { createFileRoute, Link } from "@tanstack/react-router";
import { CalculationClassificationBadge } from "@/components/CalculationClassificationBadge";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import { LessonPopover } from "@/components/LessonPopover";
import { MetricCard } from "@/components/MetricCard";
import {
  complianceSummary,
  designBasisMemo,
  designPackageReport,
  hydrotestReport,
  wallThicknessReport,
  workflowSummary,
} from "@/services/reports/pdf";
import {
  dataConfidenceBreakdown,
  dataConfidenceForProject,
  validateBeforeIssue,
} from "@/services/assurance/epc";
import { evaluate, score } from "@/services/rules/library";
import { useProjects } from "@/state/projects";
import { AlertTriangle, FileCheck2, FileText } from "lucide-react";

export const Route = createFileRoute("/engineer/reports")({
  component: () => <RequireActiveProject>{(id) => <Reports id={id} />}</RequireActiveProject>,
});

function Reports({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const findings = evaluate(p);
  const readiness = score(findings);
  const issueGate = validateBeforeIssue(p);
  const confidence = dataConfidenceForProject(p);
  const confidenceBreakdown = dataConfidenceBreakdown(p);
  const blockers = readiness.breakdown.noncompliant + readiness.breakdown.incomplete;
  const reports = [
    {
      name: "Engineering Design Package",
      desc: "Basis, recommended design case, calculations, compliance findings, and issue readiness.",
      fn: () => designPackageReport(p),
      primary: true,
    },
    {
      name: "Design Basis Memo",
      desc: "Project and governing design basis.",
      fn: () => designBasisMemo(p),
    },
    {
      name: "Wall Thickness Report",
      desc: "Pressure wall calculation using project material/class basis.",
      fn: () => wallThicknessReport(p),
    },
    {
      name: "Hydrotest Report",
      desc: "Hydrotest pressure and ratio screening.",
      fn: () => hydrotestReport(p),
    },
    {
      name: "Compliance Summary",
      desc: "Rule-based code and assurance findings.",
      fn: () => complianceSummary(p, findings),
    },
    {
      name: "Workflow Summary",
      desc: "Saved workflow graph and engineering sequence.",
      fn: () => workflowSummary(p, p.workflow),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="app-card grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div
          className={`grid size-12 place-items-center rounded-sm ${blockers ? "bg-warning/10 text-warning" : "bg-compliant/10 text-compliant"}`}
        >
          {blockers ? (
            <AlertTriangle className="size-6" aria-hidden="true" />
          ) : (
            <FileCheck2 className="size-6" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Controlled Engineering Reports</h2>
            <LessonPopover
              title="Engineering reports"
              why="Reports freeze assumptions, calculations, findings, workflow evidence, and review status for project files."
              how="Generate the full design package for review. Resolve non-compliant and incomplete findings before issuing as approved."
              drivenBy="Design basis completeness, selected design case, calculations, compliance, workflow gates, reviewer, and audit traceability."
              codeRef="Project assurance / engineering document control"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Reports now use the active project basis and include issue-readiness warnings before
            export.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CalculationClassificationBadge classification="screening" />
            <DataConfidenceBadge confidence={confidence} />
          </div>
        </div>
        <Link
          to="/engineer/workflow"
          className="tap-target inline-flex items-center justify-center rounded-sm border px-3 py-2 text-xs hover:bg-muted"
        >
          Check Workflow
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Readiness"
          value={`${readiness.score}%`}
          status={
            readiness.score >= 80 ? "compliant" : readiness.score >= 50 ? "warning" : "noncompliant"
          }
        />
        <MetricCard
          label="Issue Gate"
          value={issueGate.status.toUpperCase()}
          status={issueGate.status}
        />
        <MetricCard
          label="Reviewer"
          value={p.reviewer ? "SET" : "TBD"}
          status={p.reviewer ? "compliant" : "incomplete"}
        />
        <MetricCard
          label="Workflow"
          value={p.workflow ? "SAVED" : "DRAFT"}
          status={p.workflow ? "compliant" : "warning"}
        />
        <MetricCard
          label="Assumptions"
          value={confidenceBreakdown.open}
          status={confidenceBreakdown.open ? "warning" : "compliant"}
        />
      </div>

      {blockers > 0 && (
        <div className="rounded-sm border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
          {blockers} blocker(s) remain. Reports can be generated for review, but should not be
          issued as approved until blockers are closed.
        </div>
      )}

      {issueGate.issues.length > 0 && (
        <div className="rounded-sm border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Report issue validation</div>
          <div className="mt-1">
            {issueGate.issues[0].title}: {issueGate.issues[0].action}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <button
            key={report.name}
            onClick={report.fn}
            className={`app-card p-4 text-left transition-colors hover:border-primary ${report.primary ? "border-primary/40 bg-primary/5" : ""}`}
          >
            <FileText className="size-5 text-primary" />
            <div className="mt-2 font-semibold text-sm">{report.name}</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.desc}</div>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Generate PDF - {p.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
