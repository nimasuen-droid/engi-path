import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import { LessonPopover } from "@/components/LessonPopover";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { ComplianceStatus, FluidType, InstallationType, Project } from "@/models";
import { useProjects } from "@/state/projects";
import { Activity, AlertTriangle, ClipboardCheck, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/engineer/integrity")({
  component: () => <RequireActiveProject>{(id) => <Integrity id={id} />}</RequireActiveProject>,
});

const GROWTH_PRESETS = [
  { label: "Low - 0.05 mm/yr", value: 0.05 },
  { label: "Moderate - 0.10 mm/yr", value: 0.1 },
  { label: "High - 0.25 mm/yr", value: 0.25 },
  { label: "Severe - 0.50 mm/yr", value: 0.5 },
];

const CONFIDENCE_PRESETS = [
  { label: "High confidence - recent ILI / verified", value: 0.85 },
  { label: "Medium confidence - screening basis", value: 0.65 },
  { label: "Low confidence - sparse data", value: 0.45 },
];

interface IntegrityAnomaly {
  id: string;
  kp: number;
  type: string;
  depth_mm: number;
  length_mm: number;
  growth_mmYr: number;
  confidence: number;
  mitigation: string;
}

interface IntegrityState {
  anomalies: IntegrityAnomaly[];
  savedAt?: string;
}

function Integrity({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const [state, setState] = useState<IntegrityState>(() => loadIntegrityState(p));
  const [draft, setDraft] = useState<IntegrityAnomaly>(() =>
    defaultAnomaly(p, state.anomalies.length + 1),
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next = loadIntegrityState(p);
    setState(next);
    setDraft(defaultAnomaly(p, next.anomalies.length + 1));
    setMessage("");
  }, [p]);

  const threats = useMemo(() => buildThreatRegister(p), [p]);
  const assessed = useMemo(
    () => state.anomalies.map((a) => assessAnomaly(p, a)),
    [p, state.anomalies],
  );
  const worstStatus = rollupStatus([
    ...threats.map((t) => t.status),
    ...assessed.map((a) => a.status),
  ]);
  const minRemainingLife = assessed.length
    ? Math.min(...assessed.map((a) => a.remainingLifeYears))
    : null;
  const nextInspection = assessed.length
    ? Math.max(1, Math.min(...assessed.map((a) => a.inspectionIntervalYears)))
    : recommendedBaselineInspection(p, threats);
  const highRiskThreats = threats.filter(
    (t) => t.status === "noncompliant" || t.status === "warning",
  );

  function saveState(next: IntegrityState) {
    const saved = { ...next, savedAt: new Date().toISOString() };
    setState(saved);
    localStorage.setItem(storageKey(p.id), JSON.stringify(saved));
    setMessage("Integrity plan saved locally for this project.");
  }

  function addAnomaly() {
    saveState({
      anomalies: [...state.anomalies, { ...draft, id: nextAnomalyId(state.anomalies) }],
    });
    setDraft(defaultAnomaly(p, state.anomalies.length + 2));
  }

  function removeAnomaly(anomalyId: string) {
    saveState({ anomalies: state.anomalies.filter((a) => a.id !== anomalyId) });
  }

  return (
    <div className="space-y-4">
      <section className="app-card grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div
          className={`grid size-12 place-items-center rounded-sm ${
            worstStatus === "compliant"
              ? "bg-compliant/10 text-compliant"
              : worstStatus === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-noncompliant/10 text-noncompliant"
          }`}
        >
          <Activity className="size-6" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Integrity Management Plan</h2>
            <LessonPopover
              title="Integrity management"
              why="Integrity management identifies threats, ranks risk, plans inspection, and escalates anomalies before failure risk becomes unacceptable."
              how="Use the threat register, anomaly assessment, confidence factor, and inspection interval to decide mitigation, repair, FFS escalation, or monitoring."
              drivenBy="Threat likelihood, consequence, wall thickness, anomaly depth/length, corrosion growth, inspection confidence, fluid hazard, and route exposure."
              codeRef="API 1160 / API 579 / ASME FFS-1"
            />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Project-linked threat register and anomaly screening. Results are saved locally and
            remain screening-level until validated by a qualified integrity/FFS engineer.
          </p>
        </div>
        <Link
          to="/engineer/review"
          className="tap-target inline-flex items-center justify-center rounded-sm border px-3 py-2 text-xs hover:bg-muted"
        >
          Review Findings
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Integrity Status"
          value={worstStatus.toUpperCase()}
          status={worstStatus}
        />
        <MetricCard
          label="Min. Remaining Life"
          value={minRemainingLife === null ? "N/A" : minRemainingLife.toFixed(1)}
          unit={minRemainingLife === null ? undefined : "yr"}
          status={worstStatus}
        />
        <MetricCard
          label="Next Inspection"
          value={nextInspection}
          unit="yr"
          status={nextInspection <= 2 ? "warning" : "compliant"}
        />
        <MetricCard
          label="Open Threats"
          value={highRiskThreats.length}
          status={highRiskThreats.length ? "warning" : "compliant"}
        />
      </div>

      {message && (
        <button
          type="button"
          onClick={() => setMessage("")}
          className="flex w-full items-start gap-2 rounded-sm border border-compliant/30 bg-compliant/10 p-3 text-left text-xs text-muted-foreground"
        >
          <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-compliant" aria-hidden="true" />
          {message}
        </button>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="app-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Threat Register</h3>
            <span className="rounded-sm border bg-muted px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              API 1160 style
            </span>
          </div>
          <div className="grid gap-2">
            {threats.map((threat) => (
              <article key={threat.id} className="rounded-sm border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">{threat.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{threat.basis}</p>
                  </div>
                  <StatusBadge status={threat.status} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <Metric label="Likelihood" value={threat.likelihood} />
                  <Metric label="Consequence" value={threat.consequence} />
                  <Metric label="Risk" value={threat.risk} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Mitigation:</span>{" "}
                  {threat.mitigation}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="app-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Anomaly Assessment</h3>
            <button
              type="button"
              onClick={() => saveState(state)}
              className="tap-target inline-flex items-center gap-1 rounded-sm border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <Save className="size-3.5" aria-hidden="true" /> Save Plan
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-sm border bg-background p-3 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Add / screen anomaly
              </div>
              <Input
                label="KP / chainage"
                value={draft.kp}
                on={(value) => setDraft({ ...draft, kp: value })}
                step={0.1}
              />
              <Select
                label="Threat type"
                value={draft.type}
                on={(value) => setDraft({ ...draft, type: value })}
              >
                {[
                  "External corrosion",
                  "Internal corrosion",
                  "Dent",
                  "Gouge",
                  "Crack-like indication",
                  "Free span / support",
                ].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <Input
                label="Depth (mm)"
                value={draft.depth_mm}
                on={(value) => setDraft({ ...draft, depth_mm: value })}
                step={0.1}
              />
              <Input
                label="Length (mm)"
                value={draft.length_mm}
                on={(value) => setDraft({ ...draft, length_mm: value })}
                step={1}
              />
              <Select
                label="Growth rate"
                value={String(draft.growth_mmYr)}
                on={(value) => setDraft({ ...draft, growth_mmYr: Number(value) })}
              >
                {GROWTH_PRESETS.map((growth) => (
                  <option key={growth.value} value={growth.value}>
                    {growth.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Inspection confidence"
                value={String(draft.confidence)}
                on={(value) => setDraft({ ...draft, confidence: Number(value) })}
              >
                {CONFIDENCE_PRESETS.map((confidence) => (
                  <option key={confidence.value} value={confidence.value}>
                    {confidence.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Mitigation status"
                value={draft.mitigation}
                on={(value) => setDraft({ ...draft, mitigation: value })}
              >
                {[
                  "Monitor",
                  "Re-inspect",
                  "Repair sleeve / clamp",
                  "Cut-out replacement",
                  "FFS Level 2/3 assessment",
                ].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={addAnomaly}
                className="tap-target inline-flex w-full items-center justify-center gap-1 rounded-sm bg-primary px-3 py-2 text-xs text-primary-foreground"
              >
                <Plus className="size-3.5" aria-hidden="true" /> Add Anomaly
              </button>
            </div>

            <div className="space-y-2">
              {assessed.length === 0 ? (
                <div className="rounded-sm border bg-background p-6 text-center text-xs text-muted-foreground">
                  No project anomalies saved yet. Add a known corrosion, dent, crack-like, or
                  support issue to generate remaining-life and inspection recommendations.
                </div>
              ) : (
                assessed.map((item) => (
                  <article key={item.id} className="rounded-sm border bg-background p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold">
                          {item.id} - KP {item.kp}
                        </h4>
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        <button
                          type="button"
                          onClick={() => removeAnomaly(item.id)}
                          className="tap-target rounded-sm border p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${item.id}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                      <Metric label="Depth" value={`${item.depthPct.toFixed(0)}%`} />
                      <Metric label="Life" value={`${item.remainingLifeYears.toFixed(1)} yr`} />
                      <Metric label="Inspect" value={`${item.inspectionIntervalYears} yr`} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {item.recommendation}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-sm border bg-muted/40 p-3 text-xs text-muted-foreground">
        <AlertTriangle className="mr-1 inline size-3.5 text-warning" aria-hidden="true" />
        Screening only. Final repair, re-rate, or continued-operation decisions require validated
        inspection data and applicable API 579 / ASME FFS-1 assessment level.
      </div>
    </div>
  );
}

function buildThreatRegister(p: Project) {
  const threats = [
    threat(
      "external-corrosion",
      "External corrosion / coating-CP",
      p.installationType === "buried" || p.installationType === "subsea" ? 4 : 2,
      p.fluidType === "liquid" || p.fluidType === "co2" ? 4 : 3,
      "Installation environment and coating/CP exposure.",
      "Confirm coating system, cathodic protection criteria, close interval survey, and excavation/ILI plan.",
    ),
    threat(
      "internal-corrosion",
      "Internal corrosion / fluid chemistry",
      p.sourService || ["multiphase", "water_injection", "co2"].includes(p.fluidType) ? 5 : 2,
      ["liquid", "co2", "multiphase"].includes(p.fluidType) ? 4 : 3,
      "Fluid corrosivity, water, CO2/H2S, oxygen/chlorides, and inhibitor reliability.",
      "Maintain corrosion-control basis, sampling, inhibition, pigging, and corrosion monitoring plan.",
    ),
    threat(
      "third-party",
      "Third-party damage / ROW activity",
      p.installationType === "buried" || p.region !== "Generic training corridor" ? 3 : 2,
      p.designPressure_MPa > 8 ? 5 : 3,
      "Route exposure, access, population, and operating pressure consequence.",
      "Confirm marker posts, patrols, depth of cover, crossing controls, and emergency response basis.",
    ),
    threat(
      "fracture",
      "Fracture / fatigue / special fluid behavior",
      p.fluidType === "hydrogen" || p.fluidType === "co2" ? 5 : p.designPressure_MPa > 10 ? 3 : 2,
      p.designPressure_MPa > 8 ? 5 : 3,
      "Hydrogen, CO2 decompression, high pressure, cyclic duty, and material toughness.",
      "Escalate to fracture control, toughness, fatigue, and decompression review where applicable.",
    ),
    threat(
      "geo-installation",
      "Geohazard / installation / external load",
      p.installationType === "offshore" || p.installationType === "subsea" ? 4 : 2,
      p.installationType === "offshore" || p.installationType === "subsea" ? 5 : 3,
      "Free spans, seabed interaction, ground movement, support loads, and installation strain.",
      "Check stability, span management, route survey, soil data, supports, and installation records.",
    ),
  ];
  return threats;
}

function threat(
  id: string,
  title: string,
  likelihood: number,
  consequence: number,
  basis: string,
  mitigation: string,
) {
  const risk = likelihood * consequence;
  const status: ComplianceStatus =
    risk >= 16 ? "noncompliant" : risk >= 9 ? "warning" : "compliant";
  return { id, title, likelihood, consequence, risk, basis, mitigation, status };
}

function assessAnomaly(p: Project, anomaly: IntegrityAnomaly) {
  const wall = p.wallThickness_mm ?? 0;
  const availableWall = Math.max(0, wall - p.corrosionAllowance_mm);
  const remainingWall = Math.max(0, availableWall - anomaly.depth_mm);
  const remainingLifeYears =
    wall > 0 && anomaly.growth_mmYr > 0
      ? Math.max(0, (availableWall - anomaly.depth_mm) / anomaly.growth_mmYr) * anomaly.confidence
      : 0;
  const depthPct = wall > 0 ? (anomaly.depth_mm / wall) * 100 : 100;
  const inspectionIntervalYears = Math.max(1, Math.floor(remainingLifeYears / 2));
  const status: ComplianceStatus =
    depthPct >= 80 || remainingLifeYears < 2
      ? "noncompliant"
      : depthPct >= 40 || remainingLifeYears < 6
        ? "warning"
        : "compliant";
  const recommendation =
    status === "noncompliant"
      ? "Escalate to FFS/repair decision now; consider pressure restriction, repair sleeve/clamp, or cut-out replacement."
      : status === "warning"
        ? "Schedule confirmatory inspection and FFS screening; do not wait for the full remaining-life interval if confidence is low."
        : "Monitor under the integrity plan and re-inspect at the recommended interval.";
  return {
    ...anomaly,
    remainingWall,
    remainingLifeYears,
    depthPct,
    inspectionIntervalYears,
    status,
    recommendation,
  };
}

function rollupStatus(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes("noncompliant")) return "noncompliant";
  if (statuses.includes("warning") || statuses.includes("incomplete")) return "warning";
  return "compliant";
}

function recommendedBaselineInspection(
  p: Project,
  threats: ReturnType<typeof buildThreatRegister>,
) {
  const maxRisk = Math.max(...threats.map((t) => t.risk), 1);
  if (maxRisk >= 16 || p.sourService) return 1;
  if (maxRisk >= 9 || p.fluidType === "co2" || p.fluidType === "hydrogen") return 2;
  return 5;
}

function loadIntegrityState(p: Project): IntegrityState {
  if (typeof window === "undefined") return { anomalies: [] };
  const raw = localStorage.getItem(storageKey(p.id));
  if (!raw) return { anomalies: seedAnomalies(p) };
  try {
    return JSON.parse(raw) as IntegrityState;
  } catch {
    return { anomalies: seedAnomalies(p) };
  }
}

function seedAnomalies(p: Project): IntegrityAnomaly[] {
  if (!p.wallThickness_mm) return [];
  const severeService =
    p.sourService || ["co2", "multiphase", "water_injection"].includes(p.fluidType);
  return [
    {
      id: "A-001",
      kp: Math.min(12.4, Math.max(0.1, p.length_km * 0.25)),
      type: severeService ? "Internal corrosion" : "External corrosion",
      depth_mm: severeService ? 3 : 1.5,
      length_mm: 120,
      growth_mmYr: severeService ? 0.25 : 0.1,
      confidence: 0.65,
      mitigation: severeService ? "FFS Level 2/3 assessment" : "Re-inspect",
    },
  ];
}

function defaultAnomaly(p: Project, index: number): IntegrityAnomaly {
  return {
    id: `A-${String(index).padStart(3, "0")}`,
    kp: Math.min(Math.max(0.1, p.length_km * 0.5), p.length_km || 1),
    type: defaultThreatType(p.fluidType, p.installationType),
    depth_mm: 1.5,
    length_mm: 100,
    growth_mmYr: 0.1,
    confidence: 0.65,
    mitigation: "Monitor",
  };
}

function defaultThreatType(fluid: FluidType, installation: InstallationType) {
  if (fluid === "multiphase" || fluid === "co2" || fluid === "water_injection")
    return "Internal corrosion";
  if (installation === "subsea" || installation === "offshore") return "Free span / support";
  return "External corrosion";
}

function nextAnomalyId(anomalies: IntegrityAnomaly[]) {
  return `A-${String(anomalies.length + 1).padStart(3, "0")}`;
}

function storageKey(projectId: string) {
  return `pdca-integrity-${projectId}`;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm bg-muted p-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function Input({
  label,
  value,
  on,
  step = 1,
}: {
  label: string;
  value: number;
  on: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => on(Number(event.target.value))}
        className="mt-0.5 w-full rounded-sm border bg-background px-2 py-2 font-mono"
      />
    </label>
  );
}

function Select({
  label,
  value,
  on,
  children,
}: {
  label: string;
  value: string;
  on: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => on(event.target.value)}
        className="mt-0.5 w-full rounded-sm border bg-background px-2 py-2 font-mono"
      >
        {children}
      </select>
    </label>
  );
}
