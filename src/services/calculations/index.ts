// Pipeline engineering calculations. Units: MPa, mm, m/s, kg/m3 unless noted.
// These are screening/design-basis calculations, not a substitute for the governing code edition.

export interface CalcDriver {
  label: string;
  value: string;
  why: string;
}

export interface CalcResult {
  value: number;
  unit: string;
  formula: string;
  assumptions: string[];
  codeRef: string;
  pass?: boolean;
  notes?: string;
  insight?: string;
  drivers?: CalcDriver[];
  recommendations?: string[];
}

export interface MaterialRecommendation {
  grade: string;
  smys_MPa: number;
  status: "recommended" | "review" | "not-suitable";
  requiredWall_mm: number;
  utilizationPct: number;
  why: string;
  actions: string[];
}

const MATERIAL_LIBRARY = [
  { grade: "API 5L Grade B", smys_MPa: 241, pressureBand: "low" },
  { grade: "API 5L X42", smys_MPa: 290, pressureBand: "low-medium" },
  { grade: "API 5L X52", smys_MPa: 359, pressureBand: "medium" },
  { grade: "API 5L X60", smys_MPa: 414, pressureBand: "medium-high" },
  { grade: "API 5L X65", smys_MPa: 448, pressureBand: "high" },
  { grade: "API 5L X70", smys_MPa: 483, pressureBand: "high" },
];

/** Barlow pressure design: t = (P * D) / (2 * S * F * E * T) + CA. */
export function wallThickness(opts: {
  designPressure_MPa: number;
  outsideDiameter_mm: number;
  SMYS_MPa: number;
  designFactor: number;
  weldJointFactor?: number;
  tempDerating?: number;
  corrosionAllowance_mm: number;
  selectedWall_mm?: number;
}): CalcResult {
  const E = opts.weldJointFactor ?? 1.0;
  const T = opts.tempDerating ?? 1.0;
  const pressureWall =
    (opts.designPressure_MPa * opts.outsideDiameter_mm) /
    (2 * opts.SMYS_MPa * opts.designFactor * E * T);
  const t = pressureWall + opts.corrosionAllowance_mm;
  const pass = opts.selectedWall_mm ? opts.selectedWall_mm >= t : undefined;
  return {
    value: round(t, 3),
    unit: "mm",
    formula: "t = (P * D) / (2 * S * F * E * T) + CA",
    assumptions: [
      "Thin-wall Barlow screening form.",
      `Weld joint factor E = ${E}.`,
      `Temperature derating T = ${T}.`,
      `Design factor F = ${opts.designFactor}; verify against class location and service.`,
    ],
    codeRef: "ASME B31.4 / B31.8 pressure design summary",
    pass,
    insight:
      "Wall thickness is the primary pressure-containment check. Pressure and diameter push thickness up; material strength, design factor, weld quality, and temperature rating pull the required thickness down.",
    drivers: [
      {
        label: "Design pressure",
        value: `${opts.designPressure_MPa} MPa`,
        why: "Higher pressure increases hoop stress and required wall.",
      },
      {
        label: "Outside diameter",
        value: `${opts.outsideDiameter_mm} mm`,
        why: "Larger pipe develops more hoop force at the same pressure.",
      },
      {
        label: "Material strength",
        value: `${opts.SMYS_MPa} MPa SMYS`,
        why: "Higher SMYS can reduce pressure wall, subject to fracture, constructability, weldability, and code limits.",
      },
      {
        label: "Corrosion allowance",
        value: `${opts.corrosionAllowance_mm} mm`,
        why: "Added sacrificial metal protects pressure capacity through the design life.",
      },
    ],
    recommendations:
      pass === false
        ? [
            "Select the next heavier wall schedule or reduce design pressure.",
            "Review whether the material grade is too low for the selected OD and pressure.",
            "Confirm corrosion allowance is justified by fluid corrosivity, inhibitor strategy, and design life.",
          ]
        : [
            "Confirm D/t, mill tolerance, installation loads, thermal loads, and corrosion basis before freezing wall.",
            "Round up to a standard pipe schedule and re-check MAOP and hydrotest stress.",
          ],
  };
}

/** MAOP from wall thickness: P = 2 * S * F * E * T * (t - CA) / D. */
export function maop(opts: {
  wallThickness_mm: number;
  outsideDiameter_mm: number;
  SMYS_MPa: number;
  designFactor: number;
  weldJointFactor?: number;
  tempDerating?: number;
  corrosionAllowance_mm: number;
  limit_MPa?: number;
}): CalcResult {
  const E = opts.weldJointFactor ?? 1.0;
  const T = opts.tempDerating ?? 1.0;
  const effectiveWall = opts.wallThickness_mm - opts.corrosionAllowance_mm;
  const P =
    (2 * opts.SMYS_MPa * opts.designFactor * E * T * effectiveWall) / opts.outsideDiameter_mm;
  const pass = opts.limit_MPa ? P >= opts.limit_MPa : undefined;
  return {
    value: round(P, 3),
    unit: "MPa",
    formula: "P = 2 * S * F * E * T * (t - CA) / D",
    assumptions: ["Effective wall excludes corrosion allowance.", "No external loads governing."],
    codeRef: "ASME B31.4 / B31.8 MAOP summary",
    pass,
    insight:
      "MAOP tells you whether the selected pipe wall and material can legally support the design pressure after corrosion allowance is removed.",
    drivers: [
      {
        label: "Effective wall",
        value: `${round(effectiveWall, 3)} mm`,
        why: "Corrosion allowance is not counted as long-term pressure capacity.",
      },
      {
        label: "Design pressure",
        value: opts.limit_MPa ? `${opts.limit_MPa} MPa` : "Not set",
        why: "MAOP should meet or exceed the pressure basis used for design.",
      },
    ],
    recommendations:
      pass === false
        ? [
            "Increase wall thickness or select a higher strength API 5L grade.",
            "Revisit class location/design factor if the route condition has changed.",
            "Check whether corrosion allowance or design pressure is conservative but still technically justified.",
          ]
        : ["Use the MAOP result as the basis for hydrotest and reportable pressure limits."],
  };
}

/** Hydrotest pressure: commonly 1.25 to 1.5 times MAOP, capped by stress limits where applicable. */
export function hydrotest(opts: {
  MAOP_MPa: number;
  multiplier?: number;
  SMYS_MPa?: number;
  D_mm?: number;
  t_mm?: number;
  cap_pctSMYS?: number;
}): CalcResult {
  const mult = opts.multiplier ?? 1.25;
  let P = opts.MAOP_MPa * mult;
  const notes: string[] = [];
  if (opts.SMYS_MPa && opts.D_mm && opts.t_mm && opts.cap_pctSMYS) {
    const hoopCap = ((opts.cap_pctSMYS / 100) * opts.SMYS_MPa * 2 * opts.t_mm) / opts.D_mm;
    if (P > hoopCap) {
      P = hoopCap;
      notes.push(`Capped at ${opts.cap_pctSMYS}% SMYS hoop stress.`);
    }
  }
  return {
    value: round(P, 3),
    unit: "MPa",
    formula: "P_test = multiplier * MAOP, subject to hoop-stress cap",
    assumptions: [
      `Multiplier = ${mult}.`,
      "Verify test section profile, elevation, and code edition.",
    ],
    codeRef: "ASME B31.4 / B31.8 hydrostatic test summary",
    notes: notes.join(" "),
    insight:
      "Hydrotest demonstrates pressure containment before operation. The value must be high enough to prove integrity but not so high that it overstresses the pipe or test section.",
    drivers: [
      {
        label: "MAOP",
        value: `${opts.MAOP_MPa} MPa`,
        why: "Test pressure is normally derived from the operating pressure limit.",
      },
      {
        label: "Multiplier",
        value: `${mult}`,
        why: "The multiplier provides proof margin; governing code and location class control the final value.",
      },
    ],
    recommendations: [
      "Check high and low elevation points because hydrostatic head changes local test pressure.",
      "Confirm temporary test heads, valves, instruments, and weak components are rated for test pressure.",
    ],
  };
}

/** Hoop stress = P * D / (2 * t). */
export function hoopStress(opts: {
  P_MPa: number;
  D_mm: number;
  t_mm: number;
  SMYS_MPa?: number;
  allow_pctSMYS?: number;
}): CalcResult {
  const s = (opts.P_MPa * opts.D_mm) / (2 * opts.t_mm);
  const allow =
    opts.SMYS_MPa && opts.allow_pctSMYS ? (opts.allow_pctSMYS / 100) * opts.SMYS_MPa : undefined;
  const pass = allow !== undefined ? s <= allow : undefined;
  return {
    value: round(s, 2),
    unit: "MPa",
    formula: "sigma_h = P * D / (2 * t)",
    assumptions: ["Thin-wall screening.", "Internal pressure only."],
    codeRef: "Barlow hoop stress",
    pass,
    insight:
      "Hoop stress is the circumferential stress trying to split the pipe. It is the simplest way to see how hard the pressure is working the selected pipe wall.",
    drivers: [
      {
        label: "Pressure",
        value: `${opts.P_MPa} MPa`,
        why: "Higher pressure increases hoop stress linearly.",
      },
      {
        label: "D/t balance",
        value: `${opts.D_mm} mm / ${opts.t_mm} mm`,
        why: "Large diameter and thin wall increase stress.",
      },
    ],
    recommendations:
      pass === false
        ? [
            "Increase wall thickness, reduce design pressure, or review material grade.",
            "Confirm the selected design factor is appropriate for class location and occupancy.",
          ]
        : ["Use this with MAOP, hydrotest, and route-class checks before accepting the design."],
  };
}

/** Fluid velocity v = Q / A, Q in m3/s, D in mm. */
export function velocity(opts: { Q_m3s: number; D_mm: number; max_ms?: number }): CalcResult {
  const A = (Math.PI * (opts.D_mm / 1000) ** 2) / 4;
  const v = opts.Q_m3s / A;
  const pass = opts.max_ms ? v <= opts.max_ms : undefined;
  return {
    value: round(v, 3),
    unit: "m/s",
    formula: "v = Q / (pi * D^2 / 4)",
    assumptions: ["Single-phase steady-state screening.", "Uses nominal OD as screening diameter."],
    codeRef: "General hydraulic design practice",
    pass,
    insight:
      "Velocity connects hydraulic capacity with operability. Excessive velocity can increase pressure drop, noise, erosion, surge severity, and liquid handling problems.",
    drivers: [
      {
        label: "Flow rate",
        value: `${opts.Q_m3s} m3/s`,
        why: "Higher flow through the same pipe raises velocity.",
      },
      {
        label: "Pipe diameter",
        value: `${opts.D_mm} mm`,
        why: "Diameter has a squared effect on area, so small size changes strongly affect velocity.",
      },
    ],
    recommendations:
      pass === false
        ? [
            "Increase pipe size, split flow into parallel lines, or reduce target throughput.",
            "Check erosion velocity, noise, slugging, and surge for the actual fluid.",
          ]
        : [
            "Confirm velocity against service-specific limits for gas, liquid, multiphase, and erosional service.",
          ],
  };
}

/** Darcy-Weisbach pressure drop per km. */
export function pressureDrop(opts: {
  f: number;
  D_mm: number;
  rho_kgm3: number;
  v_ms: number;
  L_m?: number;
  maxDrop_MPa?: number;
}): CalcResult {
  const L = opts.L_m ?? 1000;
  const dP_Pa = (opts.f * (L / (opts.D_mm / 1000)) * opts.rho_kgm3 * opts.v_ms ** 2) / 2;
  const drop = dP_Pa / 1e6;
  const pass = opts.maxDrop_MPa ? drop <= opts.maxDrop_MPa : undefined;
  return {
    value: round(drop, 4),
    unit: "MPa/km",
    formula: "dP = f * (L / D) * rho * v^2 / 2",
    assumptions: ["Darcy-Weisbach.", "Incompressible single-phase screening.", `L = ${L} m.`],
    codeRef: "Standard hydraulic design practice",
    pass,
    insight:
      "Pressure drop determines pump/compressor duty and whether enough pressure remains at the delivery point. Velocity affects it with a squared term.",
    drivers: [
      {
        label: "Density",
        value: `${opts.rho_kgm3} kg/m3`,
        why: "Heavier fluids lose more pressure at the same velocity.",
      },
      {
        label: "Friction factor",
        value: `${opts.f}`,
        why: "Rough pipe, fittings, and turbulent flow increase hydraulic losses.",
      },
      {
        label: "Velocity",
        value: `${opts.v_ms} m/s`,
        why: "Pressure drop rises approximately with velocity squared.",
      },
    ],
    recommendations:
      pass === false
        ? [
            "Increase line size, lower flow rate, reduce roughness, or add pumping/compression.",
            "Move from screening to a full hydraulic model with elevation profile and fittings.",
          ]
        : [
            "Validate with full hydraulic modeling once route length, elevation, roughness, and fluid properties are known.",
          ],
  };
}

/** Pipe sizing: minimum ID for given Q and target velocity. */
export function pipeSizing(opts: { Q_m3s: number; targetV_ms: number }): CalcResult {
  const D = Math.sqrt((4 * opts.Q_m3s) / (Math.PI * opts.targetV_ms)) * 1000;
  return {
    value: round(D, 1),
    unit: "mm ID",
    formula: "D = sqrt(4 * Q / (pi * v))",
    assumptions: [
      "Round up to nearest standard size.",
      "Confirm actual ID from selected schedule.",
    ],
    codeRef: "General hydraulic sizing",
    insight:
      "Sizing sets the first balance between capital cost and operating cost. Too small raises velocity and pressure drop; too large may cost more and create low-flow operating problems.",
    drivers: [
      {
        label: "Flow rate",
        value: `${opts.Q_m3s} m3/s`,
        why: "Capacity requirement drives area.",
      },
      {
        label: "Target velocity",
        value: `${opts.targetV_ms} m/s`,
        why: "The target velocity reflects erosion, pressure drop, noise, and operability limits.",
      },
    ],
    recommendations: [
      "Select the next standard NPS above this ID and re-run velocity, pressure drop, wall thickness, and MAOP.",
    ],
  };
}

/** Design factor validation per class location for gas pipelines, summarized. */
export function designFactorByClass(classLoc: 1 | 2 | 3 | 4): CalcResult {
  const F = { 1: 0.72, 2: 0.6, 3: 0.5, 4: 0.4 }[classLoc];
  return {
    value: F,
    unit: "factor",
    formula: "F = f(class location)",
    assumptions: [
      "Gas service summary values.",
      "Verify code edition, location class, crossings, and special areas.",
    ],
    codeRef: "ASME B31.8 class-location design factor summary",
    insight:
      "The design factor is a public-safety lever. Higher consequence areas use lower factors, requiring stronger or thicker pipe at the same pressure.",
    drivers: [
      {
        label: "Class location",
        value: `Class ${classLoc}`,
        why: "Population density and occupancy reduce the allowable stress level.",
      },
    ],
    recommendations: [
      "Validate class location from route survey, buildings intended for human occupancy, crossings, and future development risk.",
    ],
  };
}

export function vaporPressureMargin(opts: {
  operatingPressure_MPa: number;
  vaporPressure_MPa: number;
  minMargin_MPa?: number;
}): CalcResult {
  const margin = opts.operatingPressure_MPa - opts.vaporPressure_MPa;
  const required = opts.minMargin_MPa ?? 0.1;
  const pass = margin >= required;
  return {
    value: round(margin, 3),
    unit: "MPa",
    formula: "Margin = operating pressure - vapor pressure",
    assumptions: [
      "Uses absolute-pressure screening; confirm units and temperature basis.",
      `Minimum screening margin = ${required} MPa.`,
    ],
    codeRef: "Hydraulic operability / liquid handling best practice",
    pass,
    insight:
      "Vapor pressure is a liquid-operability check. If local pressure falls near vapor pressure, the line can flash, cavitate pumps, lose capacity, and create surge or two-phase conditions.",
    drivers: [
      {
        label: "Operating pressure",
        value: `${opts.operatingPressure_MPa} MPa`,
        why: "Lower operating pressure reduces vapor-pressure margin.",
      },
      {
        label: "Vapor pressure",
        value: `${opts.vaporPressure_MPa} MPa`,
        why: "Higher vapor-pressure fluids flash more easily, especially at warm temperatures and high points.",
      },
    ],
    recommendations:
      pass === false
        ? [
            "Raise minimum operating pressure, reduce temperature, change pump control, or choose a different route/profile.",
            "Check the full hydraulic profile: high points, suction pressure, shutdown, restart, and transient cases.",
          ]
        : [
            "Confirm vapor pressure at maximum operating temperature and check high-point pressure in the hydraulic profile.",
          ],
  };
}

export function surgeDesignCheck(opts: {
  designPressure_MPa: number;
  operatingPressure_MPa: number;
  surgeAllowance_MPa: number;
}): CalcResult {
  const peak = opts.operatingPressure_MPa + opts.surgeAllowance_MPa;
  const margin = opts.designPressure_MPa - peak;
  const pass = margin >= 0;
  return {
    value: round(peak, 3),
    unit: "MPa peak",
    formula: "P_peak = P_operating + surge allowance",
    assumptions: [
      "Screening estimate only.",
      "Use transient analysis for valve closure, pump trip, ESD, and column separation.",
    ],
    codeRef: "Pipeline transient / surge design practice",
    pass,
    insight:
      "Surge checks whether transient pressure can exceed the design envelope. A static pressure design can still fail operationally if fast valve movement or pump trips create high transient peaks.",
    drivers: [
      {
        label: "Operating pressure",
        value: `${opts.operatingPressure_MPa} MPa`,
        why: "The transient peak starts from the normal operating condition.",
      },
      {
        label: "Surge allowance",
        value: `${opts.surgeAllowance_MPa} MPa`,
        why: "Fast changes in flow add pressure waves above steady-state pressure.",
      },
      {
        label: "Design pressure",
        value: `${opts.designPressure_MPa} MPa`,
        why: "This is the pressure envelope the transient peak must stay within.",
      },
    ],
    recommendations:
      pass === false
        ? [
            "Increase design pressure/wall, slow valve closure, add surge relief, or change pump trip/control philosophy.",
            "Run a transient model before issuing the design basis.",
          ]
        : [
            "Document the assumed surge allowance and confirm with transient analysis for detailed design.",
          ],
    notes: pass
      ? undefined
      : `Peak pressure exceeds design pressure by ${round(Math.abs(margin), 3)} MPa.`,
  };
}

export function recommendMaterials(opts: {
  designPressure_MPa: number;
  outsideDiameter_mm: number;
  designFactor: number;
  corrosionAllowance_mm: number;
  selectedWall_mm?: number;
  sourService?: boolean;
  subseaOrOffshore?: boolean;
}): MaterialRecommendation[] {
  return MATERIAL_LIBRARY.map((material) => {
    const requiredWall = wallThickness({
      designPressure_MPa: opts.designPressure_MPa,
      outsideDiameter_mm: opts.outsideDiameter_mm,
      SMYS_MPa: material.smys_MPa,
      designFactor: opts.designFactor,
      corrosionAllowance_mm: opts.corrosionAllowance_mm,
    }).value;
    const utilization =
      opts.selectedWall_mm && opts.selectedWall_mm > 0
        ? (requiredWall / opts.selectedWall_mm) * 100
        : requiredWall <= 10
          ? 65
          : requiredWall <= 18
            ? 80
            : 95;
    let status: MaterialRecommendation["status"] = "review";
    if (opts.selectedWall_mm && requiredWall > opts.selectedWall_mm) {
      status = "not-suitable";
    } else if (
      utilization <= 85 &&
      ((opts.designPressure_MPa <= 8 && material.smys_MPa <= 359) ||
        (opts.designPressure_MPa > 8 && material.smys_MPa >= 359))
    ) {
      status = "recommended";
    }
    if (opts.sourService && material.smys_MPa > 448) {
      status = status === "not-suitable" ? "not-suitable" : "review";
    }

    const actions = [
      "Confirm toughness, weldability, mill availability, fracture control, and project specification.",
      "Re-check wall thickness, hydrotest stress, and constructability after selecting a grade.",
    ];
    if (opts.sourService)
      actions.unshift("Run NACE/ISO sour-service material qualification before approval.");
    if (opts.subseaOrOffshore)
      actions.unshift(
        "Check collapse, propagation buckling, installation strain, and external pressure.",
      );
    if (status === "not-suitable")
      actions.unshift("Increase wall thickness or move to a stronger grade.");

    return {
      grade: material.grade,
      smys_MPa: material.smys_MPa,
      status,
      requiredWall_mm: round(requiredWall, 3),
      utilizationPct: round(utilization, 1),
      why: materialWhy(status, material.pressureBand, opts.designPressure_MPa),
      actions,
    };
  }).sort((a, b) => {
    const rank = { recommended: 0, review: 1, "not-suitable": 2 };
    return rank[a.status] - rank[b.status] || a.requiredWall_mm - b.requiredWall_mm;
  });
}

function materialWhy(status: MaterialRecommendation["status"], band: string, pressure: number) {
  if (status === "recommended") {
    return `Good screening match for a ${band} pressure duty at ${pressure} MPa, subject to project checks.`;
  }
  if (status === "not-suitable") {
    return "Required wall exceeds the selected wall, so this grade/schedule combination does not meet pressure screening.";
  }
  return "Technically possible, but needs engineering review for availability, toughness, welding, sour service, or cost balance.";
}

function round(n: number, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d;
}
