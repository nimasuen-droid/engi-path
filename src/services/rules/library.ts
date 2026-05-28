import type { ComplianceFinding, ComplianceStatus, Project, Rule } from "@/models";
import { MATERIAL_OPTIONS, classLocation, recommendedDesignCode } from "@/data/standards";

export const RULES: Rule[] = [
  {
    id: "gas-b318",
    title: "Gas pipeline uses ASME B31.8 basis",
    condition: (p) => p.fluidType === "gas",
    severity: "info",
    message: "Apply ASME B31.8 for gas transmission design.",
    codeRef: "ASME B31.8",
    explanation:
      "Gas service triggers B31.8 wall thickness, MAOP, and class-location design factors.",
  },
  {
    id: "liquid-b314",
    title: "Liquid pipeline uses ASME B31.4 basis",
    condition: (p) => p.fluidType === "liquid" || p.fluidType === "water_injection",
    severity: "info",
    message: "Apply ASME B31.4 for hazardous liquid / produced water transmission.",
    codeRef: "ASME B31.4",
    explanation:
      "Liquid service uses liquid pipeline pressure design, surge review, hydrotest, and integrity criteria.",
  },
  {
    id: "offshore-dnv",
    title: "Offshore / subsea requires DNV-ST-F101 review",
    condition: (p) => p.installationType === "offshore" || p.installationType === "subsea",
    severity: "info",
    message: "Apply DNV-ST-F101 for submarine pipeline design.",
    codeRef: "DNV-ST-F101",
    explanation:
      "LRFD, external pressure, installation, free-span, and on-bottom stability checks may govern.",
  },
  {
    id: "sour-nace",
    title: "Sour service requires NACE material qualification",
    condition: (p) => !!p.sourService,
    severity: "critical",
    message: "Confirm material qualification for H2S service.",
    codeRef: "NACE MR0175 / ISO 15156",
    explanation:
      "Verify SSC/HIC resistance, hardness, chemistry, weld procedure, and sour-service limitations.",
  },
  {
    id: "h2-derating",
    title: "Hydrogen service requires derating review",
    condition: (p) => p.fluidType === "hydrogen",
    severity: "warning",
    message: "Apply hydrogen embrittlement derating and ASME B31.12 review.",
    codeRef: "ASME B31.12",
    explanation:
      "Material performance factors and fracture/fatigue checks can reduce allowable stress for H2 service.",
  },
  {
    id: "co2-phase",
    title: "CO2 phase envelope and fracture review",
    condition: (p) => p.fluidType === "co2",
    severity: "warning",
    message: "Verify dense-phase operating envelope and ductile fracture arrest.",
    codeRef: "DNV-RP-F104",
    explanation:
      "CO2 pipelines require impurity control, decompression, and running ductile fracture assessment.",
  },
  {
    id: "integrity-api1160",
    title: "Integrity management programme",
    condition: (p) => p.fluidType === "liquid" || p.fluidType === "water_injection",
    severity: "info",
    message: "Integrity management planning applies to liquid / injection pipeline service.",
    codeRef: "API 1160 / project IMP",
    explanation:
      "Threat identification, risk assessment, inspection interval, and mitigation planning are required.",
  },
  {
    id: "ffs-api579",
    title: "Fitness-for-service framework needed",
    condition: (p) => p.designLife_years >= 25,
    severity: "info",
    message: "Long design life should plan an API 579 / FFS anomaly framework.",
    codeRef: "API 579 / ASME FFS-1",
    explanation:
      "Establishes acceptance criteria for in-service corrosion, cracks, dents, blisters, and metal loss.",
  },
];

export function evaluate(p: Project): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const add = (
    ruleId: string,
    title: string,
    status: ComplianceStatus,
    message: string,
    codeRef: string,
    explanation: string,
  ) => {
    findings.push({ ruleId, title, status, message, codeRef, explanation });
  };

  if (!p.name.trim())
    add(
      "basis-name",
      "Project name missing",
      "incomplete",
      "Name the project before issuing calculations or reports.",
      "Project controls",
      "Project identity anchors reports, audit records, reviews, and later document control.",
    );
  if (!p.client.trim())
    add(
      "basis-client",
      "Client missing",
      "incomplete",
      "Set the client or asset owner.",
      "Project controls",
      "Client identity drives specifications, approval workflow, and report ownership.",
    );
  if (!p.region.trim())
    add(
      "basis-region",
      "Route region missing",
      "incomplete",
      "Select the route region or training corridor.",
      "Design basis",
      "Region influences environmental assumptions, route class, constructability, crossings, and integrity planning.",
    );
  if (!p.engineer.trim())
    add(
      "basis-engineer",
      "Responsible engineer missing",
      "incomplete",
      "Assign a responsible engineer for traceability.",
      "Engineering assurance",
      "Design data needs a named owner before it can be reviewed, audited, or issued.",
    );
  if (!p.designCode.trim())
    add(
      "basis-code",
      "Governing code missing",
      "incomplete",
      "Select the governing design code.",
      "ASME / DNV / API basis",
      "The code controls allowable stress, design factor, hydrotest basis, and compliance checks.",
    );

  const recommended = recommendedDesignCode(p.fluidType, p.installationType);
  if (
    p.designCode &&
    recommended !== "Project basis / ASME B31.4 or B31.8" &&
    p.designCode !== recommended
  ) {
    add(
      "code-mismatch",
      "Selected code does not match fluid / installation",
      "warning",
      `Recommended code is ${recommended}.`,
      recommended,
      "Fluid type and installation environment should drive the initial governing-code selection.",
    );
  }

  if (p.designPressure_MPa <= 0)
    add(
      "pressure-missing",
      "Design pressure missing",
      "incomplete",
      "Set design pressure greater than zero.",
      "ASME pressure design",
      "Wall thickness, MAOP, hoop stress, and hydrotest checks all depend on design pressure.",
    );
  if (p.designTemperature_C < -100 || p.designTemperature_C > 250)
    add(
      "temperature-range",
      "Design temperature outside screening range",
      "warning",
      "Confirm the material allowable stress and temperature derating.",
      "Material allowable stress tables",
      "Temperature affects allowable stress, fracture behavior, coating, insulation, and material selection.",
    );
  if (!p.outsideDiameter_mm || p.outsideDiameter_mm <= 0)
    add(
      "od-missing",
      "OD / NPS missing",
      "incomplete",
      "Select standard OD / NPS.",
      "ASME B36.10M / B36.19M",
      "OD drives pressure design, velocity, pressure drop, wall schedule, and constructability.",
    );
  if (!p.wallThickness_mm || p.wallThickness_mm <= 0)
    add(
      "wall-missing",
      "Wall thickness missing",
      "incomplete",
      "Select or calculate wall thickness before approval.",
      "ASME B31.4/B31.8",
      "A project cannot pass pressure containment checks without a selected nominal wall thickness.",
    );
  if (p.corrosionAllowance_mm <= 0 && !["co2", "hydrogen"].includes(p.fluidType))
    add(
      "corrosion-allowance",
      "Corrosion allowance not justified",
      "warning",
      "Use > 0 mm unless a non-corrosive, lined, clad, or CRA basis is documented.",
      "Project corrosion basis",
      "Corrosion allowance should come from the corrosion study and design-life assumptions.",
    );
  if (p.sourService && p.corrosionAllowance_mm < 3)
    add(
      "sour-ca-low",
      "Sour service corrosion allowance low",
      "warning",
      "Confirm corrosion allowance and material selection for sour service.",
      "NACE MR0175 / corrosion basis",
      "Sour service can require higher corrosion allowance, corrosion-resistant material, inhibitor strategy, and inspection planning.",
    );

  const material = MATERIAL_OPTIONS.find((m) => m.grade === p.materialGrade);
  if (!material)
    add(
      "material-unknown",
      "Material grade not in validation list",
      "warning",
      "Select a validated line-pipe material grade.",
      "API 5L / project material specification",
      "SMYS, toughness, weldability, and service restrictions must be known before pressure design.",
    );
  if (material && p.sourService && material.smys_MPa >= 448)
    add(
      "sour-high-strength",
      "High-strength pipe in sour service needs specialist review",
      "warning",
      `${p.materialGrade} may need hardness, chemistry, SSC/HIC, weld, and sour-service qualification checks.`,
      "NACE MR0175 / ISO 15156",
      "Higher-strength steels can be more sensitive to sulfide stress cracking and hydrogen effects, especially around welds and heat-affected zones.",
    );
  if (material && p.fluidType === "hydrogen" && material.smys_MPa > 414)
    add(
      "hydrogen-high-strength",
      "Hydrogen service material grade needs derating review",
      "warning",
      "Review fracture toughness, fatigue, material performance factor, and weld qualification before using high-strength steel.",
      "ASME B31.12 / project hydrogen basis",
      "Hydrogen can reduce ductility, fatigue resistance, and fracture margin; pressure design alone is not sufficient.",
    );

  const selectedClass = classLocation(p.classLocation);
  if (p.fluidType === "gas") {
    add(
      "class-location",
      "Class location assigned",
      "compliant",
      `Class ${selectedClass.value} uses screening design factor F = ${selectedClass.designFactor}.`,
      selectedClass.codeRef,
      selectedClass.why,
    );
    if ((p.classLocation ?? 1) >= 3)
      add(
        "design-factor-class3",
        "High class location needs reduced design factor",
        "warning",
        "Class 3/4 locations require reduced design factor and stronger review.",
        "ASME B31.8 Section 841 summary",
        "Higher population exposure reduces allowable utilization and increases assurance requirements.",
      );
    if ((p.classLocation ?? 1) <= 2)
      add(
        "class-location-exceptions",
        "Check gas class-location design-factor exceptions",
        "warning",
        "Verify road, railway, bridge, fabricated assembly, station, and offshore platform cases that can force a lower design factor.",
        "49 CFR 192.111 / ASME B31.8",
        "Some Class 1 and Class 2 situations require lower design factors than the base class-location table; the route review must confirm whether exceptions apply.",
      );
  }

  if (p.outsideDiameter_mm && p.wallThickness_mm && material && p.designPressure_MPa > 0) {
    const required = requiredWall(
      p.designPressure_MPa,
      p.outsideDiameter_mm,
      material.smys_MPa,
      selectedClass.designFactor,
      p.corrosionAllowance_mm,
    );
    if (p.wallThickness_mm + 0.001 < required) {
      add(
        "wall-required",
        "Selected wall below calculated requirement",
        "noncompliant",
        `Selected wall ${p.wallThickness_mm} mm is below required ${required.toFixed(2)} mm.`,
        "ASME B31.4/B31.8 pressure design",
        "Increase wall schedule, reduce design pressure, select stronger material, or revisit design factor and corrosion allowance.",
      );
    } else {
      add(
        "wall-required",
        "Selected wall meets pressure-design screen",
        "compliant",
        `Selected wall ${p.wallThickness_mm} mm meets required ${required.toFixed(2)} mm.`,
        "ASME B31.4/B31.8 pressure design",
        "This is a screening result; final design must still consider tolerances, external loads, fracture, and project specifications.",
      );
      const marginPct = ((p.wallThickness_mm - required) / required) * 100;
      if (marginPct < 12.5)
        add(
          "wall-margin",
          "Nominal wall has low margin above pressure requirement",
          "warning",
          `Selected wall margin is ${marginPct.toFixed(1)}%; review mill tolerance, corrosion basis, and rounding to standard schedule.`,
          "ASME B31.4/B31.8 pressure design",
          "Nominal wall should not be accepted only because it barely clears the formula; manufacturing tolerance, corrosion, loads, and schedule availability can remove apparent margin.",
        );
    }

    const dt = p.outsideDiameter_mm / p.wallThickness_mm;
    if (dt < 20)
      add(
        "dt-thick-wall",
        "D/t outside thin-wall screening assumption",
        "warning",
        `D/t is ${dt.toFixed(1)}; verify whether the simplified thin-wall pressure form remains appropriate.`,
        "Pressure-design method selection",
        "Very low D/t may need a thick-wall or code-specific design method rather than a simple Barlow screen.",
      );
    if (dt > 100)
      add(
        "dt-slender-wall",
        "High D/t needs handling and buckling review",
        "warning",
        `D/t is ${dt.toFixed(1)}; check ovality, handling, installation, external pressure, and local buckling.`,
        "Construction / DNV-ST-F101 / project basis",
        "A pressure check can pass while a thin, large-diameter pipe remains vulnerable to installation strain, external pressure, or local buckling.",
      );

    const hoop = (p.designPressure_MPa * p.outsideDiameter_mm) / (2 * p.wallThickness_mm);
    const utilization = hoop / material.smys_MPa;
    add(
      "hoop-utilization",
      "Hoop stress utilization calculated",
      utilization <= selectedClass.designFactor ? "compliant" : "noncompliant",
      `Hoop stress is ${(utilization * 100).toFixed(1)}% of SMYS against F ${selectedClass.designFactor}.`,
      "49 CFR 192.105 / ASME pressure design",
      "Hoop utilization explains whether pressure, diameter, material, and wall thickness are balanced for the selected class/design factor.",
    );
  }

  if (!p.MAOP_MPa || p.MAOP_MPa <= 0) {
    add(
      "maop-missing",
      "MAOP missing",
      "incomplete",
      "Set MAOP before hydrotest and operating approval checks.",
      "ASME B31.4/B31.8",
      "Hydrotest acceptance and operating limits require a declared MAOP.",
    );
  }
  if (p.MAOP_MPa && p.designPressure_MPa && p.MAOP_MPa > p.designPressure_MPa + 0.001)
    add(
      "maop-above-design-pressure",
      "MAOP exceeds design pressure",
      "noncompliant",
      `MAOP ${p.MAOP_MPa} MPa is higher than design pressure ${p.designPressure_MPa} MPa.`,
      "MAOP / design-pressure basis",
      "The declared operating limit should not exceed the pressure envelope used for design unless the design basis is corrected and re-approved.",
    );
  if (!p.hydrotestPressure_MPa || p.hydrotestPressure_MPa <= 0) {
    add(
      "hydrotest-missing",
      "Hydrotest pressure missing",
      "incomplete",
      "Set hydrotest pressure before completion.",
      "ASME hydrostatic test basis",
      "Strength testing cannot be verified until hydrotest pressure is entered.",
    );
  }
  if (p.hydrotestPressure_MPa && p.MAOP_MPa) {
    const ratio = p.hydrotestPressure_MPa / p.MAOP_MPa;
    add(
      "hydrotest-min",
      "Hydrotest at least 1.25 x MAOP",
      ratio >= 1.25 ? "compliant" : "noncompliant",
      ratio >= 1.25
        ? `Hydrotest ratio is ${ratio.toFixed(2)}.`
        : `Hydrotest ratio is ${ratio.toFixed(2)}, below 1.25.`,
      "ASME B31.4/B31.8 hydrostatic test",
      "Below the minimum test ratio indicates a non-compliant or incomplete strength test basis.",
    );
  }
  if (p.hydrotestPressure_MPa && p.outsideDiameter_mm && p.wallThickness_mm && material) {
    const testHoopPct =
      ((p.hydrotestPressure_MPa * p.outsideDiameter_mm) /
        (2 * p.wallThickness_mm) /
        material.smys_MPa) *
      100;
    if (testHoopPct > 95)
      add(
        "hydrotest-overstress",
        "Hydrotest hoop stress is high",
        "warning",
        `Hydrotest hoop stress is approximately ${testHoopPct.toFixed(1)}% of SMYS.`,
        "Hydrotest stress limit / project procedure",
        "A hydrotest should prove integrity without overstressing pipe, fittings, test heads, or weak components; check elevation head and weakest test-section item.",
      );
    else
      add(
        "hydrotest-stress",
        "Hydrotest stress screened",
        "compliant",
        `Hydrotest hoop stress is approximately ${testHoopPct.toFixed(1)}% of SMYS.`,
        "Hydrotest stress limit / project procedure",
        "This screening result still needs a test pack, elevation profile, calibrated instruments, and acceptance criteria.",
      );
  }

  if (p.installationType === "subsea" || p.installationType === "offshore")
    add(
      "external-pressure-gap",
      "External pressure and installation checks required",
      "incomplete",
      "Add collapse, propagation buckling, on-bottom stability, free-span, and installation load cases before approval.",
      "DNV-ST-F101",
      "Subsea/offshore pipelines can be governed by external pressure, laying strain, seabed interaction, and hydrodynamic loads even when internal pressure checks pass.",
    );

  if (p.fluidType === "liquid" || p.fluidType === "water_injection" || p.fluidType === "co2")
    add(
      "surge-overpressure",
      "Surge and overpressure protection basis required",
      "incomplete",
      "Document surge allowance, relief/control philosophy, valve closure timing, and transient-analysis requirement.",
      "ASME B31.4 / hydraulic transient best practice",
      "Liquid lines can exceed design pressure during fast valve closure, pump trip, blocked-in heating, or ESD events even if steady-state pressure is acceptable.",
    );

  if (p.fluidType === "liquid")
    add(
      "vapor-pressure-profile",
      "Vapor-pressure and hydraulic profile check required",
      "incomplete",
      "Confirm minimum operating pressure stays above vapor pressure at maximum temperature and route high points.",
      "Hydraulic design basis",
      "Insufficient vapor-pressure margin can cause flashing, cavitation, two-phase flow, and transient instability.",
    );

  add(
    "assurance-gates",
    "Engineering assurance gates required",
    p.reviewer?.trim() ? "compliant" : "incomplete",
    p.reviewer?.trim()
      ? `Reviewer assigned: ${p.reviewer}.`
      : "Assign an independent reviewer before issuing calculations or reports.",
    "Engineering management of change / QA",
    "Best-practice pipeline design needs an independent check of the design basis, calculations, code selection, and assumptions before issue.",
  );

  add(
    "operations-safeguards",
    "Operational safeguards need project confirmation",
    "incomplete",
    "Document leak detection, pressure protection, ESD philosophy, pigging/inspection, and commissioning/start-up constraints.",
    "ASME B31.4/B31.8 / API 1160 / project operating basis",
    "A safe pipeline design is more than pressure wall; it needs controls that keep operation inside the design envelope.",
  );

  for (const rule of RULES.filter((r) => r.condition(p))) {
    add(
      rule.id,
      rule.title,
      rule.severity === "critical"
        ? "noncompliant"
        : rule.severity === "warning"
          ? "warning"
          : "compliant",
      rule.message,
      rule.codeRef,
      rule.explanation,
    );
  }

  return findings;
}

export function score(findings: ComplianceFinding[]): {
  score: number;
  breakdown: Record<ComplianceStatus, number>;
} {
  const breakdown: Record<ComplianceStatus, number> = {
    compliant: 0,
    warning: 0,
    noncompliant: 0,
    incomplete: 0,
  };
  findings.forEach((f) => {
    breakdown[f.status]++;
  });
  const total = findings.length || 1;
  const weighted = breakdown.compliant * 1 + breakdown.warning * 0.5 + breakdown.incomplete * 0.15;
  return { score: Math.round((weighted / total) * 100), breakdown };
}

function requiredWall(
  designPressure_MPa: number,
  outsideDiameter_mm: number,
  smys_MPa: number,
  designFactor: number,
  corrosionAllowance_mm: number,
) {
  return (
    (designPressure_MPa * outsideDiameter_mm) / (2 * smys_MPa * designFactor) +
    corrosionAllowance_mm
  );
}
