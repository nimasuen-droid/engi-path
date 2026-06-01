import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CalcResultCard } from "@/components/CalcResultCard";
import { CalculationClassificationBadge } from "@/components/CalculationClassificationBadge";
import { DataConfidenceBadge } from "@/components/DataConfidenceBadge";
import { LessonPopover } from "@/components/LessonPopover";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import {
  CLASS_LOCATION_OPTIONS,
  MATERIAL_OPTIONS,
  PIPE_SIZE_OPTIONS,
  classLocation,
  pipeSizeByOd,
} from "@/data/standards";
import {
  designFactorByClass,
  erosionVelocityApi14E,
  hoopStress,
  hydrotest,
  internalDiameter,
  maop,
  pipeSizing,
  pressureDrop,
  recommendMaterials,
  surgeDesignCheck,
  vaporPressureMargin,
  velocity,
  wallThickness,
  type CalcResult,
} from "@/services/calculations";
import {
  CODE_EDITION_OPTIONS,
  createCalculationRevision,
  createTraceSheet,
  dataConfidenceBreakdown,
  dataConfidenceForProject,
  defaultAssumptions,
  defaultComponentLimits,
  defaultRouteSections,
  formatEngineeringValue,
  inToMm,
  mmToIn,
  mpaToPsi,
  psiToMpa,
  validateBeforeIssue,
  weakestComponent,
} from "@/services/assurance/epc";
import { generatePipelineDesignOptions } from "@/services/design/assistant";
import { useProjects } from "@/state/projects";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Gauge,
  History,
  Lightbulb,
  ListChecks,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import type {
  AssumptionConfidence,
  ComponentLimit,
  EngineeringAssumption,
  RouteSection,
} from "@/models";

export const Route = createFileRoute("/engineer/calculations")({
  component: () => <RequireActiveProject>{(id) => <Calcs id={id} />}</RequireActiveProject>,
});

const TABS = [
  "Wall Thickness",
  "MAOP",
  "Hydrotest",
  "Sizing",
  "Pressure Drop",
  "Velocity",
  "Hoop Stress",
  "Erosion Velocity",
  "Vapor Pressure",
  "Surge Margin",
  "Design Factor",
  "Material Recommendation",
] as const;

const DENSITY_PRESETS = [
  { label: "Gas screening - 80 kg/m3", rho: 80 },
  { label: "Crude oil - 850 kg/m3", rho: 850 },
  { label: "Water - 1000 kg/m3", rho: 1000 },
  { label: "Dense phase CO2 - 750 kg/m3", rho: 750 },
];
const FRICTION_PRESETS = [
  { label: "Smooth turbulent - 0.012", f: 0.012 },
  { label: "Typical screening - 0.018", f: 0.018 },
  { label: "Rough / conservative - 0.025", f: 0.025 },
];
const VAPOR_PRESETS = [
  { label: "Water near ambient - 0.003 MPa", vp: 0.003 },
  { label: "Stabilized crude screening - 0.06 MPa", vp: 0.06 },
  { label: "Gasoline / light product - 0.08 MPa", vp: 0.08 },
  { label: "LPG / high vapor pressure liquid - 0.7 MPa", vp: 0.7 },
];
const EROSION_C_PRESETS = [
  { label: "Continuous service - C 100", c: 100 },
  { label: "Intermittent / cleaner service - C 125", c: 125 },
  { label: "Conservative erosive service - C 75", c: 75 },
];

type Optimization = {
  id: string;
  title: string;
  priority: "critical" | "recommended" | "study";
  current: string;
  recommended: string;
  reason: string;
  effect: string;
  apply?: () => void;
};

const LEARNING: Record<(typeof TABS)[number], { why: string; how: string; drivenBy: string }> = {
  "Wall Thickness": {
    why: "Confirms the pipe has enough metal to resist design pressure after corrosion allowance.",
    how: "The app uses a Barlow pressure-design form, then tells you whether the selected wall is adequate.",
    drivenBy:
      "Design pressure, OD, SMYS, design factor, weld factor, temperature factor, and corrosion allowance.",
  },
  MAOP: {
    why: "Checks whether the selected pipe can safely carry the intended pressure.",
    how: "The app removes corrosion allowance from wall thickness and calculates the allowable pressure.",
    drivenBy: "Wall thickness, OD, SMYS, design factor, and corrosion allowance.",
  },
  Hydrotest: {
    why: "Provides the pressure used to prove integrity before service.",
    how: "The app multiplies MAOP by the selected proof factor and highlights test planning checks.",
    drivenBy: "MAOP, code multiplier, elevation profile, and stress limits.",
  },
  Sizing: {
    why: "Balances pipe capital cost against velocity, hydraulic loss, and operability.",
    how: "The app calculates the minimum ID for a target velocity and asks you to round up to a standard size.",
    drivenBy: "Flow rate, target velocity, and actual internal diameter.",
  },
  "Pressure Drop": {
    why: "Shows whether the line can deliver pressure at the required flow.",
    how: "The app uses Darcy-Weisbach screening for pressure loss per kilometer.",
    drivenBy: "Velocity squared, density, friction factor, length, and diameter.",
  },
  Velocity: {
    why: "Flags erosion, noise, surge, and operability risk from moving fluid too quickly.",
    how: "The app divides flow by pipe area and compares to a screening limit.",
    drivenBy: "Flow rate and pipe diameter.",
  },
  "Hoop Stress": {
    why: "Shows how much circumferential stress pressure puts into the pipe wall.",
    how: "The app calculates pressure times diameter divided by two times wall.",
    drivenBy: "Pressure, OD, wall thickness, and allowable stress.",
  },
  "Erosion Velocity": {
    why: "Screens whether fluid velocity is high enough to create erosion or erosion-corrosion risk.",
    how: "The app applies the API RP 14E empirical erosional velocity equation and compares actual velocity against the allowable limit.",
    drivenBy:
      "Actual velocity, mixture density, C factor, solids/liquid loading, corrosion service, and fittings.",
  },
  "Vapor Pressure": {
    why: "Prevents flashing, cavitation, and unintended two-phase operation in liquid lines.",
    how: "The app compares operating pressure with fluid vapor pressure and checks the pressure margin.",
    drivenBy:
      "Minimum operating pressure, fluid vapor pressure, temperature, and high-point profile.",
  },
  "Surge Margin": {
    why: "Catches transient pressure risk before the design relies only on steady-state pressure.",
    how: "The app adds surge allowance to operating pressure and compares the peak with design pressure.",
    drivenBy: "Operating pressure, valve closure, pump trip, ESD actions, and surge protection.",
  },
  "Design Factor": {
    why: "Connects public consequence and route class to allowable stress.",
    how: "The app maps class location to a summarized B31.8 design factor.",
    drivenBy: "Class location, occupancy, crossings, and special route conditions.",
  },
  "Material Recommendation": {
    why: "Helps select a practical pipe grade instead of picking material by habit.",
    how: "The app screens API 5L grades against required wall, utilization, pressure duty, and service warnings.",
    drivenBy:
      "Design pressure, OD, design factor, corrosion allowance, selected wall, sour service, and offshore/subsea exposure.",
  },
};

function Calcs({ id }: { id: string }) {
  const { projects, upsert } = useProjects();
  const p = projects.find((x) => x.id === id)!;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Wall Thickness");
  const selectedClass = classLocation(p.classLocation);
  const selectedPipe = pipeSizeByOd(p.outsideDiameter_mm);
  const selectedMaterial =
    MATERIAL_OPTIONS.find((m) => m.grade === p.materialGrade) ?? MATERIAL_OPTIONS[1];
  const hydraulicId = internalDiameter({
    outsideDiameter_mm: p.outsideDiameter_mm ?? selectedPipe.od_mm,
    wallThickness_mm: p.wallThickness_mm,
  });
  const hydraulicLimits = serviceHydraulicLimits(p);
  const [smys, setSmys] = useState(selectedMaterial.smys_MPa);
  const [F, setF] = useState(selectedClass.designFactor);
  const [Q, setQ] = useState(() => defaultFlowForProject(p));
  const [v, setV] = useState(hydraulicLimits.targetVelocity_ms);
  const [rho, setRho] = useState(defaultDensityForProject(p));
  const [f, setFD] = useState(0.018);
  const [erosionC, setErosionC] = useState(100);
  const [operatingPressure, setOperatingPressure] = useState(
    Math.max(0.1, Number((p.designPressure_MPa * 0.8).toFixed(2))),
  );
  const [vaporPressure, setVaporPressure] = useState(0.06);
  const [surgeAllowance, setSurgeAllowance] = useState(
    Math.max(0.1, Number((p.designPressure_MPa * 0.15).toFixed(2))),
  );
  const [sourService, setSourService] = useState(false);
  const [offshoreService, setOffshoreService] = useState(false);
  const [optimizationMessage, setOptimizationMessage] = useState("");

  const t = useMemo(
    () =>
      p.outsideDiameter_mm
        ? wallThickness({
            designPressure_MPa: p.designPressure_MPa,
            outsideDiameter_mm: p.outsideDiameter_mm,
            SMYS_MPa: smys,
            designFactor: F,
            corrosionAllowance_mm: p.corrosionAllowance_mm,
            selectedWall_mm: p.wallThickness_mm,
          })
        : null,
    [p, smys, F],
  );
  const mp = useMemo(
    () =>
      p.outsideDiameter_mm && p.wallThickness_mm
        ? maop({
            wallThickness_mm: p.wallThickness_mm,
            outsideDiameter_mm: p.outsideDiameter_mm,
            SMYS_MPa: smys,
            designFactor: F,
            corrosionAllowance_mm: p.corrosionAllowance_mm,
            limit_MPa: p.designPressure_MPa,
          })
        : null,
    [p, smys, F],
  );
  const hy = useMemo(
    () =>
      p.MAOP_MPa
        ? hydrotest({
            MAOP_MPa: p.MAOP_MPa,
            SMYS_MPa: smys,
            D_mm: p.outsideDiameter_mm,
            t_mm: p.wallThickness_mm,
            cap_pctSMYS: 90,
          })
        : null,
    [p, smys],
  );
  const sz = useMemo(() => pipeSizing({ Q_m3s: Q, targetV_ms: v }), [Q, v]);
  const ve = useMemo(
    () =>
      p.outsideDiameter_mm
        ? velocity({ Q_m3s: Q, D_mm: hydraulicId, max_ms: hydraulicLimits.maxVelocity_ms })
        : null,
    [Q, p.outsideDiameter_mm, hydraulicId, hydraulicLimits.maxVelocity_ms],
  );
  const pd = useMemo(
    () =>
      p.outsideDiameter_mm
        ? pressureDrop({
            f,
            D_mm: hydraulicId,
            rho_kgm3: rho,
            v_ms: ve?.value ?? v,
            maxDrop_MPa: hydraulicLimits.maxDrop_MPaKm,
          })
        : null,
    [f, rho, v, ve?.value, p.outsideDiameter_mm, hydraulicId, hydraulicLimits.maxDrop_MPaKm],
  );
  const hs = useMemo(
    () =>
      p.outsideDiameter_mm && p.wallThickness_mm
        ? hoopStress({
            P_MPa: p.designPressure_MPa,
            D_mm: p.outsideDiameter_mm,
            t_mm: p.wallThickness_mm,
            SMYS_MPa: smys,
            allow_pctSMYS: F * 100,
          })
        : null,
    [p, smys, F],
  );
  const erosion = useMemo(
    () =>
      ve
        ? erosionVelocityApi14E({
            actualVelocity_ms: ve.value,
            mixtureDensity_kgm3: rho,
            cFactor: erosionC,
          })
        : null,
    [ve, rho, erosionC],
  );
  const df = useMemo(() => designFactorByClass(p.classLocation ?? 1), [p.classLocation]);
  const vp = useMemo(
    () =>
      vaporPressureMargin({
        operatingPressure_MPa: operatingPressure,
        vaporPressure_MPa: vaporPressure,
      }),
    [operatingPressure, vaporPressure],
  );
  const surge = useMemo(
    () =>
      surgeDesignCheck({
        designPressure_MPa: p.designPressure_MPa,
        operatingPressure_MPa: operatingPressure,
        surgeAllowance_MPa: surgeAllowance,
      }),
    [p.designPressure_MPa, operatingPressure, surgeAllowance],
  );
  const materialRecommendations = useMemo(
    () =>
      p.outsideDiameter_mm
        ? recommendMaterials({
            designPressure_MPa: p.designPressure_MPa,
            outsideDiameter_mm: p.outsideDiameter_mm,
            designFactor: F,
            corrosionAllowance_mm: p.corrosionAllowance_mm,
            selectedWall_mm: p.wallThickness_mm,
            sourService,
            subseaOrOffshore: offshoreService,
          })
        : [],
    [p, F, sourService, offshoreService],
  );
  const designOptions = useMemo(
    () =>
      generatePipelineDesignOptions({
        project: p,
        designFactor: F,
        flow_m3s: Q,
        targetVelocity_ms: v,
        density_kgm3: rho,
        frictionFactor: f,
        operatingPressure_MPa: operatingPressure,
        surgeAllowance_MPa: surgeAllowance,
      }),
    [p, F, Q, v, rho, f, operatingPressure, surgeAllowance],
  );
  const tabStatuses = useMemo(
    () =>
      getTabStatuses({
        t,
        mp,
        hy,
        pd,
        ve,
        hs,
        erosion,
        vp,
        surge,
        materialRecommendations,
        selectedMaterialGrade: selectedMaterial.grade,
      }),
    [t, mp, hy, pd, ve, hs, erosion, vp, surge, materialRecommendations, selectedMaterial.grade],
  );
  const optimizations = useMemo(
    () =>
      buildOptimizations({
        p,
        F,
        smys,
        Q,
        v,
        f,
        rho,
        operatingPressure,
        vaporPressure,
        surgeAllowance,
        wallResult: t,
        maopResult: mp,
        velocityResult: ve,
        pressureDropResult: pd,
        vaporResult: vp,
        surgeResult: surge,
        materialRecommendations,
        upsert: (next) => void upsert(next),
        setSmys,
        setQ,
        setV,
        setOperatingPressure,
        setSurgeAllowance,
        acknowledge: setOptimizationMessage,
      }),
    [
      p,
      F,
      smys,
      Q,
      v,
      f,
      rho,
      operatingPressure,
      vaporPressure,
      surgeAllowance,
      t,
      mp,
      ve,
      pd,
      vp,
      surge,
      materialRecommendations,
      upsert,
    ],
  );

  const activeResult = getActiveResult(tab, { t, mp, hy, sz, pd, ve, hs, erosion, df, vp, surge });
  const learning = LEARNING[tab];
  const traceSheets = useMemo(
    () =>
      buildTraceSheets({
        p,
        unitSystem: p.unitSystem,
        smys,
        F,
        Q,
        v,
        rho,
        f,
        erosionC,
        operatingPressure,
        vaporPressure,
        surgeAllowance,
        results: { t, mp, hy, sz, pd, ve, hs, erosion, df, vp, surge },
      }),
    [
      p,
      smys,
      F,
      Q,
      v,
      rho,
      f,
      erosionC,
      operatingPressure,
      vaporPressure,
      surgeAllowance,
      t,
      mp,
      hy,
      sz,
      pd,
      ve,
      hs,
      erosion,
      df,
      vp,
      surge,
    ],
  );
  const issueValidation = useMemo(() => validateBeforeIssue(p), [p]);
  const projectConfidence = useMemo(() => dataConfidenceForProject(p), [p]);
  const flowPresets = useMemo(() => buildFlowPresets(hydraulicId, p), [hydraulicId, p]);
  const velocityPresets = useMemo(() => buildVelocityPresets(p), [p]);

  function updateClass(value: 1 | 2 | 3 | 4) {
    const next = classLocation(value);
    setF(next.designFactor);
    void upsert({ ...p, classLocation: value });
  }

  function saveCalculationRevision() {
    const revision = createCalculationRevision({ project: p, sheets: traceSheets });
    void upsert({ ...p, calculationRevisions: [revision, ...(p.calculationRevisions ?? [])] });
    setOptimizationMessage(
      `Saved calculation revision ${revision.revision} with ${revision.sheets.length} trace sheet(s).`,
    );
  }

  return (
    <div className="space-y-4 pb-20 xl:pb-0">
      <div
        role="tablist"
        aria-label="Calculation checks"
        className="touch-scroll sticky top-[4.5rem] z-20 flex gap-1 overflow-x-auto border-b bg-background/95 backdrop-blur lg:static lg:bg-transparent"
      >
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls="calculation-panel"
            onClick={() => setTab(item)}
            className={`tap-target -mb-px flex min-w-28 shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-3 py-2 text-xs sm:min-w-32 ${tab === item ? "border-primary bg-primary/5 text-primary font-medium" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <CalculationHeadingStatus status={tabStatuses[item]} />
              {item}
            </span>
          </button>
        ))}
      </div>

      <MobileCalculationSummary tab={tab} result={activeResult} projectName={p.name} />
      <MobileCalculationDock />

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)_minmax(280px,0.8fr)]">
        <section
          id="calculation-inputs"
          aria-labelledby="validated-inputs-title"
          className="app-card scroll-mt-36 space-y-3 p-4"
        >
          <div className="flex items-center justify-between">
            <h2
              id="validated-inputs-title"
              className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
            >
              Validated Inputs
            </h2>
            <div className="flex items-center gap-2">
              <DataConfidenceBadge confidence={projectConfidence} prefix="Confidence" />
              <LessonPopover
                title="Calculation workflow"
                why="The calculated result is only as reliable as the design basis feeding it."
                how="Pick standard OD/NPS, wall schedule, pressure, fluid data, material strength, class location, corrosion allowance, and operating/transient cases before interpreting pass/fail results."
                drivenBy="Pressure, OD, SMYS, wall, design factor, corrosion allowance, flow, density, vapor pressure, surge allowance, and route consequence."
                codeRef="ASME B31.4/B31.8 summarized design practice"
              />
            </div>
          </div>
          <CustomNumberSelect
            label="OD / NPS"
            value={p.outsideDiameter_mm ?? selectedPipe.od_mm}
            unit="mm"
            customLabel="Custom OD / out-of-table value"
            options={PIPE_SIZE_OPTIONS.map((size) => ({
              value: size.od_mm,
              label: `NPS ${size.nps} - OD ${size.od_mm} mm`,
            }))}
            on={(value) => upsert({ ...p, outsideDiameter_mm: value })}
          />
          <CustomNumberSelect
            label="Wall Thickness / Schedule"
            value={p.wallThickness_mm ?? selectedPipe.commonSchedules[0]?.wall_mm ?? 0}
            unit="mm"
            customLabel="Custom wall / mill value"
            options={selectedPipe.commonSchedules.map((s) => ({
              value: s.wall_mm,
              label: `${s.schedule} - ${s.wall_mm} mm`,
            }))}
            on={(value) => upsert({ ...p, wallThickness_mm: value })}
          />
          <DualUnitInput
            label="Design Pressure"
            kind="pressure"
            value={p.designPressure_MPa}
            on={(n) => upsert({ ...p, designPressure_MPa: n })}
          />
          <DualUnitInput
            label="Operating Pressure"
            kind="pressure"
            value={operatingPressure}
            on={setOperatingPressure}
          />
          <CustomNumberSelect
            label="Fluid Vapor Pressure"
            value={vaporPressure}
            unit="MPa"
            customLabel="Custom vapor pressure"
            options={VAPOR_PRESETS.map((preset) => ({ value: preset.vp, label: preset.label }))}
            on={setVaporPressure}
          />
          <DualUnitInput
            label="Surge Allowance"
            kind="pressure"
            value={surgeAllowance}
            on={setSurgeAllowance}
          />
          <DualUnitInput
            label="Corrosion Allowance"
            kind="length"
            value={p.corrosionAllowance_mm}
            on={(n) => upsert({ ...p, corrosionAllowance_mm: n })}
          />
          <CustomMaterialSelect
            grade={p.materialGrade}
            smys={smys}
            on={(grade, nextSmys) => {
              setSmys(nextSmys);
              void upsert({ ...p, materialGrade: grade });
            }}
          />
          <Select
            label="Class Location / Design Factor"
            value={String(p.classLocation ?? 1)}
            on={(value) => updateClass(Number(value) as 1 | 2 | 3 | 4)}
          >
            {CLASS_LOCATION_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} - F {c.designFactor}
              </option>
            ))}
          </Select>
          <Sm label="Design Factor F" value={F} on={setF} step={0.01} />
          <DualUnitInput
            label="MAOP"
            kind="pressure"
            value={p.MAOP_MPa ?? 0}
            on={(n) => upsert({ ...p, MAOP_MPa: n })}
          />
          <DualUnitInput
            label="Hydrotest"
            kind="pressure"
            value={p.hydrotestPressure_MPa ?? 0}
            on={(n) => upsert({ ...p, hydrotestPressure_MPa: n })}
          />
          <Toggle label="Sour service / H2S risk" checked={sourService} on={setSourService} />
          <Toggle
            label="Offshore / subsea exposure"
            checked={offshoreService}
            on={setOffshoreService}
          />
          <div className="space-y-3 border-t border-border pt-2">
            <CustomNumberSelect
              label="Flow Q"
              value={Q}
              unit="m3/s"
              customLabel="Custom project throughput"
              options={flowPresets.map((preset) => ({ value: preset.q, label: preset.label }))}
              on={setQ}
            />
            <CustomNumberSelect
              label="Target velocity"
              value={v}
              unit="m/s"
              customLabel="Custom target velocity"
              options={velocityPresets.map((preset) => ({ value: preset.v, label: preset.label }))}
              on={setV}
            />
            <CustomNumberSelect
              label="Density"
              value={rho}
              unit="kg/m3"
              customLabel="Custom fluid density"
              options={DENSITY_PRESETS.map((preset) => ({
                value: preset.rho,
                label: preset.label,
              }))}
              on={setRho}
            />
            <CustomNumberSelect
              label="API RP 14E C factor"
              value={erosionC}
              customLabel="Custom C factor"
              options={EROSION_C_PRESETS.map((preset) => ({
                value: preset.c,
                label: preset.label,
              }))}
              on={setErosionC}
            />
            <CustomNumberSelect
              label="Darcy friction factor"
              value={f}
              customLabel="Custom friction factor"
              options={FRICTION_PRESETS.map((preset) => ({ value: preset.f, label: preset.label }))}
              on={setFD}
            />
            <div className="rounded-sm border bg-muted/40 p-2 text-[11px] text-muted-foreground">
              Hydraulic check uses estimated ID {hydraulicId} mm. Service limits: velocity{" "}
              {hydraulicLimits.maxVelocity_ms} m/s, pressure drop {hydraulicLimits.maxDrop_MPaKm}{" "}
              MPa/km. Change flow to represent throughput, not to force a pass.
            </div>
          </div>
        </section>

        <div
          id="calculation-panel"
          role="tabpanel"
          aria-label={`${tab} calculation`}
          tabIndex={-1}
          className="scroll-mt-36"
        >
          <EpcControlsPanel
            project={p}
            traceSheets={traceSheets}
            issueValidation={issueValidation}
            onUpdate={(next) => void upsert(next)}
            onSaveRevision={saveCalculationRevision}
            projectConfidence={projectConfidence}
          />
          <DesignCasePanel
            options={designOptions}
            currentProject={p}
            onApply={(option) => {
              const material = MATERIAL_OPTIONS.find((item) => item.grade === option.materialGrade);
              if (material) setSmys(material.smys_MPa);
              void upsert({
                ...p,
                outsideDiameter_mm: option.od_mm,
                wallThickness_mm: option.wall_mm,
                materialGrade: option.materialGrade,
                MAOP_MPa: option.maop_MPa,
                hydrotestPressure_MPa: option.hydrotest_MPa,
              });
              setOptimizationMessage(
                `Applied design case: NPS ${option.nps}, ${option.schedule}, ${option.materialGrade}. Re-check detailed hydraulics and code review.`,
              );
            }}
          />
          <OptimizationPanel
            items={optimizations}
            message={optimizationMessage}
            clearMessage={() => setOptimizationMessage("")}
          />
          {tab === "Wall Thickness" &&
            (t ? (
              <CalcResultCard
                title="Wall Thickness"
                result={t}
                unitSystem={p.unitSystem}
                classification="design_basis"
              />
            ) : (
              <Empty msg="Set OD to compute." />
            ))}
          {tab === "MAOP" &&
            (mp ? (
              <CalcResultCard
                title="MAOP"
                result={mp}
                unitSystem={p.unitSystem}
                classification="design_basis"
              />
            ) : (
              <Empty msg="Set OD and t to compute." />
            ))}
          {tab === "Hydrotest" &&
            (hy ? (
              <CalcResultCard
                title="Recommended Hydrotest"
                result={hy}
                unitSystem={p.unitSystem}
                classification="design_basis"
              />
            ) : (
              <Empty msg="Set MAOP to compute." />
            ))}
          {tab === "Sizing" && (
            <CalcResultCard
              title="Min. ID for target velocity"
              result={sz}
              unitSystem={p.unitSystem}
            />
          )}
          {tab === "Pressure Drop" &&
            (pd ? (
              <CalcResultCard title="Pressure Drop / km" result={pd} unitSystem={p.unitSystem} />
            ) : (
              <Empty msg="Set OD to compute." />
            ))}
          {tab === "Velocity" &&
            (ve ? (
              <CalcResultCard title="Fluid Velocity" result={ve} unitSystem={p.unitSystem} />
            ) : (
              <Empty msg="Set OD to compute." />
            ))}
          {tab === "Hoop Stress" &&
            (hs ? (
              <CalcResultCard title="Hoop Stress" result={hs} unitSystem={p.unitSystem} />
            ) : (
              <Empty msg="Set OD and t to compute." />
            ))}
          {tab === "Erosion Velocity" &&
            (erosion ? (
              <CalcResultCard
                title="API RP 14E Erosion Velocity"
                result={erosion}
                unitSystem={p.unitSystem}
              />
            ) : (
              <Empty msg="Set OD and flow to compute." />
            ))}
          {tab === "Vapor Pressure" && (
            <CalcResultCard title="Vapor Pressure Margin" result={vp} unitSystem={p.unitSystem} />
          )}
          {tab === "Surge Margin" && (
            <CalcResultCard
              title="Transient Surge Screening"
              result={surge}
              unitSystem={p.unitSystem}
            />
          )}
          {tab === "Design Factor" && (
            <CalcResultCard title={`Class ${p.classLocation ?? 1} Design Factor`} result={df} />
          )}
          {tab === "Material Recommendation" && (
            <MaterialRecommendationPanel recommendations={materialRecommendations} />
          )}
        </div>

        <aside
          id="learning-panel"
          className="app-card h-fit scroll-mt-36 space-y-3 p-4 xl:sticky xl:top-24"
          aria-label="Calculation guidance"
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Learning moment
          </div>
          <h3 className="text-sm font-semibold">{tab}</h3>
          <InfoBlock label="Why it matters" text={learning.why} />
          <InfoBlock label="How to use it" text={learning.how} />
          <InfoBlock label="What drives it" text={learning.drivenBy} />
          {activeResult?.pass === false && activeResult.recommendations && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3">
              <div className="mb-1 text-[11px] font-mono uppercase tracking-wider text-destructive">
                If this fails
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                {activeResult.recommendations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-sm border bg-background p-3 text-xs text-muted-foreground">
            Best practice: treat these as design-basis checks. Freeze final values only after code
            review, hydraulic profile, material specification, constructability review, and project
            authority approval.
          </div>
        </aside>
      </div>
    </div>
  );
}

function serviceHydraulicLimits(p: ReturnType<typeof useProjects>["projects"][number]) {
  if (p.fluidType === "gas" || p.fluidType === "hydrogen") {
    return { lowVelocity_ms: 8, targetVelocity_ms: 12, maxVelocity_ms: 20, maxDrop_MPaKm: 0.25 };
  }
  if (p.fluidType === "co2") {
    return {
      lowVelocity_ms: 1.5,
      targetVelocity_ms: 2.5,
      maxVelocity_ms: 3.5,
      maxDrop_MPaKm: 0.15,
    };
  }
  if (p.fluidType === "multiphase") {
    return { lowVelocity_ms: 2, targetVelocity_ms: 4, maxVelocity_ms: 6, maxDrop_MPaKm: 0.2 };
  }
  if (p.fluidType === "water_injection") {
    return { lowVelocity_ms: 2, targetVelocity_ms: 3, maxVelocity_ms: 4, maxDrop_MPaKm: 0.25 };
  }
  return { lowVelocity_ms: 1.5, targetVelocity_ms: 2.5, maxVelocity_ms: 3, maxDrop_MPaKm: 0.2 };
}

function MobileCalculationSummary({
  tab,
  result,
  projectName,
}: {
  tab: (typeof TABS)[number];
  result: CalcResult | null;
  projectName: string;
}) {
  const status = !result || result.pass === undefined ? "Review" : result.pass ? "Pass" : "Fail";
  const tone =
    status === "Pass"
      ? "border-compliant/30 bg-compliant/10 text-compliant"
      : status === "Fail"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-warning/30 bg-warning/10 text-warning";
  return (
    <section className="app-card space-y-3 p-3 xl:hidden" aria-label="Mobile calculation summary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Active calculation
          </div>
          <div className="truncate text-sm font-semibold">{tab}</div>
          <div className="truncate text-[11px] text-muted-foreground">{projectName}</div>
        </div>
        <span className={`shrink-0 rounded-sm border px-2 py-1 text-[10px] font-mono ${tone}`}>
          {status}
        </span>
      </div>
      {result && (
        <div className="rounded-sm bg-muted p-2 font-mono text-lg leading-tight">
          {result.value} <span className="text-xs text-muted-foreground">{result.unit}</span>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <a
          className="tap-target flex flex-col items-center justify-center gap-1 rounded-sm border px-2 py-2 font-medium text-foreground"
          href="/engineer/calculations#calculation-inputs"
          aria-label="Jump to calculation inputs"
        >
          <ListChecks className="size-4" aria-hidden="true" />
          <span>Inputs</span>
        </a>
        <a
          className="tap-target flex flex-col items-center justify-center gap-1 rounded-sm border px-2 py-2 font-medium text-foreground"
          href="/engineer/calculations#epc-controls"
          aria-label="Jump to EPC calculation controls"
        >
          <FileCheck2 className="size-4" aria-hidden="true" />
          <span>EPC</span>
        </a>
        <a
          className="tap-target flex flex-col items-center justify-center gap-1 rounded-sm border px-2 py-2 font-medium text-foreground"
          href="/engineer/calculations#calculation-panel"
          aria-label="Jump to calculation result"
        >
          <Gauge className="size-4" aria-hidden="true" />
          <span>Result</span>
        </a>
        <a
          className="tap-target flex flex-col items-center justify-center gap-1 rounded-sm border px-2 py-2 font-medium text-foreground"
          href="/engineer/calculations#learning-panel"
          aria-label="Jump to learning guidance"
        >
          <BookOpen className="size-4" aria-hidden="true" />
          <span>Learn</span>
        </a>
      </div>
    </section>
  );
}

function MobileCalculationDock() {
  const links = [
    { href: "/engineer/calculations#calculation-inputs", label: "Inputs", icon: ListChecks },
    { href: "/engineer/calculations#epc-controls", label: "EPC", icon: FileCheck2 },
    { href: "/engineer/calculations#calculation-panel", label: "Result", icon: Gauge },
    { href: "/engineer/calculations#learning-panel", label: "Learn", icon: BookOpen },
  ];

  return (
    <nav
      aria-label="Mobile calculation shortcuts"
      className="fixed inset-x-3 bottom-3 z-40 rounded-sm border bg-card/95 p-1 shadow-lg backdrop-blur xl:hidden"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-4 gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="tap-target flex flex-col items-center justify-center gap-0.5 rounded-sm px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

function defaultDensityForProject(p: ReturnType<typeof useProjects>["projects"][number]) {
  if (p.fluidType === "gas" || p.fluidType === "hydrogen") return 80;
  if (p.fluidType === "co2") return 750;
  if (p.fluidType === "water_injection") return 1000;
  return 850;
}

function defaultFlowForProject(p: ReturnType<typeof useProjects>["projects"][number]) {
  const limits = serviceHydraulicLimits(p);
  const id = internalDiameter({
    outsideDiameter_mm: p.outsideDiameter_mm ?? 323.9,
    wallThickness_mm: p.wallThickness_mm,
  });
  return flowFromVelocity(id, limits.targetVelocity_ms);
}

function buildFlowPresets(
  hydraulicId_mm: number,
  p: ReturnType<typeof useProjects>["projects"][number],
) {
  const limits = serviceHydraulicLimits(p);
  return [
    {
      label: `Low case - ${limits.lowVelocity_ms} m/s in selected pipe`,
      q: flowFromVelocity(hydraulicId_mm, limits.lowVelocity_ms),
    },
    {
      label: `Design case - ${limits.targetVelocity_ms} m/s in selected pipe`,
      q: flowFromVelocity(hydraulicId_mm, limits.targetVelocity_ms),
    },
    {
      label: `Upper screening - ${limits.maxVelocity_ms} m/s in selected pipe`,
      q: flowFromVelocity(hydraulicId_mm, limits.maxVelocity_ms),
    },
  ];
}

function buildVelocityPresets(p: ReturnType<typeof useProjects>["projects"][number]) {
  const limits = serviceHydraulicLimits(p);
  return [
    { label: `Low / conservative - ${limits.lowVelocity_ms} m/s`, v: limits.lowVelocity_ms },
    { label: `Design target - ${limits.targetVelocity_ms} m/s`, v: limits.targetVelocity_ms },
    { label: `Upper screening - ${limits.maxVelocity_ms} m/s`, v: limits.maxVelocity_ms },
  ];
}

function flowFromVelocity(hydraulicId_mm: number, velocity_ms: number) {
  const area = (Math.PI * (hydraulicId_mm / 1000) ** 2) / 4;
  return round(area * velocity_ms, 3);
}

function getActiveResult(
  tab: (typeof TABS)[number],
  results: {
    t: CalcResult | null;
    mp: CalcResult | null;
    hy: CalcResult | null;
    sz: CalcResult;
    pd: CalcResult | null;
    ve: CalcResult | null;
    hs: CalcResult | null;
    erosion: CalcResult | null;
    df: CalcResult;
    vp: CalcResult;
    surge: CalcResult;
  },
) {
  const map: Partial<Record<(typeof TABS)[number], CalcResult | null>> = {
    "Wall Thickness": results.t,
    MAOP: results.mp,
    Hydrotest: results.hy,
    Sizing: results.sz,
    "Pressure Drop": results.pd,
    Velocity: results.ve,
    "Hoop Stress": results.hs,
    "Erosion Velocity": results.erosion,
    "Vapor Pressure": results.vp,
    "Surge Margin": results.surge,
    "Design Factor": results.df,
  };
  return map[tab] ?? null;
}

function buildTraceSheets({
  p,
  unitSystem,
  smys,
  F,
  Q,
  v,
  rho,
  f,
  erosionC,
  operatingPressure,
  vaporPressure,
  surgeAllowance,
  results,
}: {
  p: ReturnType<typeof useProjects>["projects"][number];
  unitSystem: ReturnType<typeof useProjects>["projects"][number]["unitSystem"];
  smys: number;
  F: number;
  Q: number;
  v: number;
  rho: number;
  f: number;
  erosionC: number;
  operatingPressure: number;
  vaporPressure: number;
  surgeAllowance: number;
  results: {
    t: CalcResult | null;
    mp: CalcResult | null;
    hy: CalcResult | null;
    sz: CalcResult;
    pd: CalcResult | null;
    ve: CalcResult | null;
    hs: CalcResult | null;
    erosion: CalcResult | null;
    df: CalcResult;
    vp: CalcResult;
    surge: CalcResult;
  };
}) {
  const revision = `C${String((p.calculationRevisions?.length ?? 0) + 1).padStart(2, "0")}`;
  const baseInputs = [
    {
      label: "Design pressure",
      value: formatEngineeringValue(p.designPressure_MPa, "MPa", unitSystem),
      source: "Design basis",
    },
    {
      label: "Outside diameter",
      value: formatEngineeringValue(p.outsideDiameter_mm, "mm", unitSystem),
      source: "Selected OD / NPS",
    },
    {
      label: "Selected wall",
      value: formatEngineeringValue(p.wallThickness_mm, "mm", unitSystem),
      source: "Selected schedule",
    },
    { label: "Material strength", value: `${smys} MPa SMYS`, source: "Material selection" },
    { label: "Design factor", value: String(F), source: "Class location / code basis" },
    {
      label: "Corrosion allowance",
      value: formatEngineeringValue(p.corrosionAllowance_mm, "mm", unitSystem),
      source: "Corrosion basis",
    },
  ];
  const sheets = [];
  if (results.t) {
    sheets.push(
      createTraceSheet({
        project: p,
        title: "Pressure wall thickness",
        result: results.t,
        revision,
        classification: "design_basis",
        inputs: baseInputs,
      }),
    );
  }
  if (results.mp) {
    sheets.push(
      createTraceSheet({
        project: p,
        title: "MAOP from selected pipe",
        result: results.mp,
        revision,
        classification: "design_basis",
        inputs: baseInputs,
      }),
    );
  }
  if (results.hy) {
    sheets.push(
      createTraceSheet({
        project: p,
        title: "Hydrotest pressure",
        result: results.hy,
        revision,
        classification: "design_basis",
        inputs: [
          ...baseInputs,
          {
            label: "MAOP",
            value: formatEngineeringValue(p.MAOP_MPa, "MPa", unitSystem),
            source: "Project MAOP",
          },
        ],
      }),
    );
  }
  if (results.ve) {
    sheets.push(
      createTraceSheet({
        project: p,
        title: "Velocity screening",
        result: results.ve,
        revision,
        inputs: [
          {
            label: "Flow rate",
            value: `${Q} m3/s`,
            source: "Hydraulic screening case",
          },
          {
            label: "OD",
            value: formatEngineeringValue(p.outsideDiameter_mm, "mm", unitSystem),
            source: "Selected OD / NPS",
          },
        ],
      }),
    );
  }
  if (results.pd) {
    sheets.push(
      createTraceSheet({
        project: p,
        title: "Pressure drop screening",
        result: results.pd,
        revision,
        inputs: [
          { label: "Friction factor", value: String(f), source: "Hydraulic screening case" },
          { label: "Density", value: `${rho} kg/m3`, source: "Hydraulic screening case" },
          { label: "Velocity", value: `${v} m/s`, source: "Hydraulic screening case" },
        ],
      }),
    );
  }
  if (results.erosion) {
    sheets.push(
      createTraceSheet({
        project: p,
        title: "API RP 14E erosion velocity",
        result: results.erosion,
        revision,
        inputs: [
          {
            label: "Actual velocity",
            value: results.ve ? `${results.ve.value} m/s` : "-",
            source: "Velocity calculation",
          },
          { label: "Mixture density", value: `${rho} kg/m3`, source: "Hydraulic screening case" },
          { label: "C factor", value: String(erosionC), source: "API RP 14E service selection" },
        ],
      }),
    );
  }
  sheets.push(
    createTraceSheet({
      project: p,
      title: "Vapor pressure margin",
      result: results.vp,
      revision,
      inputs: [
        {
          label: "Operating pressure",
          value: formatEngineeringValue(operatingPressure, "MPa", unitSystem),
          source: "Operating envelope",
        },
        {
          label: "Vapor pressure",
          value: formatEngineeringValue(vaporPressure, "MPa", unitSystem),
          source: "Fluid property screening",
        },
      ],
    }),
    createTraceSheet({
      project: p,
      title: "Surge pressure margin",
      result: results.surge,
      revision,
      inputs: [
        {
          label: "Operating pressure",
          value: formatEngineeringValue(operatingPressure, "MPa", unitSystem),
          source: "Operating envelope",
        },
        {
          label: "Surge allowance",
          value: formatEngineeringValue(surgeAllowance, "MPa", unitSystem),
          source: "Transient screening case",
        },
      ],
    }),
  );
  return sheets;
}

function EpcControlsPanel({
  project,
  traceSheets,
  issueValidation,
  onUpdate,
  onSaveRevision,
  projectConfidence,
}: {
  project: ReturnType<typeof useProjects>["projects"][number];
  traceSheets: ReturnType<typeof buildTraceSheets>;
  issueValidation: ReturnType<typeof validateBeforeIssue>;
  onUpdate: (project: ReturnType<typeof useProjects>["projects"][number]) => void;
  onSaveRevision: () => void;
  projectConfidence: ReturnType<typeof dataConfidenceForProject>;
}) {
  const routeSections = project.routeSections ?? [];
  const componentLimits = project.componentLimits ?? [];
  const assumptions = project.assumptionsRegister ?? [];
  const confidence = dataConfidenceBreakdown(project);
  const weakest = weakestComponent(project);
  const lastRevision = project.calculationRevisions?.[0];
  const selectedEdition = project.codeEdition
    ? `${project.codeEdition.designCode}|${project.codeEdition.edition}`
    : "";
  const now = () => new Date().toISOString();

  function mergeAssumptionDefaults() {
    onUpdate({
      ...project,
      assumptionsRegister: mergeById(assumptions, defaultAssumptions(project)),
    });
  }

  function mergeRouteDefaults() {
    onUpdate({
      ...project,
      routeSections: mergeById(routeSections, defaultRouteSections(project)),
    });
  }

  function mergeComponentDefaults() {
    onUpdate({
      ...project,
      componentLimits: mergeById(componentLimits, defaultComponentLimits(project)),
    });
  }

  function updateAssumption(id: string, patch: Partial<EngineeringAssumption>) {
    onUpdate({
      ...project,
      assumptionsRegister: assumptions.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: now() } : item,
      ),
    });
  }

  function addAssumption() {
    onUpdate({
      ...project,
      assumptionsRegister: [
        ...assumptions,
        {
          id: `assumption-${crypto.randomUUID()}`,
          assumption: "New project assumption",
          source: "Project input",
          confidence: "assumed",
          owner: project.engineer || "Responsible engineer",
          status: "open",
          createdAt: now(),
        },
      ],
    });
  }

  function removeAssumption(id: string) {
    onUpdate({ ...project, assumptionsRegister: assumptions.filter((item) => item.id !== id) });
  }

  function updateRouteSection(id: string, patch: Partial<RouteSection>) {
    onUpdate({
      ...project,
      routeSections: routeSections.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function addRouteSection() {
    onUpdate({
      ...project,
      routeSections: [
        ...routeSections,
        {
          id: `route-${crypto.randomUUID()}`,
          name: "New route section",
          length_km: 0,
          elevationChange_m: 0,
          classLocation: project.classLocation ?? 1,
          designPressure_MPa: project.designPressure_MPa,
          notes: "Define route basis and source.",
        },
      ],
    });
  }

  function removeRouteSection(id: string) {
    onUpdate({ ...project, routeSections: routeSections.filter((item) => item.id !== id) });
  }

  function updateComponentLimit(id: string, patch: Partial<ComponentLimit>) {
    onUpdate({
      ...project,
      componentLimits: componentLimits.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  function addComponentLimit() {
    onUpdate({
      ...project,
      componentLimits: [
        ...componentLimits,
        {
          id: `limit-${crypto.randomUUID()}`,
          tag: "NEW-COMPONENT",
          type: "other",
          rating_MPa: project.designPressure_MPa,
          temperature_C: project.designTemperature_C,
          notes: "Define component rating source and pressure-temperature basis.",
        },
      ],
    });
  }

  function removeComponentLimit(id: string) {
    onUpdate({ ...project, componentLimits: componentLimits.filter((item) => item.id !== id) });
  }

  return (
    <section
      id="epc-controls"
      aria-labelledby="epc-controls-title"
      className="app-card mb-4 scroll-mt-36 space-y-3 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" aria-hidden="true" />
            <h4 id="epc-controls-title" className="text-sm font-semibold">
              EPC Calculation Controls
            </h4>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Adds the controls expected in a formal calculation pack: code edition, unit basis, route
            sections, limiting components, trace sheets, revision history, and issue checks.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-warning">
            Code edition is recorded for traceability. Detailed clause-by-clause edition logic is
            not implemented; final issue still requires governing-code verification.
          </p>
        </div>
        <span
          role="status"
          className={`rounded-sm border px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${
            issueValidation.status === "compliant"
              ? "border-compliant/30 bg-compliant/10 text-compliant"
              : issueValidation.status === "warning"
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          issue: {issueValidation.status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CalculationClassificationBadge classification="screening" />
        <CalculationClassificationBadge classification="design_basis" />
        <CalculationClassificationBadge classification="detailed_not_implemented" />
        <DataConfidenceBadge confidence={projectConfidence} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Code edition"
          value={selectedEdition}
          on={(value) => {
            const [designCode, edition] = value.split("|");
            const next = CODE_EDITION_OPTIONS.find(
              (item) => item.designCode === designCode && item.edition === edition,
            );
            if (!next) return;
            onUpdate({ ...project, designCode: next.designCode, codeEdition: next });
          }}
        >
          <option value="">Select edition</option>
          {CODE_EDITION_OPTIONS.map((edition) => (
            <option
              key={`${edition.designCode}-${edition.edition}`}
              value={`${edition.designCode}|${edition.edition}`}
            >
              {edition.designCode} - {edition.edition}
            </option>
          ))}
        </Select>
        <Select
          label="Unit display"
          value={project.unitSystem ?? "metric"}
          on={(value) => onUpdate({ ...project, unitSystem: value as "metric" | "us_customary" })}
        >
          <option value="metric">Metric engineering units</option>
          <option value="us_customary">US customary display</option>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Trace sheets" value={traceSheets.length} />
        <Metric label="Saved revisions" value={project.calculationRevisions?.length ?? 0} />
        <Metric label="Open assumptions" value={confidence.open} />
        <Metric
          label="Weakest component"
          value={weakest ? `${weakest.tag}: ${weakest.rating_MPa} MPa` : "Not set"}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={mergeAssumptionDefaults}
          className="tap-target flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Merge Assumptions Defaults
        </button>
        <button
          type="button"
          onClick={mergeRouteDefaults}
          className="tap-target flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Merge Route Defaults
        </button>
        <button
          type="button"
          onClick={mergeComponentDefaults}
          className="tap-target flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Merge Component Defaults
        </button>
        <button
          type="button"
          onClick={onSaveRevision}
          className="tap-target flex items-center justify-center gap-2 rounded-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground sm:col-span-2"
        >
          <History className="size-3.5" aria-hidden="true" />
          Save Calculation Revision
        </button>
      </div>

      <details className="rounded-sm border border-primary/20 bg-primary/5 p-3 xl:hidden">
        <summary className="cursor-pointer text-xs font-medium">
          Mobile note: what to complete before report issue
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Freeze code edition and unit basis.</li>
          <li>Close or assign assumptions.</li>
          <li>Confirm route sections and weakest component ratings.</li>
          <li>Save a calculation revision after changes.</li>
        </ul>
      </details>

      <details className="rounded-sm border bg-background p-3">
        <summary className="cursor-pointer text-xs font-medium">
          Engineering Assumptions Register
        </summary>
        <div className="mt-3 grid gap-2">
          {assumptions.length === 0 ? (
            <div className="rounded-sm border border-warning/30 bg-warning/10 p-2 text-xs text-muted-foreground">
              No saved assumptions. Merge defaults or add project-specific assumptions before issue.
            </div>
          ) : (
            assumptions.map((item) => (
              <div key={item.id} className="rounded-sm border p-3 text-xs">
                <div className="grid gap-2">
                  <label>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Assumption
                    </span>
                    <textarea
                      value={item.assumption}
                      onChange={(event) =>
                        updateAssumption(item.id, { assumption: event.target.value })
                      }
                      className="mt-0.5 min-h-20 w-full rounded-sm border bg-background px-2 py-2"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TextField
                      label="Source"
                      value={item.source}
                      on={(value) => updateAssumption(item.id, { source: value })}
                    />
                    <TextField
                      label="Owner"
                      value={item.owner}
                      on={(value) => updateAssumption(item.id, { owner: value })}
                    />
                    <Select
                      label="Confidence"
                      value={item.confidence}
                      on={(value) =>
                        updateAssumption(item.id, {
                          confidence: value as AssumptionConfidence,
                        })
                      }
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="assumed">Assumed</option>
                      <option value="estimated">Estimated</option>
                      <option value="placeholder">Sample dataset</option>
                    </Select>
                    <Select
                      label="Status"
                      value={item.status}
                      on={(value) =>
                        updateAssumption(item.id, {
                          status: value as EngineeringAssumption["status"],
                        })
                      }
                    >
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                      <option value="superseded">Superseded</option>
                    </Select>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <DataConfidenceBadge confidence={item.confidence} />
                  <button
                    type="button"
                    onClick={() => removeAssumption(item.id)}
                    className="tap-target rounded-sm border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addAssumption}
            className="tap-target rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            Add assumption
          </button>
        </div>
      </details>

      <details className="rounded-sm border bg-background p-3">
        <summary className="cursor-pointer text-xs font-medium">
          Route sections and component limits
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Route sections
            </div>
            {routeSections.length === 0 ? (
              <div className="rounded-sm border border-warning/30 bg-warning/10 p-2 text-xs text-muted-foreground">
                No saved route sections.
              </div>
            ) : (
              routeSections.map((section) => (
                <div key={section.id} className="rounded-sm border p-3 text-xs">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TextField
                      label="Section name"
                      value={section.name}
                      on={(value) => updateRouteSection(section.id, { name: value })}
                    />
                    <Select
                      label="Class location"
                      value={String(section.classLocation ?? project.classLocation ?? 1)}
                      on={(value) =>
                        updateRouteSection(section.id, {
                          classLocation: Number(value) as 1 | 2 | 3 | 4,
                        })
                      }
                    >
                      <option value="1">Class 1</option>
                      <option value="2">Class 2</option>
                      <option value="3">Class 3</option>
                      <option value="4">Class 4</option>
                    </Select>
                    <Sm
                      label="Length (km)"
                      value={section.length_km}
                      step={0.01}
                      on={(value) => updateRouteSection(section.id, { length_km: value })}
                    />
                    <Sm
                      label="Elevation change (m)"
                      value={section.elevationChange_m}
                      step={1}
                      on={(value) => updateRouteSection(section.id, { elevationChange_m: value })}
                    />
                    <Sm
                      label="Design pressure (MPa)"
                      value={section.designPressure_MPa ?? project.designPressure_MPa}
                      step={0.01}
                      on={(value) => updateRouteSection(section.id, { designPressure_MPa: value })}
                    />
                    <TextField
                      label="Basis / notes"
                      value={section.notes ?? ""}
                      on={(value) => updateRouteSection(section.id, { notes: value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRouteSection(section.id)}
                    className="tap-target mt-2 rounded-sm border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5"
                  >
                    Remove section
                  </button>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={addRouteSection}
              className="tap-target rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              Add route section
            </button>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Component limits
            </div>
            {componentLimits.length === 0 ? (
              <div className="rounded-sm border border-warning/30 bg-warning/10 p-2 text-xs text-muted-foreground">
                No saved component limits.
              </div>
            ) : (
              componentLimits.map((limit) => (
                <div key={limit.id} className="rounded-sm border p-3 text-xs">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TextField
                      label="Tag"
                      value={limit.tag}
                      on={(value) => updateComponentLimit(limit.id, { tag: value })}
                    />
                    <Select
                      label="Component type"
                      value={limit.type}
                      on={(value) =>
                        updateComponentLimit(limit.id, {
                          type: value as ComponentLimit["type"],
                        })
                      }
                    >
                      <option value="pipe">Pipe</option>
                      <option value="valve">Valve</option>
                      <option value="flange">Flange</option>
                      <option value="fitting">Fitting</option>
                      <option value="launcher">Launcher</option>
                      <option value="receiver">Receiver</option>
                      <option value="instrument">Instrument</option>
                      <option value="other">Other</option>
                    </Select>
                    <Sm
                      label="Rating (MPa)"
                      value={limit.rating_MPa}
                      step={0.01}
                      on={(value) => updateComponentLimit(limit.id, { rating_MPa: value })}
                    />
                    <Sm
                      label="Temperature (C)"
                      value={limit.temperature_C ?? project.designTemperature_C}
                      step={1}
                      on={(value) => updateComponentLimit(limit.id, { temperature_C: value })}
                    />
                    <div className="sm:col-span-2">
                      <TextField
                        label="Rating source / notes"
                        value={limit.notes ?? ""}
                        on={(value) => updateComponentLimit(limit.id, { notes: value })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeComponentLimit(limit.id)}
                    className="tap-target mt-2 rounded-sm border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5"
                  >
                    Remove component
                  </button>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={addComponentLimit}
              className="tap-target rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              Add component limit
            </button>
          </div>
        </div>
      </details>

      <details className="rounded-sm border bg-background p-3">
        <summary className="cursor-pointer text-xs font-medium">Issue validation</summary>
        <div className="mt-3 space-y-2">
          {issueValidation.issues.length === 0 ? (
            <div className="rounded-sm border border-compliant/30 bg-compliant/10 p-2 text-xs text-muted-foreground">
              No issue blockers detected by the screening gate.
            </div>
          ) : (
            issueValidation.issues.slice(0, 6).map((issue) => (
              <div key={issue.title} className="rounded-sm border p-2 text-xs">
                <div className="font-semibold">{issue.title}</div>
                <p className="mt-1 text-muted-foreground">{issue.message}</p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Action:</span> {issue.action}
                </p>
              </div>
            ))
          )}
        </div>
      </details>

      {lastRevision && (
        <div className="rounded-sm border bg-muted/40 p-2 text-xs text-muted-foreground">
          Last saved revision {lastRevision.revision}: {lastRevision.summary} |{" "}
          {lastRevision.basisHash}
        </div>
      )}
    </section>
  );
}

function DesignCasePanel({
  options,
  currentProject,
  onApply,
}: {
  options: ReturnType<typeof generatePipelineDesignOptions>;
  currentProject: ReturnType<typeof useProjects>["projects"][number];
  onApply: (option: ReturnType<typeof generatePipelineDesignOptions>[number]) => void;
}) {
  const best = options[0];
  if (!best) return null;
  return (
    <section aria-labelledby="design-assistant-title" className="app-card mb-4 space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" aria-hidden="true" />
            <h4 id="design-assistant-title" className="text-sm font-semibold">
              Pipeline Design Assistant
            </h4>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Ranked EPC-style design cases across standard OD, wall schedule, and line-pipe material.
            This replaces spreadsheet trial-and-error with a defensible screening shortlist.
          </p>
        </div>
        <span
          role="status"
          className={`rounded-sm border px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${
            best.status === "recommended"
              ? "border-compliant/30 bg-compliant/10 text-compliant"
              : best.status === "review"
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          best: {best.status}
        </span>
      </div>

      <div className="rounded-sm border border-primary/20 bg-primary/5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              Recommended case: NPS {best.nps} / {best.schedule} / {best.materialGrade}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              OD {best.od_mm} mm, wall {best.wall_mm} mm, MAOP {best.maop_MPa} MPa, hydrotest{" "}
              {best.hydrotest_MPa} MPa
            </div>
          </div>
          <button
            type="button"
            onClick={() => onApply(best)}
            disabled={best.status === "not-suitable"}
            className="tap-target rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Apply Best Case
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Req. wall" value={`${best.requiredWall_mm} mm`} />
          <Metric label="Velocity" value={`${best.velocity_ms} m/s`} />
          <Metric label="Drop" value={`${best.pressureDrop_MPaKm} MPa/km`} />
          <Metric label="Score" value={`${best.score}`} />
        </div>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground list-disc list-inside">
          {best.why.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <details className="rounded-sm border bg-background p-3">
        <summary className="cursor-pointer text-xs font-medium">
          Compare design cases against current basis ({currentProject.materialGrade})
        </summary>
        <div className="mt-3 grid gap-2">
          {options.slice(0, 5).map((option) => (
            <div key={option.id} className="rounded-sm border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    NPS {option.nps} / {option.schedule} / {option.materialGrade}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Wall {option.wall_mm} mm | MAOP {option.maop_MPa} MPa | velocity{" "}
                    {option.velocity_ms} m/s | drop {option.pressureDrop_MPaKm} MPa/km
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onApply(option)}
                  disabled={option.status === "not-suitable"}
                  className="tap-target rounded-sm border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{option.tradeoffs[0]}</p>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

type HeadingStatus = "fail" | "warning" | "ok" | undefined;

function getTabStatuses({
  t,
  mp,
  hy,
  pd,
  ve,
  hs,
  erosion,
  vp,
  surge,
  materialRecommendations,
  selectedMaterialGrade,
}: {
  t: CalcResult | null;
  mp: CalcResult | null;
  hy: CalcResult | null;
  pd: CalcResult | null;
  ve: CalcResult | null;
  hs: CalcResult | null;
  erosion: CalcResult | null;
  vp: CalcResult;
  surge: CalcResult;
  materialRecommendations: ReturnType<typeof recommendMaterials>;
  selectedMaterialGrade: string;
}): Record<(typeof TABS)[number], HeadingStatus> {
  const selectedMaterial = materialRecommendations.find(
    (item) => item.grade === selectedMaterialGrade,
  );
  return {
    "Wall Thickness": resultHeadingStatus(t),
    MAOP: resultHeadingStatus(mp),
    Hydrotest: hy ? undefined : "warning",
    Sizing: undefined,
    "Pressure Drop": resultHeadingStatus(pd),
    Velocity: resultHeadingStatus(ve),
    "Hoop Stress": resultHeadingStatus(hs),
    "Erosion Velocity": resultHeadingStatus(erosion),
    "Vapor Pressure": resultHeadingStatus(vp),
    "Surge Margin": resultHeadingStatus(surge),
    "Design Factor": undefined,
    "Material Recommendation":
      selectedMaterial?.status === "not-suitable"
        ? "fail"
        : selectedMaterial?.status === "review" || !selectedMaterial
          ? "warning"
          : undefined,
  };
}

function resultHeadingStatus(result: CalcResult | null): HeadingStatus {
  if (!result) return "warning";
  if (result.pass === false) return "fail";
  return undefined;
}

function CalculationHeadingStatus({ status }: { status: HeadingStatus }) {
  if (!status) return null;
  const isFail = status === "fail";
  return (
    <span
      className={`status-dot inline-grid size-4 place-items-center rounded-full border ${
        isFail
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-warning/50 bg-warning/15 text-warning"
      }`}
      title={isFail ? "Failing calculation" : "Needs input or review"}
      aria-label={isFail ? "Failing calculation" : "Needs input or review"}
    >
      <AlertTriangle className="size-3" aria-hidden="true" />
      <span className="sr-only">{isFail ? "Failing calculation" : "Needs input or review"}</span>
    </span>
  );
}

function buildOptimizations({
  p,
  F,
  smys,
  Q,
  v,
  f,
  rho,
  operatingPressure,
  vaporPressure,
  surgeAllowance,
  wallResult,
  maopResult,
  velocityResult,
  pressureDropResult,
  vaporResult,
  surgeResult,
  materialRecommendations,
  upsert,
  setSmys,
  setQ,
  setV,
  setOperatingPressure,
  setSurgeAllowance,
  acknowledge,
}: {
  p: ReturnType<typeof useProjects>["projects"][number];
  F: number;
  smys: number;
  Q: number;
  v: number;
  f: number;
  rho: number;
  operatingPressure: number;
  vaporPressure: number;
  surgeAllowance: number;
  wallResult: CalcResult | null;
  maopResult: CalcResult | null;
  velocityResult: CalcResult | null;
  pressureDropResult: CalcResult | null;
  vaporResult: CalcResult;
  surgeResult: CalcResult;
  materialRecommendations: ReturnType<typeof recommendMaterials>;
  upsert: (next: typeof p) => void;
  setSmys: (value: number) => void;
  setQ: (value: number) => void;
  setV: (value: number) => void;
  setOperatingPressure: (value: number) => void;
  setSurgeAllowance: (value: number) => void;
  acknowledge: (message: string) => void;
}) {
  const items: Optimization[] = [];
  const selectedPipe = pipeSizeByOd(p.outsideDiameter_mm);
  const selectedMaterial =
    MATERIAL_OPTIONS.find((material) => material.grade === p.materialGrade) ?? MATERIAL_OPTIONS[1];
  const nextWall =
    wallResult &&
    selectedPipe.commonSchedules.find((schedule) => schedule.wall_mm >= wallResult.value);
  const bestMaterial = materialRecommendations.find((item) => item.status === "recommended");
  const hydraulicLimits = serviceHydraulicLimits(p);
  const largerPipeForVelocity = PIPE_SIZE_OPTIONS.find((size) => {
    if (!p.outsideDiameter_mm || size.od_mm <= p.outsideDiameter_mm) return false;
    const candidateWall =
      size.commonSchedules.find(
        (schedule) => !p.wallThickness_mm || schedule.wall_mm >= p.wallThickness_mm,
      ) ?? size.commonSchedules[0];
    const candidateId = internalDiameter({
      outsideDiameter_mm: size.od_mm,
      wallThickness_mm: candidateWall.wall_mm,
    });
    return (
      velocity({ Q_m3s: Q, D_mm: candidateId, max_ms: hydraulicLimits.maxVelocity_ms }).pass !==
      false
    );
  });
  const largerPipeForDrop = PIPE_SIZE_OPTIONS.find((size) => {
    if (!p.outsideDiameter_mm || size.od_mm <= p.outsideDiameter_mm) return false;
    const candidateWall =
      size.commonSchedules.find(
        (schedule) => !p.wallThickness_mm || schedule.wall_mm >= p.wallThickness_mm,
      ) ?? size.commonSchedules[0];
    const candidateId = internalDiameter({
      outsideDiameter_mm: size.od_mm,
      wallThickness_mm: candidateWall.wall_mm,
    });
    const trialVelocity = velocity({ Q_m3s: Q, D_mm: candidateId }).value;
    return (
      pressureDrop({
        f,
        D_mm: candidateId,
        rho_kgm3: rho,
        v_ms: trialVelocity,
        maxDrop_MPa: hydraulicLimits.maxDrop_MPaKm,
      }).pass !== false
    );
  });

  if (wallResult?.pass === false || maopResult?.pass === false) {
    if (nextWall && nextWall.wall_mm !== p.wallThickness_mm) {
      items.push({
        id: "wall-schedule",
        title: "Use next adequate wall schedule",
        priority: "critical",
        current: `${p.wallThickness_mm ?? "No wall"} mm`,
        recommended: `${nextWall.schedule} - ${nextWall.wall_mm} mm`,
        reason:
          "Pressure containment and MAOP should be restored by increasing metal thickness before relaxing any safety factor.",
        effect:
          "Raises pressure capacity, improves hoop stress margin, and keeps class-location design factor unchanged.",
        apply: () => {
          upsert({ ...p, wallThickness_mm: nextWall.wall_mm });
          acknowledge(
            `Applied ${nextWall.schedule} wall (${nextWall.wall_mm} mm). Re-checking calculations.`,
          );
        },
      });
    }
    if (bestMaterial && bestMaterial.grade !== selectedMaterial.grade) {
      const localMaterial = MATERIAL_OPTIONS.find(
        (material) => material.grade === bestMaterial.grade,
      );
      items.push({
        id: "material-grade",
        title: "Select stronger qualified pipe material",
        priority: "recommended",
        current: `${selectedMaterial.grade} / ${smys} MPa SMYS`,
        recommended: `${bestMaterial.grade} / ${bestMaterial.smys_MPa} MPa SMYS`,
        reason:
          "A stronger grade can reduce required pressure wall, but it must still pass toughness, welding, fracture, and service qualification.",
        effect:
          "Improves wall-thickness and MAOP screening without changing route class or corrosion allowance.",
        apply: localMaterial
          ? () => {
              setSmys(localMaterial.smys_MPa);
              upsert({ ...p, materialGrade: localMaterial.grade });
              acknowledge(
                `Applied ${localMaterial.grade}. Confirm toughness, weldability, and service qualification.`,
              );
            }
          : undefined,
      });
    }
  }

  if (velocityResult?.pass === false && largerPipeForVelocity) {
    items.push({
      id: "velocity-od",
      title: "Increase OD to reduce velocity",
      priority: "critical",
      current: `${p.outsideDiameter_mm} mm OD, ${velocityResult.value} m/s`,
      recommended: `NPS ${largerPipeForVelocity.nps} - OD ${largerPipeForVelocity.od_mm} mm`,
      reason:
        "Velocity is reduced most cleanly by increasing flow area; this avoids pretending the demanded throughput disappeared.",
      effect:
        "Reduces erosion/noise/surge tendency and should also lower pressure drop after re-checking wall thickness.",
      apply: () => {
        const nextWallForNewOd =
          largerPipeForVelocity.commonSchedules.find(
            (schedule) => !p.wallThickness_mm || schedule.wall_mm >= p.wallThickness_mm,
          ) ?? largerPipeForVelocity.commonSchedules[0];
        upsert({
          ...p,
          outsideDiameter_mm: largerPipeForVelocity.od_mm,
          wallThickness_mm: nextWallForNewOd.wall_mm,
        });
        acknowledge(
          `Applied NPS ${largerPipeForVelocity.nps}. Re-check wall thickness and MAOP for the larger OD.`,
        );
      },
    });
  }

  if (pressureDropResult?.pass === false) {
    if (largerPipeForDrop) {
      items.push({
        id: "pressure-drop-od",
        title: "Increase OD to reduce pressure drop",
        priority: "critical",
        current: `${pressureDropResult.value} MPa/km`,
        recommended: `NPS ${largerPipeForDrop.nps} - OD ${largerPipeForDrop.od_mm} mm`,
        reason:
          "Hydraulic loss is driven strongly by velocity and diameter; upsizing is the most defensible first screening move.",
        effect:
          "Lowers pressure loss and operating energy demand, then requires wall, MAOP, and cost re-checks.",
        apply: () => {
          const nextWallForNewOd =
            largerPipeForDrop.commonSchedules.find(
              (schedule) => !p.wallThickness_mm || schedule.wall_mm >= p.wallThickness_mm,
            ) ?? largerPipeForDrop.commonSchedules[0];
          upsert({
            ...p,
            outsideDiameter_mm: largerPipeForDrop.od_mm,
            wallThickness_mm: nextWallForNewOd.wall_mm,
          });
          acknowledge(
            `Applied NPS ${largerPipeForDrop.nps}. Re-check hydraulic and pressure design together.`,
          );
        },
      });
    }
    if (v > 2) {
      items.push({
        id: "pressure-drop-target-velocity",
        title: "Use conservative target velocity",
        priority: "recommended",
        current: `${v} m/s target`,
        recommended: "2 m/s target",
        reason:
          "Lower target velocity is a normal early-design move when pressure drop or erosional service is unfavorable.",
        effect:
          "Increases the calculated minimum ID and guides the engineer toward a larger standard NPS.",
        apply: () => {
          setV(2);
          acknowledge(
            "Applied 2 m/s target velocity. Select the next standard NPS above the sizing result.",
          );
        },
      });
    }
  }

  if (vaporResult.pass === false) {
    const requiredOperatingPressure = round(vaporPressure + 0.1, 2);
    items.push({
      id: "vapor-pressure-margin",
      title: "Raise minimum operating pressure margin",
      priority: requiredOperatingPressure <= p.designPressure_MPa ? "critical" : "study",
      current: `${operatingPressure} MPa operating vs ${vaporPressure} MPa vapor pressure`,
      recommended: `${requiredOperatingPressure} MPa minimum operating pressure`,
      reason:
        "The fluid property should not be changed to force a pass; the defensible controls are pressure, temperature, route high points, and pump/control philosophy.",
      effect:
        "Restores flashing/cavitation margin if the required operating pressure remains inside the design envelope.",
      apply:
        requiredOperatingPressure <= p.designPressure_MPa
          ? () => {
              setOperatingPressure(requiredOperatingPressure);
              acknowledge(
                "Applied minimum operating pressure margin. Confirm the full hydraulic profile.",
              );
            }
          : undefined,
    });
  }

  if (surgeResult.pass === false) {
    const peak = round(operatingPressure + surgeAllowance, 2);
    const recommendedDesignPressure = round(peak * 1.1, 2);
    items.push({
      id: "surge-design-pressure",
      title: "Align design pressure with transient peak",
      priority: "critical",
      current: `${p.designPressure_MPa} MPa design pressure`,
      recommended: `${recommendedDesignPressure} MPa design pressure`,
      reason:
        "When surge exceeds the design envelope, the professional fix is to redesign the pressure envelope or reduce the transient source, not ignore the transient.",
      effect:
        "Creates a 10% screening margin over the surge peak; wall thickness, MAOP, and hydrotest must be recalculated.",
      apply: () => {
        upsert({ ...p, designPressure_MPa: recommendedDesignPressure });
        acknowledge(
          "Raised design pressure for surge screening. Re-run wall, MAOP, and hydrotest.",
        );
      },
    });
    if (surgeAllowance > p.designPressure_MPa * 0.1) {
      const reducedSurge = round(p.designPressure_MPa * 0.1, 2);
      items.push({
        id: "surge-control",
        title: "Screen a controlled surge allowance",
        priority: "study",
        current: `${surgeAllowance} MPa surge allowance`,
        recommended: `${reducedSurge} MPa with slower closure / relief controls`,
        reason:
          "Surge can sometimes be reduced by valve timing, pump trip logic, relief, or control changes, but this needs transient analysis.",
        effect:
          "Shows the operating effect of a surge-control philosophy without claiming it is proven.",
        apply: () => {
          setSurgeAllowance(reducedSurge);
          acknowledge(
            "Applied controlled surge allowance for screening. Validate with transient analysis.",
          );
        },
      });
    }
  }

  if (p.MAOP_MPa && p.hydrotestPressure_MPa && p.hydrotestPressure_MPa < p.MAOP_MPa * 1.25) {
    const testPressure = round(p.MAOP_MPa * 1.25, 2);
    items.push({
      id: "hydrotest-pressure",
      title: "Set minimum hydrotest pressure basis",
      priority: "critical",
      current: `${p.hydrotestPressure_MPa} MPa`,
      recommended: `${testPressure} MPa`,
      reason:
        "Hydrotest pressure should prove the operating pressure envelope before operation, subject to stress and component limits.",
      effect:
        "Restores the screening test ratio, then requires test-pack elevation and weakest-component review.",
      apply: () => {
        upsert({ ...p, hydrotestPressure_MPa: testPressure });
        acknowledge(
          "Applied hydrotest screening pressure. Confirm test section stress and elevation head.",
        );
      },
    });
  }

  if (items.length === 0) {
    items.push({
      id: "no-auto-fix",
      title: "No automated design fix required",
      priority: "study",
      current: "Current screening checks are not failing.",
      recommended: "Proceed to documentation and independent review.",
      reason:
        "The optimizer only changes defensible design variables. It does not relax safety factors, class location, corrosion allowance, or code basis to force a pass.",
      effect: "Keeps the human engineer in control of final assurance decisions.",
    });
  }

  return items;
}

function OptimizationPanel({
  items,
  message,
  clearMessage,
}: {
  items: Optimization[];
  message: string;
  clearMessage: () => void;
}) {
  const actionable = items.filter((item) => item.apply);
  return (
    <section aria-labelledby="optimizer-title" className="app-card mb-4 space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" aria-hidden="true" />
            <h4 id="optimizer-title" className="text-sm font-semibold">
              Engineering Optimizer
            </h4>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Suggested design moves use conservative engineering logic. The app can apply allowable
            screening changes, but final acceptance still needs human review and governing code
            confirmation.
          </p>
        </div>
        <div className="rounded-sm border bg-muted px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {actionable.length} automated action{actionable.length === 1 ? "" : "s"}
        </div>
      </div>
      {message && (
        <button
          type="button"
          onClick={clearMessage}
          aria-live="polite"
          className="tap-target flex w-full items-start gap-2 rounded-sm border border-compliant/30 bg-compliant/10 p-2 text-left text-xs text-muted-foreground"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-compliant" aria-hidden="true" />
          <span>{message}</span>
        </button>
      )}
      <div className="grid gap-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="rounded-sm border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Lightbulb
                  className={`mt-0.5 size-4 shrink-0 ${
                    item.priority === "critical"
                      ? "text-destructive"
                      : item.priority === "recommended"
                        ? "text-warning"
                        : "text-primary"
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    <span className="font-mono">Now:</span> {item.current}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-mono">Recommend:</span> {item.recommended}
                  </div>
                </div>
              </div>
              {item.apply && (
                <button
                  type="button"
                  onClick={item.apply}
                  className="tap-target rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Apply
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Expected effect:</span> {item.effect}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MaterialRecommendationPanel({
  recommendations,
}: {
  recommendations: ReturnType<typeof recommendMaterials>;
}) {
  return (
    <section aria-labelledby="material-recommendation-title" className="app-card space-y-3 p-4">
      <div>
        <h4 id="material-recommendation-title" className="text-sm font-semibold">
          Pipe Material Recommendation
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Screening recommendation based on pressure design, selected wall, class factor, corrosion
          allowance, and service warnings.
        </p>
      </div>
      <div className="grid gap-3">
        {recommendations.map((item) => (
          <div key={item.grade} className="rounded-sm border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{item.grade}</div>
                <div className="text-xs font-mono text-muted-foreground">
                  SMYS {item.smys_MPa} MPa
                </div>
              </div>
              <span
                role="status"
                className={`rounded-sm border px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${
                  item.status === "recommended"
                    ? "border-compliant/30 bg-compliant/10 text-compliant"
                    : item.status === "not-suitable"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-warning/30 bg-warning/10 text-warning"
                }`}
              >
                {item.status.replace("-", " ")}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Metric label="Required wall" value={`${item.requiredWall_mm} mm`} />
              <Metric label="Utilization" value={`${item.utilizationPct}%`} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{item.why}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside">
              {item.actions.slice(0, 3).map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm bg-muted p-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="break-words font-mono text-sm">{value}</div>
    </div>
  );
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  on,
}: {
  label: string;
  checked: boolean;
  on: (checked: boolean) => void;
}) {
  return (
    <label className="tap-target flex items-center justify-between gap-3 rounded-sm border bg-background px-2 py-2 text-xs">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => on(event.target.checked)}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}

function DualUnitInput({
  label,
  kind,
  value,
  on,
}: {
  label: string;
  kind: "pressure" | "length";
  value: number;
  on: (n: number) => void;
}) {
  const secondary = kind === "pressure" ? mpaToPsi(value) : mmToIn(value);
  const primaryUnit = kind === "pressure" ? "MPa" : "mm";
  const secondaryUnit = kind === "pressure" ? "psi" : "in";
  return (
    <div className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-0.5 grid gap-2 sm:grid-cols-2">
        <label className="relative">
          <span className="sr-only">
            {label} in {primaryUnit}
          </span>
          <input
            type="number"
            step={kind === "pressure" ? 0.01 : 0.1}
            value={value}
            onChange={(e) => on(Number(e.target.value))}
            className="w-full rounded-sm border bg-background px-2 py-2 pr-11 font-mono"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {primaryUnit}
          </span>
        </label>
        <label className="relative">
          <span className="sr-only">
            {label} in {secondaryUnit}
          </span>
          <input
            type="number"
            step={kind === "pressure" ? 1 : 0.01}
            value={secondary}
            onChange={(e) =>
              on(
                kind === "pressure"
                  ? psiToMpa(Number(e.target.value))
                  : inToMm(Number(e.target.value)),
              )
            }
            className="w-full rounded-sm border bg-background px-2 py-2 pr-9 font-mono"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {secondaryUnit}
          </span>
        </label>
      </div>
    </div>
  );
}

function Sm({
  label,
  value,
  on,
  step = 1,
}: {
  label: string;
  value: number;
  on: (n: number) => void;
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
        onChange={(e) => on(Number(e.target.value))}
        className="mt-0.5 w-full rounded-sm border bg-background px-2 py-2 font-mono"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  on,
}: {
  label: string;
  value: string;
  on: (value: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => on(event.target.value)}
        className="mt-0.5 w-full rounded-sm border bg-background px-2 py-2"
      />
    </label>
  );
}

function CustomMaterialSelect({
  grade,
  smys,
  on,
}: {
  grade: string;
  smys: number;
  on: (grade: string, smys: number) => void;
}) {
  const matched = MATERIAL_OPTIONS.some((material) => material.grade === grade);
  const [customMode, setCustomMode] = useState(!matched);
  const showCustom = customMode || !matched;

  return (
    <div className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        Material SMYS
      </span>
      <div className="mt-0.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.55fr)]">
        <select
          aria-label="Material SMYS"
          value={showCustom ? "__custom__" : grade}
          onChange={(event) => {
            if (event.target.value === "__custom__") {
              setCustomMode(true);
              return;
            }
            const next = MATERIAL_OPTIONS.find((material) => material.grade === event.target.value);
            if (!next) return;
            setCustomMode(false);
            on(next.grade, next.smys_MPa);
          }}
          className="w-full rounded-sm border bg-background px-2 py-2 font-mono"
        >
          {MATERIAL_OPTIONS.map((material) => (
            <option key={material.grade} value={material.grade}>
              {material.grade} - {material.smys_MPa} MPa
            </option>
          ))}
          <option value="__custom__">Custom value / project material</option>
        </select>
        {showCustom && (
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
            <label className="relative">
              <span className="sr-only">Custom material grade</span>
              <input
                aria-label="Custom material grade"
                type="text"
                value={grade}
                onChange={(event) => on(event.target.value, smys)}
                placeholder="Grade"
                className="w-full rounded-sm border bg-background px-2 py-2 font-mono"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Custom material SMYS in MPa</span>
              <input
                aria-label="Custom material SMYS in MPa"
                type="number"
                value={smys}
                onChange={(event) => on(grade || "Custom material", Number(event.target.value))}
                className="w-full rounded-sm border bg-background px-2 py-2 pr-9 font-mono"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                MPa
              </span>
            </label>
          </div>
        )}
      </div>
      {showCustom && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Custom materials are treated as project-defined. Confirm specification, toughness,
          welding, sour-service, and procurement basis before issue.
        </p>
      )}
    </div>
  );
}

function CustomNumberSelect({
  label,
  value,
  options,
  on,
  unit,
  customLabel = "Custom value",
}: {
  label: string;
  value: number;
  options: Array<{ value: number; label: string }>;
  on: (value: number) => void;
  unit?: string;
  customLabel?: string;
}) {
  const matched = options.some((option) => nearlyEqual(option.value, value));
  const [customMode, setCustomMode] = useState(!matched);
  const showCustom = customMode || !matched;

  return (
    <div className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-0.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.45fr)]">
        <select
          aria-label={label}
          value={showCustom ? "__custom__" : String(value)}
          onChange={(event) => {
            if (event.target.value === "__custom__") {
              setCustomMode(true);
              return;
            }
            setCustomMode(false);
            on(Number(event.target.value));
          }}
          className="w-full rounded-sm border bg-background px-2 py-2 font-mono"
        >
          {options.map((option) => (
            <option key={`${label}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="__custom__">{customLabel}</option>
        </select>
        {showCustom && (
          <label className="relative">
            <span className="sr-only">
              {label} custom value{unit ? ` in ${unit}` : ""}
            </span>
            <input
              aria-label={`${label} custom value${unit ? ` in ${unit}` : ""}`}
              type="number"
              value={Number.isFinite(value) ? value : 0}
              onChange={(event) => on(Number(event.target.value))}
              className="w-full rounded-sm border bg-background px-2 py-2 pr-12 font-mono"
            />
            {unit && (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {unit}
              </span>
            )}
          </label>
        )}
      </div>
      {showCustom && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Custom value selected. Use project data or vendor/mill data, then document the source in
          the assumptions register.
        </p>
      )}
    </div>
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
  children: ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => on(e.target.value)}
        className="mt-0.5 w-full rounded-sm border bg-background px-2 py-2 font-mono"
      >
        {children}
      </select>
    </label>
  );
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.0001;
}

function mergeById<T extends { id: string }>(current: T[], defaults: T[]) {
  const existing = new Set(current.map((item) => item.id));
  return [...current, ...defaults.filter((item) => !existing.has(item.id))];
}

function Empty({ msg }: { msg: string }) {
  return <div className="border bg-card p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}

function round(n: number, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d;
}
