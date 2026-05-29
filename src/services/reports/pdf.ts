import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  CalculationClassification,
  ComplianceFinding,
  Project,
  WorkflowGraph,
} from "@/models";
import { classLocation } from "@/data/standards";
import {
  dataConfidenceForProject,
  validateBeforeIssue,
  weakestComponent,
} from "@/services/assurance/epc";
import { generatePipelineDesignOptions } from "@/services/design/assistant";
import { hydrotest, internalDiameter, maop, wallThickness } from "@/services/calculations";
import { evaluate, score } from "@/services/rules/library";

function header(doc: jsPDF, title: string, p: Project) {
  doc.setFillColor(14, 59, 102);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.text("PIPELINE DESIGN & COMPLIANCE ASSISTANT", 10, 10);
  doc.setFontSize(10);
  doc.text(title, 10, 17);
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.text(
    `Project: ${p.name} | Client: ${p.client} | Engineer: ${p.engineer || "TBD"} | ${new Date().toLocaleString()}`,
    10,
    28,
  );
  doc.setDrawColor(200);
  doc.line(10, 31, 200, 31);
}

function disclaimer(doc: jsPDF, p: Project, startY = 35) {
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(10, startY, 190, 19, 1, 1, "FD");
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  doc.text("SCREENING / DESIGN ASSISTANCE ONLY", 13, startY + 6);
  doc.text(
    "Not a certified engineering deliverable. Requires qualified engineering review and governing code verification.",
    13,
    startY + 11,
  );
  doc.text(`Data confidence: ${confidenceText(dataConfidenceForProject(p))}`, 13, startY + 16);
  doc.setTextColor(0);
  return startY + 25;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      "Screening / Design Assistance Only - Not a certified engineering deliverable.",
      10,
      290,
    );
    doc.text(`Page ${i} / ${pages}`, 195, 290, { align: "right" });
  }
}

function finalY(doc: jsPDF) {
  return (
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 35) + 7
  );
}

function metaTable(doc: jsPDF, p: Project, startY: number) {
  autoTable(doc, {
    startY,
    head: [["Parameter", "Value"]],
    body: [
      ["Fluid", p.fluidType],
      ["Installation", p.installationType],
      ["Design Code", p.designCode],
      ["Region", p.region],
      ["Material", p.materialGrade],
      ["OD (mm)", String(p.outsideDiameter_mm ?? "-")],
      ["Wall (mm)", String(p.wallThickness_mm ?? "-")],
      ["Design Pressure (MPa)", String(p.designPressure_MPa)],
      ["MAOP (MPa)", String(p.MAOP_MPa ?? "-")],
      ["Hydrotest (MPa)", String(p.hydrotestPressure_MPa ?? "-")],
      ["Corrosion Allowance (mm)", String(p.corrosionAllowance_mm)],
      ["Design Life (yr)", String(p.designLife_years)],
      ["Reviewer", p.reviewer ?? "TBD"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [42, 50, 58] },
  });
}

export function designBasisMemo(p: Project) {
  const doc = new jsPDF();
  header(doc, "Design Basis Memo", p);
  metaTable(doc, p, disclaimer(doc, p));
  assumptionsTable(doc, p, finalY(doc));
  footer(doc);
  doc.save(`DesignBasis_${safeName(p.name)}.pdf`);
}

export function wallThicknessReport(p: Project) {
  const doc = new jsPDF();
  const { smys, F } = projectStrengthBasis(p);
  header(doc, "Wall Thickness Report", p);
  metaTable(doc, p, disclaimer(doc, p));
  if (p.outsideDiameter_mm) {
    const res = wallThickness({
      designPressure_MPa: p.designPressure_MPa,
      outsideDiameter_mm: p.outsideDiameter_mm,
      SMYS_MPa: smys,
      designFactor: F,
      corrosionAllowance_mm: p.corrosionAllowance_mm,
      selectedWall_mm: p.wallThickness_mm,
    });
    autoTable(doc, {
      startY: finalY(doc),
      head: [["Item", "Value"]],
      body: [
        ["Classification", classificationText("design_basis")],
        ["Formula", res.formula],
        ["SMYS (MPa)", String(smys)],
        ["Design Factor F", String(F)],
        ["Required t (mm)", String(res.value)],
        ["Selected t (mm)", String(p.wallThickness_mm ?? "-")],
        ["Result", res.pass === false ? "FAIL" : "PASS / REVIEW"],
        ["Code Reference", res.codeRef],
        ["Timestamp", new Date().toISOString()],
        ["Rule / calculation version", "pdca-calc-rules-v0.3"],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [14, 59, 102] },
    });
  }
  assumptionsTable(doc, p, finalY(doc));
  footer(doc);
  doc.save(`WallThickness_${safeName(p.name)}.pdf`);
}

export function hydrotestReport(p: Project) {
  const doc = new jsPDF();
  header(doc, "Hydrotest Report", p);
  metaTable(doc, p, disclaimer(doc, p));
  if (p.MAOP_MPa) {
    const r = hydrotest({ MAOP_MPa: p.MAOP_MPa });
    autoTable(doc, {
      startY: finalY(doc),
      head: [["Item", "Value"]],
      body: [
        ["Classification", classificationText("design_basis")],
        ["MAOP (MPa)", String(p.MAOP_MPa)],
        ["Recommended P_test (MPa)", String(r.value)],
        ["Recorded P_test (MPa)", String(p.hydrotestPressure_MPa ?? "-")],
        [
          "Result",
          p.hydrotestPressure_MPa && p.hydrotestPressure_MPa >= 1.25 * p.MAOP_MPa
            ? "PASS"
            : "REVIEW",
        ],
        ["Timestamp", new Date().toISOString()],
        ["Rule / calculation version", "pdca-calc-rules-v0.3"],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [14, 59, 102] },
    });
  }
  assumptionsTable(doc, p, finalY(doc));
  footer(doc);
  doc.save(`Hydrotest_${safeName(p.name)}.pdf`);
}

export function complianceSummary(p: Project, findings: ComplianceFinding[]) {
  const doc = new jsPDF();
  header(doc, "Compliance Summary", p);
  const startY = disclaimer(doc, p);
  autoTable(doc, {
    startY,
    head: [["Rule", "Status", "Code Ref", "Message"]],
    body: findings.map((f) => [f.title, f.status.toUpperCase(), f.codeRef, f.message]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [14, 59, 102] },
  });
  assumptionsTable(doc, p, finalY(doc));
  footer(doc);
  doc.save(`Compliance_${safeName(p.name)}.pdf`);
}

export function workflowSummary(p: Project, wf?: WorkflowGraph) {
  const doc = new jsPDF();
  header(doc, "Workflow Summary", p);
  const startY = disclaimer(doc, p);
  autoTable(doc, {
    startY,
    head: [["#", "Node", "Kind", "Notes"]],
    body: (wf?.nodes ?? []).map((n, i) => [
      String(i + 1),
      n.data.label,
      n.data.kind,
      n.data.notes ?? "",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 59, 102] },
  });
  footer(doc);
  doc.save(`Workflow_${safeName(p.name)}.pdf`);
}

export function designPackageReport(p: Project) {
  const doc = new jsPDF();
  const findings = evaluate(p);
  const readiness = score(findings);
  const issueGate = validateBeforeIssue(p);
  const { smys, F } = projectStrengthBasis(p);
  const designOptions = generatePipelineDesignOptions({
    project: p,
    designFactor: F,
    flow_m3s: defaultFlowForProject(p),
    targetVelocity_ms: serviceTargetVelocity(p),
    density_kgm3: fluidDensity(p),
    frictionFactor: 0.018,
    operatingPressure_MPa: Math.max(0.1, p.designPressure_MPa * 0.8),
    surgeAllowance_MPa: Math.max(0.1, p.designPressure_MPa * 0.15),
  });
  const selected = designOptions[0];

  header(doc, "Engineering Design Package", p);
  const startY = disclaimer(doc, p);
  autoTable(doc, {
    startY,
    head: [["Package Item", "Status / Value"]],
    body: [
      ["Issue readiness", `${readiness.score}%`],
      ["Report classification", classificationText("screening")],
      ["Issue gate", issueGate.status.toUpperCase()],
      ["Open non-compliances", String(readiness.breakdown.noncompliant)],
      ["Open incomplete items", String(readiness.breakdown.incomplete)],
      [
        "Recommended design case",
        selected
          ? `NPS ${selected.nps}, ${selected.schedule}, ${selected.materialGrade}`
          : "No case generated",
      ],
      ["Reviewer", p.reviewer ?? "TBD"],
      [
        "Code edition",
        p.codeEdition ? `${p.codeEdition.designCode} ${p.codeEdition.edition}` : "Not frozen",
      ],
      ["Calculation revisions", String(p.calculationRevisions?.length ?? 0)],
      ["Pending assumptions", String(pendingAssumptions(p).length)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 59, 102] },
  });

  metaTable(doc, p, finalY(doc));
  assumptionsTable(doc, p, finalY(doc));

  if (selected) {
    autoTable(doc, {
      startY: finalY(doc),
      head: [["Selected Design Case", "Value"]],
      body: [
        ["NPS / OD", `NPS ${selected.nps} / ${selected.od_mm} mm`],
        ["Wall / Schedule", `${selected.wall_mm} mm / ${selected.schedule}`],
        ["Material", `${selected.materialGrade} (${selected.smys_MPa} MPa SMYS)`],
        ["Required wall", `${selected.requiredWall_mm} mm`],
        ["MAOP", `${selected.maop_MPa} MPa`],
        ["Hydrotest", `${selected.hydrotest_MPa} MPa`],
        ["Velocity", `${selected.velocity_ms} m/s`],
        ["Pressure drop", `${selected.pressureDrop_MPaKm} MPa/km`],
        ["Design case status", selected.status.toUpperCase()],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [14, 59, 102] },
    });
  }

  autoTable(doc, {
    startY: finalY(doc),
    head: [["Issue Validation", "Status / Action"]],
    body:
      issueGate.issues.length > 0
        ? issueGate.issues
            .slice(0, 10)
            .map((issue) => [issue.title, `${issue.status.toUpperCase()} - ${issue.action}`])
        : [["Issue gate", "No screening blockers detected"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 50, 58] },
  });

  traceabilityTable(doc, p, finalY(doc));

  const weakest = weakestComponent(p);
  autoTable(doc, {
    startY: finalY(doc),
    head: [["Design Control", "Value"]],
    body: [
      ["Route sections", String(p.routeSections?.length ?? 0)],
      ["Component limits", String(p.componentLimits?.length ?? 0)],
      ["Weakest component", weakest ? `${weakest.tag} ${weakest.rating_MPa} MPa` : "Not set"],
      ["Last calculation revision", p.calculationRevisions?.[0]?.revision ?? "Not saved"],
      ["Basis hash", p.calculationRevisions?.[0]?.basisHash ?? "Not generated"],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 50, 58] },
  });

  autoTable(doc, {
    startY: finalY(doc),
    head: [["Finding", "Status", "Action"]],
    body: findings.slice(0, 18).map((f) => [f.title, f.status.toUpperCase(), f.message]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 50, 58] },
  });

  footer(doc);
  doc.save(`DesignPackage_${safeName(p.name)}.pdf`);
}

function assumptionsTable(doc: jsPDF, p: Project, startY: number) {
  const assumptions = pendingAssumptions(p);
  const body =
    assumptions.length > 0
      ? assumptions
          .slice(0, 8)
          .map((item) => [
            item.assumption,
            item.source,
            confidenceText(item.confidence),
            item.owner,
            item.status,
          ])
      : [["No pending assumptions recorded", "-", "Confirmed", "-", "-"]];
  autoTable(doc, {
    startY,
    head: [["Pending Assumption", "Source", "Confidence", "Owner", "Status"]],
    body,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [245, 158, 11] },
  });
}

function traceabilityTable(doc: jsPDF, p: Project, startY: number) {
  const sheets = p.calculationRevisions?.[0]?.sheets ?? [];
  const body =
    sheets.length > 0
      ? sheets
          .slice(0, 10)
          .map((sheet) => [
            sheet.title,
            classificationText(sheet.classification),
            sheet.steps[0]?.expression ?? "-",
            sheet.result,
            sheet.codeBasis,
            sheet.timestamp,
            sheet.calculationVersion,
          ])
      : [["No saved calculation trace", "-", "-", "-", "-", "-", "-"]];
  autoTable(doc, {
    startY,
    head: [["Calculation", "Class", "Formula", "Output", "Reference", "Timestamp", "Version"]],
    body,
    styles: { fontSize: 6.5 },
    headStyles: { fillColor: [14, 59, 102] },
  });
}

function pendingAssumptions(p: Project) {
  return (p.assumptionsRegister ?? []).filter(
    (item) => item.status !== "closed" || item.confidence !== "confirmed",
  );
}

function confidenceText(confidence: string) {
  return confidence.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function classificationText(classification: CalculationClassification) {
  if (classification === "design_basis") return "Design Basis";
  if (classification === "detailed_not_implemented") return "Detailed / Not Implemented";
  return "Screening";
}

function projectStrengthBasis(p: Project) {
  return {
    smys: materialSmys(p.materialGrade),
    F: classLocation(p.classLocation).designFactor,
  };
}

function materialSmys(grade: string) {
  if (grade.includes("X70")) return 483;
  if (grade.includes("X65")) return 448;
  if (grade.includes("X60")) return 414;
  if (grade.includes("X52")) return 359;
  if (grade.includes("450")) return 450;
  return 414;
}

function fluidDensity(p: Project) {
  if (p.fluidType === "gas" || p.fluidType === "hydrogen") return 80;
  if (p.fluidType === "co2") return 750;
  if (p.fluidType === "water_injection") return 1000;
  return 850;
}

function serviceTargetVelocity(p: Project) {
  if (p.fluidType === "gas" || p.fluidType === "hydrogen") return 12;
  if (p.fluidType === "co2") return 2.5;
  if (p.fluidType === "multiphase") return 4;
  if (p.fluidType === "water_injection") return 3;
  return 2.5;
}

function defaultFlowForProject(p: Project) {
  const hydraulicId = internalDiameter({
    outsideDiameter_mm: p.outsideDiameter_mm ?? 323.9,
    wallThickness_mm: p.wallThickness_mm,
  });
  const area = (Math.PI * (hydraulicId / 1000) ** 2) / 4;
  return Math.round(area * serviceTargetVelocity(p) * 1000) / 1000;
}

function safeName(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "_");
}
