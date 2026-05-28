// Pipeline engineering calculations. Units: MPa, mm, m/s, etc.
// All formulas are general engineering forms; consult governing code for project-specific factors.

export interface CalcResult {
  value: number;
  unit: string;
  formula: string;
  assumptions: string[];
  codeRef: string;
  pass?: boolean;
  notes?: string;
}

/** Barlow's formula: t = (P * D) / (2 * S * F * E * T) + CA  (mm) */
export function wallThickness(opts: {
  designPressure_MPa: number; outsideDiameter_mm: number;
  SMYS_MPa: number; designFactor: number; weldJointFactor?: number; tempDerating?: number;
  corrosionAllowance_mm: number;
}): CalcResult {
  const E = opts.weldJointFactor ?? 1.0;
  const T = opts.tempDerating ?? 1.0;
  const t = (opts.designPressure_MPa * opts.outsideDiameter_mm) / (2 * opts.SMYS_MPa * opts.designFactor * E * T) + opts.corrosionAllowance_mm;
  return {
    value: round(t, 3), unit: 'mm',
    formula: 't = (P · D) / (2 · S · F · E · T) + CA',
    assumptions: [
      'Thin-wall Barlow form (D/t > 20).',
      `Weld joint factor E = ${E}`,
      `Temperature derating T = ${T}`,
      `Design factor F = ${opts.designFactor} (verify per code and class location).`,
    ],
    codeRef: 'ASME B31.4 §403 / B31.8 §841 (summarized form)',
  };
}

/** MAOP from wall thickness: P = (2 · S · F · E · T · (t − CA)) / D */
export function maop(opts: {
  wallThickness_mm: number; outsideDiameter_mm: number; SMYS_MPa: number;
  designFactor: number; weldJointFactor?: number; tempDerating?: number; corrosionAllowance_mm: number;
  limit_MPa?: number;
}): CalcResult {
  const E = opts.weldJointFactor ?? 1.0;
  const T = opts.tempDerating ?? 1.0;
  const P = (2 * opts.SMYS_MPa * opts.designFactor * E * T * (opts.wallThickness_mm - opts.corrosionAllowance_mm)) / opts.outsideDiameter_mm;
  return {
    value: round(P, 3), unit: 'MPa',
    formula: 'P = 2·S·F·E·T·(t − CA) / D',
    assumptions: ['Effective thickness excludes corrosion allowance.', 'No external loads governing.'],
    codeRef: 'ASME B31.4/8 MAOP form',
    pass: opts.limit_MPa ? P <= opts.limit_MPa * 1.0001 : undefined,
  };
}

/** Hydrotest pressure: typically 1.25–1.5 × MAOP. Returns the recommended test value. */
export function hydrotest(opts: { MAOP_MPa: number; multiplier?: number; SMYS_MPa?: number; D_mm?: number; t_mm?: number; cap_pctSMYS?: number }): CalcResult {
  const mult = opts.multiplier ?? 1.25;
  let P = opts.MAOP_MPa * mult;
  const notes: string[] = [];
  if (opts.SMYS_MPa && opts.D_mm && opts.t_mm && opts.cap_pctSMYS) {
    const hoopCap = (opts.cap_pctSMYS / 100) * opts.SMYS_MPa * 2 * opts.t_mm / opts.D_mm;
    if (P > hoopCap) { P = hoopCap; notes.push(`Capped at ${opts.cap_pctSMYS}% SMYS hoop stress.`); }
  }
  return {
    value: round(P, 3), unit: 'MPa',
    formula: 'P_test = m · MAOP   (cap: σ_hoop ≤ x% · SMYS)',
    assumptions: [`Multiplier m = ${mult}`, 'Onshore hydrotest scope; verify per governing code.'],
    codeRef: 'ASME B31.4/8 hydrostatic test',
    notes: notes.join(' '),
  };
}

/** Hoop stress σ = P·D / (2·t) */
export function hoopStress(opts: { P_MPa: number; D_mm: number; t_mm: number; SMYS_MPa?: number; allow_pctSMYS?: number }): CalcResult {
  const s = (opts.P_MPa * opts.D_mm) / (2 * opts.t_mm);
  const allow = opts.SMYS_MPa && opts.allow_pctSMYS ? (opts.allow_pctSMYS / 100) * opts.SMYS_MPa : undefined;
  return {
    value: round(s, 2), unit: 'MPa',
    formula: 'σ_h = P·D / (2·t)',
    assumptions: ['Thin-wall.', 'Internal pressure only.'],
    codeRef: 'Barlow hoop stress',
    pass: allow !== undefined ? s <= allow : undefined,
  };
}

/** Fluid velocity v = Q / A, Q in m³/s, D in mm. */
export function velocity(opts: { Q_m3s: number; D_mm: number; max_ms?: number }): CalcResult {
  const A = Math.PI * (opts.D_mm / 1000) ** 2 / 4;
  const v = opts.Q_m3s / A;
  return {
    value: round(v, 3), unit: 'm/s',
    formula: 'v = Q / (π·D²/4)',
    assumptions: ['Single-phase, steady-state.'],
    codeRef: 'General hydraulics',
    pass: opts.max_ms ? v <= opts.max_ms : undefined,
  };
}

/** Darcy–Weisbach pressure drop per km: ΔP = f·(L/D)·ρ·v²/2 (Pa), returned in MPa/km */
export function pressureDrop(opts: { f: number; D_mm: number; rho_kgm3: number; v_ms: number; L_m?: number }): CalcResult {
  const L = opts.L_m ?? 1000;
  const dP_Pa = opts.f * (L / (opts.D_mm / 1000)) * opts.rho_kgm3 * opts.v_ms ** 2 / 2;
  return {
    value: round(dP_Pa / 1e6, 4), unit: 'MPa',
    formula: 'ΔP = f·(L/D)·ρ·v²/2',
    assumptions: ['Darcy–Weisbach.', 'Incompressible single-phase.', `L = ${L} m`],
    codeRef: 'Standard hydraulics',
  };
}

/** Pipe sizing: minimum ID for given Q and target velocity. */
export function pipeSizing(opts: { Q_m3s: number; targetV_ms: number }): CalcResult {
  const D = Math.sqrt((4 * opts.Q_m3s) / (Math.PI * opts.targetV_ms)) * 1000;
  return {
    value: round(D, 1), unit: 'mm (ID)',
    formula: 'D = √(4·Q / (π·v))',
    assumptions: ['Round to nearest standard size.'],
    codeRef: 'General sizing',
  };
}

/** Design factor validation per class location (gas, B31.8 summary). */
export function designFactorByClass(classLoc: 1 | 2 | 3 | 4): CalcResult {
  const F = { 1: 0.72, 2: 0.6, 3: 0.5, 4: 0.4 }[classLoc];
  return {
    value: F, unit: '—',
    formula: 'F = f(class location)',
    assumptions: ['Gas service, summary values; verify exact code edition.'],
    codeRef: 'ASME B31.8 §841 (summarized)',
  };
}

function round(n: number, d = 2) { return Math.round(n * 10 ** d) / 10 ** d; }
