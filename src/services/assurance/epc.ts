import type {
  AssumptionConfidence,
  CalculationRevision,
  CalculationTraceSheet,
  CodeEdition,
  ComplianceStatus,
  ComponentLimit,
  EngineeringAssumption,
  Project,
  RouteSection,
  UnitSystem,
} from "@/models";
import type { CalcResult } from "@/services/calculations";
import { evaluate, score } from "@/services/rules/library";

export const CODE_EDITION_OPTIONS: CodeEdition[] = [
  { designCode: "ASME B31.8", edition: "2022", notes: "Gas transmission screening basis" },
  { designCode: "ASME B31.4", edition: "2022", notes: "Liquid pipeline screening basis" },
  { designCode: "ASME B31.12", edition: "2023", notes: "Hydrogen pipeline specialist basis" },
  { designCode: "DNV-ST-F101", edition: "2021", notes: "Submarine pipeline screening basis" },
  { designCode: "DNV-RP-F104", edition: "2021", notes: "CO2 pipeline recommended practice basis" },
  {
    designCode: "Project basis / mixed",
    edition: "Project defined",
    notes: "Use when multiple codes govern",
  },
];

export const CALCULATION_RULE_VERSION = "pdca-calc-rules-v0.3";

export function defaultRouteSections(project: Project): RouteSection[] {
  const length = project.length_km || 1;
  return [
    {
      id: "route-mainline",
      name: "Mainline",
      length_km: round(length * 0.75, 2),
      elevationChange_m: 0,
      classLocation: project.classLocation ?? 1,
      designPressure_MPa: project.designPressure_MPa,
      notes: "Primary continuous route section.",
    },
    {
      id: "route-crossings",
      name: "Crossings / constrained areas",
      length_km: round(length * 0.15, 2),
      elevationChange_m: 0,
      classLocation:
        project.classLocation && project.classLocation >= 2 ? project.classLocation : 2,
      designPressure_MPa: project.designPressure_MPa,
      notes: "Use for road, rail, river, HDD, or higher consequence sections.",
    },
    {
      id: "route-facilities",
      name: "Facility tie-ins",
      length_km: round(length * 0.1, 2),
      elevationChange_m: 0,
      classLocation: project.classLocation ?? 1,
      designPressure_MPa: project.designPressure_MPa,
      notes: "Launcher, receiver, station, manifold, or terminal tie-in areas.",
    },
  ];
}

export function defaultComponentLimits(project: Project): ComponentLimit[] {
  const designPressure = project.designPressure_MPa || 1;
  const maop = project.MAOP_MPa || designPressure;
  return [
    {
      id: "limit-pipe",
      tag: "LINEPIPE",
      type: "pipe",
      rating_MPa: round(Math.max(designPressure, maop), 2),
      notes: "Line pipe pressure basis from selected OD, wall, material, and class factor.",
    },
    {
      id: "limit-valves",
      tag: "MAINLINE-VALVES",
      type: "valve",
      rating_MPa: round(designPressure * 1.1, 2),
      notes: "Screen valve class against design pressure and hydrotest envelope.",
    },
    {
      id: "limit-flanges",
      tag: "FLANGES-FITTINGS",
      type: "flange",
      rating_MPa: round(designPressure * 1.1, 2),
      notes: "Confirm flange/fitting pressure-temperature class from project piping spec.",
    },
  ];
}

export function unitLabel(unitSystem: UnitSystem | undefined, metricUnit: string) {
  if (unitSystem !== "us_customary") return metricUnit;
  const map: Record<string, string> = {
    MPa: "psi",
    mm: "in",
    km: "mile",
    "MPa/km": "psi/mile",
    "m/s": "ft/s",
    "kg/m3": "lb/ft3",
  };
  return map[metricUnit] ?? metricUnit;
}

export function mpaToPsi(value: number) {
  return round(value * 145.0377, 2);
}

export function psiToMpa(value: number) {
  return round(value / 145.0377, 4);
}

export function mmToIn(value: number) {
  return round(value / 25.4, 4);
}

export function inToMm(value: number) {
  return round(value * 25.4, 3);
}

export function formatEngineeringValue(
  value: number | undefined,
  metricUnit: string,
  unitSystem: UnitSystem | undefined,
) {
  if (value === undefined || Number.isNaN(value)) return "-";
  if (unitSystem !== "us_customary") return `${round(value, 3)} ${metricUnit}`;
  if (metricUnit === "MPa") return `${round(value * 145.0377, 1)} psi`;
  if (metricUnit === "mm") return `${round(value / 25.4, 3)} in`;
  if (metricUnit === "km") return `${round(value * 0.621371, 3)} mile`;
  if (metricUnit === "MPa/km") return `${round(value * 233.354, 1)} psi/mile`;
  if (metricUnit === "m/s") return `${round(value * 3.28084, 2)} ft/s`;
  if (metricUnit === "kg/m3") return `${round(value * 0.062428, 2)} lb/ft3`;
  return `${round(value, 3)} ${metricUnit}`;
}

export function createTraceSheet(args: {
  project: Project;
  title: string;
  result: CalcResult;
  revision: string;
  classification?: CalculationTraceSheet["classification"];
  inputs: CalculationTraceSheet["inputs"];
  extraSteps?: CalculationTraceSheet["steps"];
}): CalculationTraceSheet {
  const edition = args.project.codeEdition;
  const codeBasis = edition
    ? `${edition.designCode} ${edition.edition}`
    : `${args.project.designCode || "Project design code"} - edition not set`;
  const status: ComplianceStatus =
    args.result.pass === false
      ? "noncompliant"
      : args.result.pass === true
        ? "compliant"
        : "warning";
  return {
    id: slug(`${args.title}-${args.revision}`),
    title: args.title,
    revision: args.revision,
    classification: args.classification ?? "screening",
    codeBasis,
    inputs: args.inputs,
    steps: [
      {
        label: "Formula",
        expression: args.result.formula,
        result: `${args.result.value} ${args.result.unit}`,
        note: args.result.codeRef,
      },
      ...(args.extraSteps ?? []),
    ],
    result: `${args.result.value} ${args.result.unit}`,
    status,
    timestamp: new Date().toISOString(),
    calculationVersion: CALCULATION_RULE_VERSION,
    limitations: [
      "Screening calculation only; verify against the governing code edition and project specification.",
      "Confirm units, corrosion basis, temperature derating, mill tolerance, weld factor, and component limits before issue.",
      ...args.result.assumptions,
    ],
  };
}

export function createCalculationRevision(args: {
  project: Project;
  sheets: CalculationTraceSheet[];
  createdBy?: string;
}): CalculationRevision {
  const existing = args.project.calculationRevisions ?? [];
  const revision = `C${String(existing.length + 1).padStart(2, "0")}`;
  const worst = worstStatus(args.sheets.map((sheet) => sheet.status));
  return {
    id: crypto.randomUUID(),
    revision,
    createdAt: new Date().toISOString(),
    createdBy: args.createdBy || args.project.engineer || "local-engineer",
    basisHash: basisHash(args.project),
    summary: `${args.sheets.length} calculation sheet(s), status ${worst.toUpperCase()}`,
    status: worst,
    sheets: args.sheets.map((sheet) => ({ ...sheet, revision })),
  };
}

export function validateBeforeIssue(project: Project) {
  const findings = evaluate(project);
  const readiness = score(findings);
  const routeSections = project.routeSections ?? [];
  const componentLimits = project.componentLimits ?? [];
  const revisions = project.calculationRevisions ?? [];
  const assumptions = project.assumptionsRegister ?? [];
  const pendingAssumptions = assumptions.filter(
    (item) =>
      item.status !== "closed" ||
      item.confidence === "assumed" ||
      item.confidence === "estimated" ||
      item.confidence === "placeholder",
  );
  const issues: Array<{
    title: string;
    status: ComplianceStatus;
    message: string;
    action: string;
  }> = [];

  if (!project.codeEdition) {
    issues.push({
      title: "Code edition not frozen",
      status: "incomplete",
      message: "A report should identify the exact code edition or project basis used.",
      action: "Set the code edition in Calculations before issuing reports.",
    });
  }
  if (routeSections.length === 0) {
    issues.push({
      title: "Route sections missing",
      status: "incomplete",
      message: "World-class EPC calculation packs split the route into design sections.",
      action: "Create route sections for mainline, crossings, facilities, or special locations.",
    });
  }
  if (componentLimits.length === 0) {
    issues.push({
      title: "Component limits missing",
      status: "incomplete",
      message:
        "The weakest rated valve, flange, fitting, launcher, or receiver can govern MAOP and hydrotest.",
      action: "Add component pressure-temperature limits before issuing reports.",
    });
  }
  const weakest = weakestComponent(project);
  if (
    weakest &&
    project.hydrotestPressure_MPa &&
    project.hydrotestPressure_MPa > weakest.rating_MPa
  ) {
    issues.push({
      title: "Hydrotest exceeds weakest component",
      status: "noncompliant",
      message: `${project.hydrotestPressure_MPa} MPa test pressure exceeds ${weakest.tag} rating of ${weakest.rating_MPa} MPa.`,
      action:
        "Revise test section, component rating, test pressure, or temporary test arrangement.",
    });
  }
  if (weakest && project.designPressure_MPa > weakest.rating_MPa) {
    issues.push({
      title: "Design pressure exceeds component rating",
      status: "noncompliant",
      message: `${project.designPressure_MPa} MPa design pressure exceeds ${weakest.tag} rating of ${weakest.rating_MPa} MPa.`,
      action: "Upgrade the limiting component or reduce the pressure basis with proper approval.",
    });
  }
  if (revisions.length === 0) {
    issues.push({
      title: "Calculation revision missing",
      status: "incomplete",
      message: "No traceable calculation sheet has been saved for this design basis.",
      action: "Save a calculation revision from the Calculations page.",
    });
  }
  if (assumptions.length === 0) {
    issues.push({
      title: "Assumptions register missing",
      status: "incomplete",
      message: "No engineering assumptions register has been created for this project.",
      action: "Build and review the assumptions register before report issue.",
    });
  }
  if (pendingAssumptions.length > 0) {
    issues.push({
      title: "Pending assumptions remain",
      status: pendingAssumptions.some((item) => item.confidence === "placeholder")
        ? "incomplete"
        : "warning",
      message: `${pendingAssumptions.length} assumption(s) are not confirmed and closed.`,
      action: "Close, confirm, or assign owner actions for assumptions before certified issue.",
    });
  }
  if (readiness.breakdown.noncompliant + readiness.breakdown.incomplete > 0) {
    issues.push({
      title: "Compliance blockers remain",
      status: "noncompliant",
      message: `${readiness.breakdown.noncompliant + readiness.breakdown.incomplete} compliance blocker(s) remain open.`,
      action: "Close missing/noncompliant compliance findings before approved issue.",
    });
  }

  const issueStatus = worstStatus(issues.map((issue) => issue.status));
  return {
    status: issues.length ? issueStatus : "compliant",
    score: readiness.score,
    issues,
    canIssueForApproval: issues.every(
      (issue) => issue.status !== "noncompliant" && issue.status !== "incomplete",
    ),
  };
}

export function defaultAssumptions(project: Project): EngineeringAssumption[] {
  const now = new Date().toISOString();
  return [
    {
      id: "assumption-pressure-basis",
      assumption: `Design pressure ${project.designPressure_MPa} MPa is the approved maximum design basis.`,
      source: "Design basis input",
      confidence: project.designPressure_MPa > 0 ? "assumed" : "placeholder",
      owner: project.engineer || "Responsible engineer",
      status: "open",
      createdAt: now,
    },
    {
      id: "assumption-corrosion-allowance",
      assumption: `Corrosion allowance ${project.corrosionAllowance_mm} mm is adequate for design life and corrosion control philosophy.`,
      source: "Corrosion basis / project input",
      confidence: project.corrosionAllowance_mm > 0 ? "estimated" : "placeholder",
      owner: "Corrosion / materials engineer",
      status: "open",
      createdAt: now,
    },
    {
      id: "assumption-hydraulic-density",
      assumption: "Hydraulic density and flow presets are representative of the operating case.",
      source: "Calculation screening input",
      confidence: "estimated",
      owner: "Process / hydraulics engineer",
      status: "open",
      createdAt: now,
    },
    {
      id: "assumption-code-edition",
      assumption: "The selected code edition is the governing project basis.",
      source: project.codeEdition
        ? `${project.codeEdition.designCode} ${project.codeEdition.edition}`
        : "Not frozen",
      confidence: project.codeEdition ? "assumed" : "placeholder",
      owner: project.reviewer || "Technical authority",
      status: "open",
      createdAt: now,
    },
  ];
}

export function dataConfidenceForProject(project: Project): AssumptionConfidence {
  const assumptions = project.assumptionsRegister ?? [];
  if (assumptions.some((item) => item.confidence === "placeholder")) return "placeholder";
  if (assumptions.some((item) => item.confidence === "estimated")) return "estimated";
  if (assumptions.some((item) => item.confidence === "assumed")) return "assumed";
  if (assumptions.length > 0) return "confirmed";
  return "placeholder";
}

export function dataConfidenceBreakdown(project: Project) {
  const assumptions = project.assumptionsRegister ?? [];
  return {
    confirmed: assumptions.filter((item) => item.confidence === "confirmed").length,
    assumed: assumptions.filter((item) => item.confidence === "assumed").length,
    estimated: assumptions.filter((item) => item.confidence === "estimated").length,
    placeholder: assumptions.filter((item) => item.confidence === "placeholder").length,
    open: assumptions.filter((item) => item.status !== "closed").length,
  };
}

export function weakestComponent(project: Project) {
  const limits = project.componentLimits ?? [];
  if (limits.length === 0) return null;
  return [...limits].sort((a, b) => a.rating_MPa - b.rating_MPa)[0];
}

export function basisHash(project: Project) {
  const basis = [
    project.designCode,
    project.codeEdition?.edition,
    project.designPressure_MPa,
    project.designTemperature_C,
    project.outsideDiameter_mm,
    project.wallThickness_mm,
    project.materialGrade,
    project.classLocation,
    project.corrosionAllowance_mm,
    project.MAOP_MPa,
    project.hydrotestPressure_MPa,
    project.routeSections?.length ?? 0,
    project.componentLimits?.length ?? 0,
  ].join("|");
  let hash = 0;
  for (let index = 0; index < basis.length; index += 1) {
    hash = (hash << 5) - hash + basis.charCodeAt(index);
    hash |= 0;
  }
  return `BASIS-${Math.abs(hash).toString(16).toUpperCase()}`;
}

function worstStatus(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes("noncompliant")) return "noncompliant";
  if (statuses.includes("incomplete")) return "incomplete";
  if (statuses.includes("warning")) return "warning";
  return "compliant";
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function round(n: number, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d;
}
