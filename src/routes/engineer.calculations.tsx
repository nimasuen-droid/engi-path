import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CalcResultCard } from "@/components/CalcResultCard";
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
  hoopStress,
  hydrotest,
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
import { useProjects } from "@/state/projects";

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
  "Vapor Pressure",
  "Surge Margin",
  "Design Factor",
  "Material Recommendation",
] as const;

const FLOW_PRESETS = [
  { label: "Small gathering / utility - 0.5 m3/s", q: 0.5 },
  { label: "Medium transfer - 2.0 m3/s", q: 2 },
  { label: "Large trunkline - 5.0 m3/s", q: 5 },
];
const VELOCITY_PRESETS = [
  { label: "Conservative liquid - 2 m/s", v: 2 },
  { label: "General target - 3 m/s", v: 3 },
  { label: "Upper screening - 4 m/s", v: 4 },
];
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
  const [smys, setSmys] = useState(selectedMaterial.smys_MPa);
  const [F, setF] = useState(selectedClass.designFactor);
  const [Q, setQ] = useState(2);
  const [v, setV] = useState(3);
  const [rho, setRho] = useState(850);
  const [f, setFD] = useState(0.018);
  const [operatingPressure, setOperatingPressure] = useState(
    Math.max(0.1, Number((p.designPressure_MPa * 0.8).toFixed(2))),
  );
  const [vaporPressure, setVaporPressure] = useState(0.06);
  const [surgeAllowance, setSurgeAllowance] = useState(
    Math.max(0.1, Number((p.designPressure_MPa * 0.15).toFixed(2))),
  );
  const [sourService, setSourService] = useState(false);
  const [offshoreService, setOffshoreService] = useState(false);

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
      p.outsideDiameter_mm ? velocity({ Q_m3s: Q, D_mm: p.outsideDiameter_mm, max_ms: 4 }) : null,
    [Q, p],
  );
  const pd = useMemo(
    () =>
      p.outsideDiameter_mm
        ? pressureDrop({ f, D_mm: p.outsideDiameter_mm, rho_kgm3: rho, v_ms: v, maxDrop_MPa: 0.2 })
        : null,
    [f, rho, v, p],
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

  const activeResult = getActiveResult(tab, { t, mp, hy, sz, pd, ve, hs, df, vp, surge });
  const learning = LEARNING[tab];

  function updateClass(value: 1 | 2 | 3 | 4) {
    const next = classLocation(value);
    setF(next.designFactor);
    void upsert({ ...p, classLocation: value });
  }

  return (
    <div className="space-y-4">
      <div className="touch-scroll flex gap-1 overflow-x-auto border-b">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`tap-target whitespace-nowrap border-b-2 px-3 py-2 text-xs -mb-px ${tab === item ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)_minmax(280px,0.8fr)]">
        <div className="app-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Validated Inputs
            </div>
            <LessonPopover
              title="Calculation workflow"
              why="The calculated result is only as reliable as the design basis feeding it."
              how="Pick standard OD/NPS, wall schedule, pressure, fluid data, material strength, class location, corrosion allowance, and operating/transient cases before interpreting pass/fail results."
              drivenBy="Pressure, OD, SMYS, wall, design factor, corrosion allowance, flow, density, vapor pressure, surge allowance, and route consequence."
              codeRef="ASME B31.4/B31.8 summarized design practice"
            />
          </div>
          <Select
            label="OD / NPS"
            value={String(p.outsideDiameter_mm ?? selectedPipe.od_mm)}
            on={(value) => upsert({ ...p, outsideDiameter_mm: Number(value) })}
          >
            {PIPE_SIZE_OPTIONS.map((size) => (
              <option key={size.nps} value={size.od_mm}>
                NPS {size.nps} - OD {size.od_mm} mm
              </option>
            ))}
          </Select>
          <Select
            label="Wall Thickness / Schedule"
            value={String(p.wallThickness_mm ?? "")}
            on={(value) => upsert({ ...p, wallThickness_mm: Number(value) })}
          >
            <option value="">Select wall</option>
            {selectedPipe.commonSchedules.map((s) => (
              <option key={s.schedule} value={s.wall_mm}>
                {s.schedule} - {s.wall_mm} mm
              </option>
            ))}
          </Select>
          <Sm
            label="Design Pressure (MPa)"
            value={p.designPressure_MPa}
            on={(n) => upsert({ ...p, designPressure_MPa: n })}
            step={0.01}
          />
          <Sm
            label="Operating Pressure (MPa)"
            value={operatingPressure}
            on={setOperatingPressure}
            step={0.01}
          />
          <Select
            label="Fluid Vapor Pressure"
            value={String(vaporPressure)}
            on={(value) => setVaporPressure(Number(value))}
          >
            {VAPOR_PRESETS.map((preset) => (
              <option key={preset.vp} value={preset.vp}>
                {preset.label}
              </option>
            ))}
          </Select>
          <Sm
            label="Surge Allowance (MPa)"
            value={surgeAllowance}
            on={setSurgeAllowance}
            step={0.01}
          />
          <Sm
            label="Corrosion Allowance (mm)"
            value={p.corrosionAllowance_mm}
            on={(n) => upsert({ ...p, corrosionAllowance_mm: n })}
            step={0.1}
          />
          <Select label="Material SMYS" value={String(smys)} on={(value) => setSmys(Number(value))}>
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m.grade} value={m.smys_MPa}>
                {m.grade} - {m.smys_MPa} MPa
              </option>
            ))}
          </Select>
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
          <Sm
            label="MAOP (MPa)"
            value={p.MAOP_MPa ?? 0}
            on={(n) => upsert({ ...p, MAOP_MPa: n })}
            step={0.01}
          />
          <Sm
            label="Hydrotest (MPa)"
            value={p.hydrotestPressure_MPa ?? 0}
            on={(n) => upsert({ ...p, hydrotestPressure_MPa: n })}
            step={0.01}
          />
          <Toggle label="Sour service / H2S risk" checked={sourService} on={setSourService} />
          <Toggle
            label="Offshore / subsea exposure"
            checked={offshoreService}
            on={setOffshoreService}
          />
          <div className="space-y-3 border-t border-border pt-2">
            <Select label="Flow Q" value={String(Q)} on={(value) => setQ(Number(value))}>
              {FLOW_PRESETS.map((preset) => (
                <option key={preset.q} value={preset.q}>
                  {preset.label}
                </option>
              ))}
            </Select>
            <Select label="Target velocity" value={String(v)} on={(value) => setV(Number(value))}>
              {VELOCITY_PRESETS.map((preset) => (
                <option key={preset.v} value={preset.v}>
                  {preset.label}
                </option>
              ))}
            </Select>
            <Select label="Density" value={String(rho)} on={(value) => setRho(Number(value))}>
              {DENSITY_PRESETS.map((preset) => (
                <option key={preset.rho} value={preset.rho}>
                  {preset.label}
                </option>
              ))}
            </Select>
            <Select
              label="Darcy friction factor"
              value={String(f)}
              on={(value) => setFD(Number(value))}
            >
              {FRICTION_PRESETS.map((preset) => (
                <option key={preset.f} value={preset.f}>
                  {preset.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          {tab === "Wall Thickness" &&
            (t ? (
              <CalcResultCard title="Wall Thickness" result={t} />
            ) : (
              <Empty msg="Set OD to compute." />
            ))}
          {tab === "MAOP" &&
            (mp ? (
              <CalcResultCard title="MAOP" result={mp} />
            ) : (
              <Empty msg="Set OD and t to compute." />
            ))}
          {tab === "Hydrotest" &&
            (hy ? (
              <CalcResultCard title="Recommended Hydrotest" result={hy} />
            ) : (
              <Empty msg="Set MAOP to compute." />
            ))}
          {tab === "Sizing" && <CalcResultCard title="Min. ID for target velocity" result={sz} />}
          {tab === "Pressure Drop" &&
            (pd ? (
              <CalcResultCard title="Pressure Drop / km" result={pd} />
            ) : (
              <Empty msg="Set OD to compute." />
            ))}
          {tab === "Velocity" &&
            (ve ? (
              <CalcResultCard title="Fluid Velocity" result={ve} />
            ) : (
              <Empty msg="Set OD to compute." />
            ))}
          {tab === "Hoop Stress" &&
            (hs ? (
              <CalcResultCard title="Hoop Stress" result={hs} />
            ) : (
              <Empty msg="Set OD and t to compute." />
            ))}
          {tab === "Vapor Pressure" && <CalcResultCard title="Vapor Pressure Margin" result={vp} />}
          {tab === "Surge Margin" && (
            <CalcResultCard title="Transient Surge Screening" result={surge} />
          )}
          {tab === "Design Factor" && (
            <CalcResultCard title={`Class ${p.classLocation ?? 1} Design Factor`} result={df} />
          )}
          {tab === "Material Recommendation" && (
            <MaterialRecommendationPanel recommendations={materialRecommendations} />
          )}
        </div>

        <aside className="app-card h-fit space-y-3 p-4">
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
    "Vapor Pressure": results.vp,
    "Surge Margin": results.surge,
    "Design Factor": results.df,
  };
  return map[tab] ?? null;
}

function MaterialRecommendationPanel({
  recommendations,
}: {
  recommendations: ReturnType<typeof recommendMaterials>;
}) {
  return (
    <div className="border bg-card p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold">Pipe Material Recommendation</h4>
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
                className={`rounded-sm border px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${
                  item.status === "recommended"
                    ? "border-success/30 bg-success/10 text-success"
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
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-muted p-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm">{value}</div>
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
    <label className="flex items-center justify-between gap-3 rounded-sm border bg-background px-2 py-2 text-xs">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => on(event.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
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

function Empty({ msg }: { msg: string }) {
  return <div className="border bg-card p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}
