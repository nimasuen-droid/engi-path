import { MATERIAL_OPTIONS, PIPE_SIZE_OPTIONS } from "@/data/standards";
import type { Project } from "@/models";
import {
  hydrotest,
  internalDiameter,
  maop,
  pressureDrop,
  velocity,
  wallThickness,
} from "@/services/calculations";

export interface DesignCaseInput {
  project: Project;
  designFactor: number;
  flow_m3s: number;
  targetVelocity_ms: number;
  density_kgm3: number;
  frictionFactor: number;
  operatingPressure_MPa: number;
  surgeAllowance_MPa: number;
}

export interface PipelineDesignOption {
  id: string;
  od_mm: number;
  nps: string;
  schedule: string;
  wall_mm: number;
  materialGrade: string;
  smys_MPa: number;
  requiredWall_mm: number;
  maop_MPa: number;
  hydrotest_MPa: number;
  velocity_ms: number;
  pressureDrop_MPaKm: number;
  surgePeak_MPa: number;
  status: "recommended" | "review" | "not-suitable";
  score: number;
  why: string[];
  tradeoffs: string[];
  nextChecks: string[];
}

const MIN_WALL_MARGIN_PCT = 10;

export function generatePipelineDesignOptions(input: DesignCaseInput): PipelineDesignOption[] {
  const p = input.project;
  const surgePeak = input.operatingPressure_MPa + input.surgeAllowance_MPa;
  const hydraulicLimits = serviceHydraulicLimits(p);

  return PIPE_SIZE_OPTIONS.flatMap((size) =>
    size.commonSchedules.flatMap((schedule) =>
      MATERIAL_OPTIONS.map((material) => {
        const required = wallThickness({
          designPressure_MPa: p.designPressure_MPa,
          outsideDiameter_mm: size.od_mm,
          SMYS_MPa: material.smys_MPa,
          designFactor: input.designFactor,
          corrosionAllowance_mm: p.corrosionAllowance_mm,
          selectedWall_mm: schedule.wall_mm,
        });
        const derivedMaop = maop({
          wallThickness_mm: schedule.wall_mm,
          outsideDiameter_mm: size.od_mm,
          SMYS_MPa: material.smys_MPa,
          designFactor: input.designFactor,
          corrosionAllowance_mm: p.corrosionAllowance_mm,
          limit_MPa: p.designPressure_MPa,
        });
        const hydraulicId = internalDiameter({
          outsideDiameter_mm: size.od_mm,
          wallThickness_mm: schedule.wall_mm,
        });
        const vel = velocity({
          Q_m3s: input.flow_m3s,
          D_mm: hydraulicId,
          max_ms: hydraulicLimits.maxVelocity_ms,
        });
        const drop = pressureDrop({
          f: input.frictionFactor,
          D_mm: hydraulicId,
          rho_kgm3: input.density_kgm3,
          v_ms: vel.value,
          maxDrop_MPa: hydraulicLimits.maxDrop_MPaKm,
        });
        const test = hydrotest({
          MAOP_MPa: Math.min(derivedMaop.value, p.designPressure_MPa),
          SMYS_MPa: material.smys_MPa,
          D_mm: size.od_mm,
          t_mm: schedule.wall_mm,
          cap_pctSMYS: 90,
        });

        const wallMarginPct = ((schedule.wall_mm - required.value) / required.value) * 100;
        const failures = [
          required.pass === false,
          derivedMaop.pass === false,
          vel.pass === false,
          drop.pass === false,
          surgePeak > p.designPressure_MPa,
        ].filter(Boolean).length;
        const reviewFlags = [
          wallMarginPct < MIN_WALL_MARGIN_PCT,
          drop.value > hydraulicLimits.maxDrop_MPaKm * 0.85,
          material.grade.includes("X70") && !!p.sourService,
          p.installationType === "offshore" || p.installationType === "subsea",
          p.fluidType === "hydrogen" || p.fluidType === "co2",
        ].filter(Boolean).length;
        const sizePenalty = pipeSizePenalty(size.od_mm, p.outsideDiameter_mm);

        const status = failures > 0 ? "not-suitable" : reviewFlags > 0 ? "review" : "recommended";
        const score =
          100 -
          failures * 35 -
          reviewFlags * 8 -
          Math.max(0, vel.value - input.targetVelocity_ms) * 4 -
          Math.max(0, drop.value - hydraulicLimits.maxDrop_MPaKm) * 60 +
          Math.min(12, Math.max(0, wallMarginPct / 3)) -
          sizePenalty;

        return {
          id: `${size.nps}-${schedule.schedule}-${material.grade}`,
          od_mm: size.od_mm,
          nps: size.nps,
          schedule: schedule.schedule,
          wall_mm: schedule.wall_mm,
          materialGrade: material.grade,
          smys_MPa: material.smys_MPa,
          requiredWall_mm: required.value,
          maop_MPa: derivedMaop.value,
          hydrotest_MPa: test.value,
          velocity_ms: vel.value,
          pressureDrop_MPaKm: drop.value,
          surgePeak_MPa: round(surgePeak, 3),
          status,
          score: Math.round(score),
          why: buildWhy(
            status,
            wallMarginPct,
            vel.value,
            drop.value,
            surgePeak,
            p.designPressure_MPa,
            hydraulicLimits.maxVelocity_ms,
            hydraulicLimits.maxDrop_MPaKm,
          ),
          tradeoffs: buildTradeoffs(
            size.od_mm,
            p.outsideDiameter_mm,
            material.grade,
            p.materialGrade,
          ),
          nextChecks: buildNextChecks(p),
        };
      }),
    ),
  )
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.score - a.score)
    .slice(0, 8);
}

function buildWhy(
  status: PipelineDesignOption["status"],
  wallMarginPct: number,
  velocity_ms: number,
  pressureDrop_MPaKm: number,
  surgePeak_MPa: number,
  designPressure_MPa: number,
  maxVelocity_ms: number,
  maxDrop_MPaKm: number,
) {
  const why = [
    `Wall margin is ${round(wallMarginPct, 1)}% above required pressure wall.`,
    `Velocity screens at ${round(velocity_ms, 2)} m/s against a service limit of ${maxVelocity_ms} m/s.`,
    `Pressure drop screens at ${round(pressureDrop_MPaKm, 3)} MPa/km against a service limit of ${maxDrop_MPaKm} MPa/km.`,
  ];
  if (surgePeak_MPa > designPressure_MPa) {
    why.push(
      `Surge peak ${round(surgePeak_MPa, 2)} MPa exceeds design pressure ${designPressure_MPa} MPa.`,
    );
  } else {
    why.push("Surge peak remains inside the current design-pressure envelope.");
  }
  if (status === "recommended") why.push("No screening failure is present in this design case.");
  if (status === "review")
    why.push("This option is workable but needs specialist review before issue.");
  if (status === "not-suitable")
    why.push("One or more screening checks fails; do not issue this case without redesign.");
  return why;
}

function buildTradeoffs(
  od_mm: number,
  currentOd?: number,
  material?: string,
  currentMaterial?: string,
) {
  const tradeoffs = [];
  if (currentOd && od_mm > currentOd)
    tradeoffs.push(
      "Larger OD lowers velocity and hydraulic loss but increases pipe cost, weight, crossings, and installation impact.",
    );
  if (currentOd && od_mm < currentOd)
    tradeoffs.push(
      "Smaller OD may reduce material cost but can increase velocity, pressure drop, surge, and operating cost.",
    );
  if (material && currentMaterial && material !== currentMaterial)
    tradeoffs.push(
      "Changing material grade requires specification, availability, welding, toughness, and service-compatibility review.",
    );
  if (tradeoffs.length === 0)
    tradeoffs.push(
      "Closest to the current basis; verify constructability and procurement availability.",
    );
  return tradeoffs;
}

function buildNextChecks(p: Project) {
  const checks = [
    "Confirm actual internal diameter from selected schedule and mill tolerance.",
    "Run detailed hydraulics with route elevation, fittings, roughness, and operating envelope.",
    "Confirm hydrotest section elevation head and weakest component rating.",
    "Document material toughness, weldability, fracture, and project specification requirements.",
  ];
  if (p.sourService)
    checks.push("Complete NACE MR0175 / ISO 15156 sour-service material qualification.");
  if (p.installationType === "offshore" || p.installationType === "subsea")
    checks.push("Complete DNV-ST-F101 collapse, buckling, free-span, and installation load cases.");
  if (p.fluidType === "co2")
    checks.push(
      "Complete CO2 phase envelope, impurity, decompression, and fracture-arrest review.",
    );
  if (p.fluidType === "hydrogen")
    checks.push("Complete hydrogen material performance, fatigue, fracture, and leakage review.");
  return checks;
}

function statusRank(status: PipelineDesignOption["status"]) {
  return status === "recommended" ? 0 : status === "review" ? 1 : 2;
}

function serviceHydraulicLimits(p: Project) {
  if (p.fluidType === "gas" || p.fluidType === "hydrogen") {
    return { maxVelocity_ms: 20, maxDrop_MPaKm: 0.25 };
  }
  if (p.fluidType === "co2") {
    return { maxVelocity_ms: 3.5, maxDrop_MPaKm: 0.15 };
  }
  if (p.fluidType === "multiphase") {
    return { maxVelocity_ms: 6, maxDrop_MPaKm: 0.2 };
  }
  if (p.fluidType === "water_injection") {
    return { maxVelocity_ms: 4, maxDrop_MPaKm: 0.25 };
  }
  return { maxVelocity_ms: 3, maxDrop_MPaKm: 0.2 };
}

function pipeSizePenalty(candidateOd_mm: number, currentOd_mm?: number) {
  if (!currentOd_mm) return candidateOd_mm / 200;
  const relativeChange = Math.abs(candidateOd_mm - currentOd_mm) / currentOd_mm;
  const upsizePenalty = candidateOd_mm > currentOd_mm ? 8 : 0;
  return relativeChange * 30 + upsizePenalty;
}

function round(n: number, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d;
}
