import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { MATERIAL_OPTIONS, classLocation } from "@/data/standards";
import type { ComplianceStatus, Project } from "@/models";
import { evaluate, score } from "@/services/rules/library";
import { hydrotest, maop, recommendMaterials, wallThickness } from "@/services/calculations";
import { useProjects } from "@/state/projects";
import { AlertTriangle, CheckCircle2, FileSearch, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/engineer/review")({
  component: () => <RequireActiveProject>{(id) => <Review id={id} />}</RequireActiveProject>,
});

interface ReviewFinding {
  id: string;
  title: string;
  status: ComplianceStatus;
  location: string;
  detail: string;
  recommendation: string;
}

function Review({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const findings = buildReviewFindings(p);
  const compliance = score(evaluate(p));
  const blockers = findings.filter((f) => f.status === "noncompliant" || f.status === "incomplete");
  const warnings = findings.filter((f) => f.status === "warning");
  const reviewStatus: ComplianceStatus =
    blockers.length > 0 ? "noncompliant" : warnings.length > 0 ? "warning" : "compliant";

  return (
    <div className="space-y-4">
      <section className="app-card grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div
          className={`grid size-12 place-items-center rounded-sm ${
            reviewStatus === "compliant"
              ? "bg-compliant/10 text-compliant"
              : reviewStatus === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-noncompliant/10 text-noncompliant"
          }`}
        >
          {reviewStatus === "compliant" ? (
            <CheckCircle2 className="size-6" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-6" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Technical Assurance Review</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Rule-based assurance review of the active project, design basis, calculations, material
            selection, hydrotest basis, and assurance gates. Document parsing remains a later
            capability, but this screen now reviews real project data.
          </p>
        </div>
        <Link
          to="/engineer/compliance"
          className="tap-target inline-flex items-center justify-center rounded-sm border px-3 py-2 text-xs hover:bg-muted"
        >
          Open Compliance
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Review Status"
          value={reviewStatus.toUpperCase()}
          status={reviewStatus}
        />
        <MetricCard
          label="Blockers"
          value={blockers.length}
          status={blockers.length ? "noncompliant" : "compliant"}
        />
        <MetricCard
          label="Warnings"
          value={warnings.length}
          status={warnings.length ? "warning" : "compliant"}
        />
        <MetricCard
          label="Compliance Score"
          value={`${compliance.score}%`}
          status={
            compliance.score >= 80
              ? "compliant"
              : compliance.score >= 50
                ? "warning"
                : "noncompliant"
          }
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {findings.map((finding) => (
          <article key={finding.id} className="app-card grid gap-3 p-4 sm:grid-cols-[auto_1fr]">
            <div
              className={`grid size-10 place-items-center rounded-sm ${
                finding.status === "compliant"
                  ? "bg-compliant/10 text-compliant"
                  : finding.status === "warning"
                    ? "bg-warning/10 text-warning"
                    : finding.status === "incomplete"
                      ? "bg-incomplete/10 text-incomplete"
                      : "bg-noncompliant/10 text-noncompliant"
              }`}
            >
              {finding.status === "compliant" ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{finding.title}</h3>
                <StatusBadge status={finding.status} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{finding.detail}</p>
              <p className="mt-2 text-xs leading-relaxed">
                <span className="font-medium">Recommended action:</span>{" "}
                <span className="text-muted-foreground">{finding.recommendation}</span>
              </p>
              <div className="mt-3 rounded-sm bg-muted px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {finding.location}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function buildReviewFindings(p: Project): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const complianceFindings = evaluate(p);
  const classInfo = classLocation(p.classLocation);
  const material = MATERIAL_OPTIONS.find((m) => m.grade === p.materialGrade) ?? MATERIAL_OPTIONS[1];

  for (const item of complianceFindings.filter((f) => f.status !== "compliant")) {
    findings.push({
      id: `compliance-${item.ruleId}`,
      title: item.title,
      status: item.status,
      location: item.codeRef,
      detail: item.message,
      recommendation: item.explanation,
    });
  }

  if (p.outsideDiameter_mm && p.wallThickness_mm && p.designPressure_MPa > 0) {
    const wall = wallThickness({
      designPressure_MPa: p.designPressure_MPa,
      outsideDiameter_mm: p.outsideDiameter_mm,
      SMYS_MPa: material.smys_MPa,
      designFactor: classInfo.designFactor,
      corrosionAllowance_mm: p.corrosionAllowance_mm,
      selectedWall_mm: p.wallThickness_mm,
    });
    findings.push({
      id: "calc-wall",
      title: "Pressure wall calculation reviewed",
      status: wall.pass === false ? "noncompliant" : "compliant",
      location: wall.codeRef,
      detail: `Required wall is ${wall.value} ${wall.unit}; selected wall is ${p.wallThickness_mm} mm.`,
      recommendation:
        wall.pass === false
          ? "Use the optimizer to select a heavier wall schedule or stronger qualified material, then re-check MAOP and hydrotest."
          : "Keep this as a screening result and confirm mill tolerance, D/t, fracture, loads, and project specification.",
    });

    const derivedMaop = maop({
      wallThickness_mm: p.wallThickness_mm,
      outsideDiameter_mm: p.outsideDiameter_mm,
      SMYS_MPa: material.smys_MPa,
      designFactor: classInfo.designFactor,
      corrosionAllowance_mm: p.corrosionAllowance_mm,
      limit_MPa: p.designPressure_MPa,
    });
    findings.push({
      id: "calc-maop",
      title: "MAOP consistency reviewed",
      status: derivedMaop.pass === false ? "noncompliant" : "compliant",
      location: derivedMaop.codeRef,
      detail: `Derived MAOP is ${derivedMaop.value} MPa against design pressure ${p.designPressure_MPa} MPa.`,
      recommendation:
        derivedMaop.pass === false
          ? "Increase wall, change material, or reduce the approved design pressure only through a controlled design-basis revision."
          : "Use derived MAOP to validate declared MAOP, hydrotest basis, and report values.",
    });
  } else {
    findings.push({
      id: "calc-missing",
      title: "Calculation basis incomplete",
      status: "incomplete",
      location: "Calculations",
      detail:
        "OD, wall thickness, and design pressure are required before mechanical review can close.",
      recommendation:
        "Complete the design basis and run wall, MAOP, hoop stress, and hydrotest checks.",
    });
  }

  if (p.MAOP_MPa && p.hydrotestPressure_MPa) {
    const ratio = p.hydrotestPressure_MPa / p.MAOP_MPa;
    const test = hydrotest({ MAOP_MPa: p.MAOP_MPa });
    findings.push({
      id: "calc-hydrotest",
      title: "Hydrotest basis reviewed",
      status: ratio >= 1.25 ? "compliant" : "noncompliant",
      location: test.codeRef,
      detail: `Hydrotest ratio is ${ratio.toFixed(2)}; screening recommendation is ${test.value} MPa.`,
      recommendation:
        ratio >= 1.25
          ? "Confirm elevation head, weakest component, instrument calibration, and test acceptance procedure."
          : "Raise hydrotest pressure to the minimum screening basis or revise MAOP through formal approval.",
    });
  }

  const materialRecommendations = p.outsideDiameter_mm
    ? recommendMaterials({
        designPressure_MPa: p.designPressure_MPa,
        outsideDiameter_mm: p.outsideDiameter_mm,
        designFactor: classInfo.designFactor,
        corrosionAllowance_mm: p.corrosionAllowance_mm,
        selectedWall_mm: p.wallThickness_mm,
        sourService: p.sourService,
        subseaOrOffshore: p.installationType === "offshore" || p.installationType === "subsea",
      })
    : [];
  const selectedMaterial = materialRecommendations.find((m) => m.grade === p.materialGrade);
  if (selectedMaterial && selectedMaterial.status !== "recommended") {
    findings.push({
      id: "material-selection",
      title: "Material selection needs review",
      status: selectedMaterial.status === "not-suitable" ? "noncompliant" : "warning",
      location: "API 5L / material specification",
      detail: `${p.materialGrade} is classified as ${selectedMaterial.status}; required wall screen is ${selectedMaterial.requiredWall_mm} mm.`,
      recommendation: selectedMaterial.actions.join(" "),
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "review-clear",
      title: "No rule-based review blockers found",
      status: "compliant",
      location: "Project review",
      detail:
        "The current active project has no non-compliant or incomplete rule-based review findings.",
      recommendation:
        "Proceed to independent engineering review, report generation, and project authority approval.",
    });
  }

  return findings;
}
