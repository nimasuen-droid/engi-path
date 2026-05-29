export type FluidType = "gas" | "liquid" | "multiphase" | "water_injection" | "co2" | "hydrogen";
export type InstallationType = "onshore" | "offshore" | "buried" | "above_ground" | "subsea";
export type ComplianceStatus = "compliant" | "warning" | "noncompliant" | "incomplete";
export type UnitSystem = "metric" | "us_customary";
export type CalculationClassification = "screening" | "design_basis" | "detailed_not_implemented";
export type AssumptionConfidence = "confirmed" | "assumed" | "estimated" | "placeholder";

export interface CodeEdition {
  designCode: string;
  edition: string;
  notes?: string;
}

export interface RouteSection {
  id: string;
  name: string;
  length_km: number;
  elevationChange_m: number;
  classLocation?: 1 | 2 | 3 | 4;
  designPressure_MPa?: number;
  notes?: string;
}

export interface ComponentLimit {
  id: string;
  tag: string;
  type: "pipe" | "valve" | "flange" | "fitting" | "launcher" | "receiver" | "instrument" | "other";
  rating_MPa: number;
  temperature_C?: number;
  notes?: string;
}

export interface CalculationRevision {
  id: string;
  revision: string;
  createdAt: string;
  createdBy: string;
  basisHash: string;
  summary: string;
  status: ComplianceStatus;
  sheets: CalculationTraceSheet[];
}

export interface CalculationTraceSheet {
  id: string;
  title: string;
  revision: string;
  classification: CalculationClassification;
  codeBasis: string;
  inputs: Array<{ label: string; value: string; unit?: string; source: string }>;
  steps: Array<{ label: string; expression: string; result: string; note?: string }>;
  result: string;
  status: ComplianceStatus;
  timestamp: string;
  calculationVersion: string;
  limitations: string[];
}

export interface EngineeringAssumption {
  id: string;
  assumption: string;
  source: string;
  confidence: AssumptionConfidence;
  owner: string;
  status: "open" | "pending" | "closed" | "superseded";
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  fluidType: FluidType;
  installationType: InstallationType;
  designCode: string;
  region: string;
  engineer: string;
  reviewer?: string;
  designPressure_MPa: number;
  designTemperature_C: number;
  corrosionAllowance_mm: number;
  materialGrade: string;
  length_km: number;
  designLife_years: number;
  outsideDiameter_mm?: number;
  wallThickness_mm?: number;
  MAOP_MPa?: number;
  hydrotestPressure_MPa?: number;
  classLocation?: 1 | 2 | 3 | 4;
  sourService?: boolean;
  unitSystem?: UnitSystem;
  codeEdition?: CodeEdition;
  routeSections?: RouteSection[];
  componentLimits?: ComponentLimit[];
  calculationRevisions?: CalculationRevision[];
  assumptionsRegister?: EngineeringAssumption[];
  archived?: boolean;
  workflow?: WorkflowGraph;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNodeData {
  label: string;
  kind: WorkflowNodeKind;
  notes?: string;
}
export type WorkflowNodeKind =
  | "design_basis"
  | "hydraulic"
  | "wall_thickness"
  | "material"
  | "hydrotest"
  | "integrity"
  | "approval";

export interface WorkflowGraph {
  nodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: WorkflowNodeData;
  }>;
  edges: Array<{ id: string; source: string; target: string }>;
}

export interface Rule {
  id: string;
  title: string;
  condition: (p: Project) => boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  codeRef: string;
  explanation: string;
}

export interface ComplianceFinding {
  ruleId: string;
  title: string;
  status: ComplianceStatus;
  message: string;
  codeRef: string;
  explanation: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  module: string;
  action: string;
  projectId?: string;
  before?: unknown;
  after?: unknown;
}

export interface CodeEntry {
  id: string;
  name: string;
  scope: string;
  applicability: string[];
  summary: string;
  relatedModules: string[];
}

export interface ScenarioStep {
  prompt: string;
  options: Array<{ label: string; correct: boolean; feedback: string }>;
}
export interface Scenario {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: ScenarioStep[];
}
