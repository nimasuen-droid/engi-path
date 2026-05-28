import type { Rule, Project, ComplianceFinding, ComplianceStatus } from '@/models';

export const RULES: Rule[] = [
  {
    id: 'gas-b318',
    title: 'Gas pipeline → ASME B31.8 applicable',
    condition: (p) => p.fluidType === 'gas',
    severity: 'info',
    message: 'Apply ASME B31.8 for gas transmission design.',
    codeRef: 'ASME B31.8',
    explanation: 'Gas service triggers B31.8 wall thickness, MAOP, and class-location design factors.',
  },
  {
    id: 'liquid-b314',
    title: 'Liquid pipeline → ASME B31.4 applicable',
    condition: (p) => p.fluidType === 'liquid' || p.fluidType === 'water_injection',
    severity: 'info',
    message: 'Apply ASME B31.4 for hazardous liquid / produced water transmission.',
    codeRef: 'ASME B31.4',
    explanation: 'Liquid service uses a fixed design factor (typ. 0.72) and B31.4 hydrotest criteria.',
  },
  {
    id: 'offshore-dnv',
    title: 'Offshore / subsea → DNV-ST-F101',
    condition: (p) => p.installationType === 'offshore' || p.installationType === 'subsea',
    severity: 'info',
    message: 'Apply DNV-ST-F101 for submarine pipeline design.',
    codeRef: 'DNV-ST-F101',
    explanation: 'LRFD approach for submarine pipelines; installation and on-bottom stability govern.',
  },
  {
    id: 'sour-nace',
    title: 'Sour service → NACE MR0175 / ISO 15156',
    condition: (p) => !!p.sourService,
    severity: 'critical',
    message: 'Confirm material qualification for H2S service.',
    codeRef: 'NACE MR0175 / ISO 15156',
    explanation: 'Verify SSC/HIC resistance; restrict hardness and chemistry per part 2/3 of the standard.',
  },
  {
    id: 'h2-derating',
    title: 'Hydrogen service derating',
    condition: (p) => p.fluidType === 'hydrogen',
    severity: 'warning',
    message: 'Apply hydrogen embrittlement derating and ASME B31.12 review.',
    codeRef: 'ASME B31.12',
    explanation: 'Material performance factor reduces allowable stress for H2 transmission piping.',
  },
  {
    id: 'co2-phase',
    title: 'CO₂ phase envelope review',
    condition: (p) => p.fluidType === 'co2',
    severity: 'warning',
    message: 'Verify dense-phase operating envelope and ductile fracture arrest.',
    codeRef: 'DNV-RP-F104',
    explanation: 'CO₂ pipelines require running ductile fracture and impurity control assessment.',
  },
  {
    id: 'corrosion-allowance',
    title: 'Corrosion allowance specified',
    condition: () => true,
    severity: 'warning',
    message: 'Corrosion allowance must be > 0 unless internally clad / non-corrosive.',
    codeRef: 'Project basis',
    explanation: 'Set CA per corrosion study; typical 3 mm for sweet, 6 mm for sour where applicable.',
  },
  {
    id: 'design-factor-class3',
    title: 'High class location → review design factor',
    condition: (p) => p.fluidType === 'gas' && (p.classLocation ?? 1) >= 3,
    severity: 'warning',
    message: 'Class 3/4 location requires reduced design factor (F ≤ 0.5).',
    codeRef: 'ASME B31.8 §841',
    explanation: 'Population density triggers stricter design factor and inspection frequency.',
  },
  {
    id: 'hydrotest-min',
    title: 'Hydrotest ≥ 1.25 · MAOP',
    condition: (p) => !!(p.hydrotestPressure_MPa && p.MAOP_MPa),
    severity: 'critical',
    message: 'Confirm hydrotest pressure meets minimum 1.25 · MAOP.',
    codeRef: 'ASME B31.4/8 hydrostatic test',
    explanation: 'Below 1.25× indicates non-compliant strength test.',
  },
  {
    id: 'integrity-api1160',
    title: 'Integrity management programme',
    condition: (p) => p.fluidType === 'liquid',
    severity: 'info',
    message: 'API 1160 integrity management applies to hazardous liquid pipelines.',
    codeRef: 'API 1160',
    explanation: 'Threat identification, risk assessment, and inspection planning required.',
  },
  {
    id: 'ffs-api579',
    title: 'Fitness-for-service trigger',
    condition: (p) => p.designLife_years >= 25,
    severity: 'info',
    message: 'Long design life — plan API 579 FFS framework for in-service anomalies.',
    codeRef: 'API 579 / ASME FFS-1',
    explanation: 'Establishes acceptance criteria for corrosion, cracks, and metal loss.',
  },
];

export function evaluate(p: Project): ComplianceFinding[] {
  return RULES.filter((r) => r.condition(p)).map((r) => {
    let status: ComplianceStatus = r.severity === 'critical' ? 'noncompliant' : r.severity === 'warning' ? 'warning' : 'compliant';
    // Special evaluation overrides
    if (r.id === 'corrosion-allowance') status = p.corrosionAllowance_mm > 0 ? 'compliant' : 'warning';
    if (r.id === 'hydrotest-min') {
      const ratio = (p.hydrotestPressure_MPa ?? 0) / (p.MAOP_MPa ?? 1);
      status = ratio >= 1.25 ? 'compliant' : 'noncompliant';
    }
    return {
      ruleId: r.id, title: r.title, status,
      message: r.message, codeRef: r.codeRef, explanation: r.explanation,
    };
  });
}

export function score(findings: ComplianceFinding[]): { score: number; breakdown: Record<ComplianceStatus, number> } {
  const breakdown: Record<ComplianceStatus, number> = { compliant: 0, warning: 0, noncompliant: 0, incomplete: 0 };
  findings.forEach((f) => { breakdown[f.status]++; });
  const total = findings.length || 1;
  const weighted = breakdown.compliant * 1 + breakdown.warning * 0.5 + breakdown.incomplete * 0.25;
  return { score: Math.round((weighted / total) * 100), breakdown };
}
