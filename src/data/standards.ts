import type { FluidType, InstallationType } from "@/models";

export interface OptionInfo<T extends string | number = string> {
  value: T;
  label: string;
  why: string;
  how: string;
  drivenBy: string;
  codeRef: string;
}

export interface PipeSizeOption {
  nps: string;
  od_mm: number;
  commonSchedules: Array<{ schedule: string; wall_mm: number }>;
  why: string;
  codeRef: string;
}

export const FLUID_OPTIONS: Array<OptionInfo<FluidType>> = [
  {
    value: "gas",
    label: "Gas transmission",
    why: "Gas pipelines are governed by class location, population exposure, MAOP, and fracture control assumptions.",
    how: "Use ASME B31.8 for onshore gas transmission and apply a lower design factor as class location increases.",
    drivenBy:
      "Fluid phase, public exposure, operating pressure, route class, and material toughness.",
    codeRef: "ASME B31.8",
  },
  {
    value: "liquid",
    label: "Liquid hydrocarbon",
    why: "Liquid lines are driven by pressure containment, surge, leak consequence, and integrity management.",
    how: "Use ASME B31.4 and confirm hydrotest, wall thickness, overpressure protection, and API 1160 integrity triggers.",
    drivenBy:
      "Product type, pressure, elevation profile, surge, leak consequence, and route environment.",
    codeRef: "ASME B31.4 / API 1160",
  },
  {
    value: "multiphase",
    label: "Multiphase production",
    why: "Multiphase lines need extra attention to slugging, corrosion, erosion, and sour-service materials.",
    how: "Select the governing project code, verify corrosion allowance, then check material compatibility and hydraulic regime.",
    drivenBy: "Gas-liquid ratio, water cut, solids, H2S/CO2, slugging, and operating envelope.",
    codeRef: "Project basis / NACE MR0175 where sour",
  },
  {
    value: "water_injection",
    label: "Water injection",
    why: "Injection service can be highly corrosive and may see high pressure even when the fluid is non-hydrocarbon.",
    how: "Use liquid pipeline checks, confirm oxygen/chloride control, and set corrosion allowance from the corrosion study.",
    drivenBy: "Injection pressure, water chemistry, oxygen ingress, chlorides, and design life.",
    codeRef: "ASME B31.4 / project corrosion basis",
  },
  {
    value: "co2",
    label: "CO2 pipeline",
    why: "CO2 pipelines need phase-envelope and running-ductile-fracture checks beyond basic pressure design.",
    how: "Confirm dense/supercritical operation, impurities, decompression behavior, and fracture arrest strategy.",
    drivenBy:
      "CO2 purity, water content, temperature-pressure envelope, toughness, and route consequence.",
    codeRef: "DNV-RP-F104",
  },
  {
    value: "hydrogen",
    label: "Hydrogen pipeline",
    why: "Hydrogen can reduce material toughness and fatigue resistance through embrittlement.",
    how: "Use hydrogen-specific code checks, derate allowable stress where required, and confirm material qualification.",
    drivenBy:
      "Hydrogen partial pressure, cyclic loading, steel grade, weld procedure, and fracture toughness.",
    codeRef: "ASME B31.12",
  },
];

export const INSTALLATION_OPTIONS: Array<OptionInfo<InstallationType>> = [
  {
    value: "onshore",
    label: "Onshore",
    why: "Onshore lines are strongly influenced by population density, right-of-way access, and constructability.",
    how: "Use ASME B31.4 or B31.8 as applicable and assign class location for gas pipelines.",
    drivenBy: "Route, population density, crossings, pressure, and product consequence.",
    codeRef: "ASME B31.4 / ASME B31.8",
  },
  {
    value: "buried",
    label: "Buried",
    why: "Buried installation adds external corrosion, soil loading, cover depth, and third-party damage considerations.",
    how: "Check wall thickness, coating/CP, crossings, minimum cover, and integrity inspection basis.",
    drivenBy: "Soil, cover depth, coating, cathodic protection, crossings, and external loads.",
    codeRef: "ASME B31.4 / ASME B31.8",
  },
  {
    value: "above_ground",
    label: "Above ground",
    why: "Above-ground pipe is more exposed to thermal expansion, support loads, and vibration.",
    how: "Check supports, expansion, spans, wind/seismic loads, and mechanical protection.",
    drivenBy: "Temperature range, support spacing, wind, seismic, vibration, and accessibility.",
    codeRef: "ASME B31.4 / ASME B31.8",
  },
  {
    value: "offshore",
    label: "Offshore",
    why: "Offshore pipelines need installation, stability, free-span, and marine operation checks.",
    how: "Use DNV-ST-F101 for submarine pipeline design and document installation load cases.",
    drivenBy: "Water depth, installation method, waves/current, seabed, and operating pressure.",
    codeRef: "DNV-ST-F101",
  },
  {
    value: "subsea",
    label: "Subsea",
    why: "Subsea pipelines are controlled by pressure containment plus collapse, buckling, stability, and installation loads.",
    how: "Use DNV-ST-F101 and verify pressure containment is not the only governing limit state.",
    drivenBy: "External pressure, water depth, seabed, temperature, installation, and free spans.",
    codeRef: "DNV-ST-F101",
  },
];

export const CLASS_LOCATION_OPTIONS: Array<OptionInfo<1 | 2 | 3 | 4> & { designFactor: number }> = [
  {
    value: 1,
    label: "Class 1 - remote / sparse development",
    designFactor: 0.72,
    why: "Lower public exposure allows the highest common gas transmission design factor.",
    how: "Use only when population density along the route supports Class 1 classification.",
    drivenBy: "Occupied buildings and public exposure along the class-location unit.",
    codeRef: "ASME B31.8 Section 840/841 summary",
  },
  {
    value: 2,
    label: "Class 2 - fringe development",
    designFactor: 0.6,
    why: "More occupancy requires lower hoop stress utilization than Class 1.",
    how: "Select when development is present but not dense enough for Class 3.",
    drivenBy: "Building count, route development, and occupancy density.",
    codeRef: "ASME B31.8 Section 840/841 summary",
  },
  {
    value: 3,
    label: "Class 3 - suburban / frequent occupancy",
    designFactor: 0.5,
    why: "Higher consequence areas require reduced design factor and closer scrutiny.",
    how: "Select for suburban areas, industrial areas, or frequent human occupancy.",
    drivenBy: "Public exposure, building density, schools, offices, and industrial activity.",
    codeRef: "ASME B31.8 Section 840/841 summary",
  },
  {
    value: 4,
    label: "Class 4 - dense multi-storey occupancy",
    designFactor: 0.4,
    why: "Dense urban exposure requires the most conservative common gas design factor.",
    how: "Select for multi-storey building concentration or dense urban corridors.",
    drivenBy: "Dense occupancy, multi-storey buildings, urban consequence, and emergency access.",
    codeRef: "ASME B31.8 Section 840/841 summary",
  },
];

export const PIPE_SIZE_OPTIONS: PipeSizeOption[] = [
  {
    nps: "4",
    od_mm: 114.3,
    commonSchedules: [
      { schedule: "STD", wall_mm: 6.02 },
      { schedule: "XS", wall_mm: 8.56 },
    ],
    why: "Small branch, utility, and gathering services where moderate flow is expected.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "6",
    od_mm: 168.3,
    commonSchedules: [
      { schedule: "STD", wall_mm: 7.11 },
      { schedule: "XS", wall_mm: 10.97 },
    ],
    why: "Common process and gathering size; useful for training calculations.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "8",
    od_mm: 219.1,
    commonSchedules: [
      { schedule: "STD", wall_mm: 8.18 },
      { schedule: "XS", wall_mm: 12.7 },
    ],
    why: "Medium transfer line size with practical schedule availability.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "10",
    od_mm: 273.1,
    commonSchedules: [
      { schedule: "STD", wall_mm: 9.27 },
      { schedule: "XS", wall_mm: 12.7 },
    ],
    why: "Medium transmission and facility interconnect size.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "12",
    od_mm: 323.9,
    commonSchedules: [
      { schedule: "STD", wall_mm: 9.53 },
      { schedule: "XS", wall_mm: 12.7 },
    ],
    why: "Common trunk or facility header size.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "16",
    od_mm: 406.4,
    commonSchedules: [
      { schedule: "STD", wall_mm: 9.53 },
      { schedule: "XS", wall_mm: 12.7 },
    ],
    why: "Larger cross-country or offshore export service.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "20",
    od_mm: 508,
    commonSchedules: [
      { schedule: "STD", wall_mm: 9.53 },
      { schedule: "XS", wall_mm: 12.7 },
    ],
    why: "Large liquid, gas, and water injection transmission size.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "24",
    od_mm: 610,
    commonSchedules: [
      { schedule: "STD", wall_mm: 9.53 },
      { schedule: "XS", wall_mm: 12.7 },
    ],
    why: "Major trunk line size; pressure design and constructability both matter.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "30",
    od_mm: 762,
    commonSchedules: [
      { schedule: "STD", wall_mm: 9.53 },
      { schedule: "XS", wall_mm: 12.7 },
      { schedule: "0.625 in", wall_mm: 15.88 },
    ],
    why: "Large gas transmission size used for class-location design examples.",
    codeRef: "ASME B36.10M OD table",
  },
  {
    nps: "36",
    od_mm: 914.4,
    commonSchedules: [
      { schedule: "STD", wall_mm: 9.53 },
      { schedule: "0.625 in", wall_mm: 15.88 },
      { schedule: "0.750 in", wall_mm: 19.05 },
    ],
    why: "High-capacity trunkline size where class location and MAOP checks are central.",
    codeRef: "ASME B36.10M OD table",
  },
];

export const MATERIAL_OPTIONS = [
  {
    grade: "API 5L X52",
    smys_MPa: 359,
    why: "Moderate-strength line pipe often selected where lower pressure or higher toughness margin is desired.",
  },
  {
    grade: "API 5L X60",
    smys_MPa: 414,
    why: "Common baseline grade for training and many transmission examples.",
  },
  {
    grade: "API 5L X65",
    smys_MPa: 448,
    why: "Higher-strength grade for larger/high-pressure transmission pipelines.",
  },
  {
    grade: "API 5L X70",
    smys_MPa: 483,
    why: "High-strength line pipe; confirm weldability and fracture control requirements.",
  },
  {
    grade: "DNV 450 SMLS",
    smys_MPa: 450,
    why: "Representative offshore/subsea grade for DNV-style examples.",
  },
  {
    grade: "13Cr CRA clad",
    smys_MPa: 414,
    why: "Used where corrosion resistance drives material choice more than base strength.",
  },
];

export const REGION_OPTIONS = [
  "Niger Delta",
  "Gulf of Guinea",
  "North Sea",
  "Permian Basin",
  "Gulf Coast",
  "Middle East",
  "Generic training corridor",
];

export const DESIGN_LIFE_OPTIONS = [20, 25, 30, 40, 50];

export const CORROSION_ALLOWANCE_OPTIONS = [
  { value: 0, label: "0 mm - non-corrosive / lined / CRA case" },
  { value: 1.5, label: "1.5 mm - low corrosion allowance" },
  { value: 3, label: "3 mm - typical sweet service placeholder" },
  { value: 6, label: "6 mm - sour/corrosive service placeholder" },
];

export function recommendedDesignCode(fluidType: FluidType, installationType: InstallationType) {
  if (installationType === "offshore" || installationType === "subsea") return "DNV-ST-F101";
  if (fluidType === "gas") return "ASME B31.8";
  if (fluidType === "liquid" || fluidType === "water_injection") return "ASME B31.4";
  if (fluidType === "hydrogen") return "ASME B31.12";
  if (fluidType === "co2") return "DNV-RP-F104";
  return "Project basis / ASME B31.4 or B31.8";
}

export function pipeSizeByOd(od_mm?: number) {
  return PIPE_SIZE_OPTIONS.find((p) => p.od_mm === od_mm) ?? PIPE_SIZE_OPTIONS[8];
}

export function classLocation(value?: 1 | 2 | 3 | 4) {
  return CLASS_LOCATION_OPTIONS.find((c) => c.value === (value ?? 1)) ?? CLASS_LOCATION_OPTIONS[0];
}
