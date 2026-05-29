import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import { StatusBadge } from "@/components/StatusBadge";
import { classLocation } from "@/data/standards";
import type { ComplianceStatus, Project, WorkflowNodeKind } from "@/models";
import { evaluate, score } from "@/services/rules/library";
import { maop, wallThickness } from "@/services/calculations";
import { workflowSummary } from "@/services/reports/pdf";
import { useProjects } from "@/state/projects";
import { CheckCircle2, FileText, Plus, Save, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";

export const Route = createFileRoute("/engineer/workflow")({
  component: () => <RequireActiveProject>{(id) => <Builder id={id} />}</RequireActiveProject>,
});

const KINDS: { kind: WorkflowNodeKind; label: string }[] = [
  { kind: "design_basis", label: "Design Basis" },
  { kind: "hydraulic", label: "Hydraulic Calculation" },
  { kind: "wall_thickness", label: "Wall Thickness" },
  { kind: "material", label: "Material Selection" },
  { kind: "hydrotest", label: "Hydrotest" },
  { kind: "integrity", label: "Integrity Review" },
  { kind: "approval", label: "Approval" },
];

interface Gate {
  kind: WorkflowNodeKind;
  label: string;
  status: ComplianceStatus;
  detail: string;
  action: string;
}

function defaultGraph(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: KINDS.map((k, i) => ({
      id: k.kind,
      position: { x: 60 + (i % 4) * 220, y: 60 + Math.floor(i / 4) * 150 },
      data: { label: k.label, kind: k.kind },
    })),
    edges: [
      {
        id: "e1",
        source: "design_basis",
        target: "hydraulic",
        markerEnd: { type: MarkerType.Arrow },
      },
      {
        id: "e2",
        source: "hydraulic",
        target: "wall_thickness",
        markerEnd: { type: MarkerType.Arrow },
      },
      {
        id: "e3",
        source: "wall_thickness",
        target: "material",
        markerEnd: { type: MarkerType.Arrow },
      },
      { id: "e4", source: "material", target: "hydrotest", markerEnd: { type: MarkerType.Arrow } },
      { id: "e5", source: "hydrotest", target: "integrity", markerEnd: { type: MarkerType.Arrow } },
      { id: "e6", source: "integrity", target: "approval", markerEnd: { type: MarkerType.Arrow } },
    ],
  };
}

function Builder({ id }: { id: string }) {
  const { projects, upsert } = useProjects();
  const project = projects.find((x) => x.id === id)!;
  const gates = useMemo(() => buildGates(project), [project]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [validation, setValidation] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const gateMap = useMemo(() => new Map(gates.map((gate) => [gate.kind, gate])), [gates]);
  const blockers = gates.filter(
    (gate) => gate.status === "noncompliant" || gate.status === "incomplete",
  );
  const ready = blockers.length === 0;

  useEffect(() => {
    const source = project.workflow
      ? {
          nodes: project.workflow.nodes.map((n) => ({
            id: n.id,
            position: n.position,
            data: n.data,
          })),
          edges: project.workflow.edges.map((e) => ({
            ...e,
            markerEnd: { type: MarkerType.Arrow },
          })),
        }
      : defaultGraph();
    setNodes(applyGateStyles(source.nodes, gateMap));
    setEdges(source.edges);
  }, [project.id, project.workflow, gateMap]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, markerEnd: { type: MarkerType.Arrow } }, eds)),
    [],
  );

  function addNode(kind: WorkflowNodeKind, label: string) {
    setNodes((nds) =>
      applyGateStyles(
        [
          ...nds,
          {
            id: `${kind}-${Date.now()}`,
            position: { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
            data: { label, kind },
          },
        ],
        gateMap,
      ),
    );
  }

  function validate(): string[] {
    const issues: string[] = [];
    const targets = new Set(edges.map((e) => e.target));
    const sources = new Set(edges.map((e) => e.source));
    for (const gate of gates) {
      if (!nodes.some((n) => (n.data as { kind: WorkflowNodeKind }).kind === gate.kind)) {
        issues.push(`Missing ${gate.label} gate.`);
      }
    }
    nodes.forEach((n) => {
      if (!targets.has(n.id) && !sources.has(n.id) && nodes.length > 1) {
        issues.push(`Node "${(n.data as { label: string }).label}" is disconnected.`);
      }
    });
    blockers.forEach((gate) => issues.push(`${gate.label}: ${gate.detail}`));
    return issues;
  }

  function save() {
    const issues = validate();
    setValidation(issues);
    const graph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: cleanNodeData(n.data as { label: string; kind: WorkflowNodeKind }),
      })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    void upsert({ ...project, workflow: graph });
    setMessage(
      issues.length
        ? "Workflow saved with open engineering gates."
        : "Workflow saved and gates are ready for issue review.",
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <section className="app-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Issue Readiness
            </div>
            {ready ? (
              <CheckCircle2 className="size-4 text-compliant" />
            ) : (
              <ShieldAlert className="size-4 text-warning" />
            )}
          </div>
          <div className="text-sm font-semibold">
            {ready ? "Ready for review" : `${blockers.length} gate(s) open`}
          </div>
          <p className="text-xs text-muted-foreground">
            Workflow status is driven by real project basis, calculations, compliance, integrity,
            and reviewer data.
          </p>
          <div className="grid gap-2">
            {gates.map((gate) => (
              <div key={gate.kind} className="rounded-sm border bg-background p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{gate.label}</span>
                  <StatusBadge status={gate.status} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{gate.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-card p-3 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Node Palette
          </div>
          {KINDS.map((k) => (
            <button
              key={k.kind}
              onClick={() => addNode(k.kind, k.label)}
              className="tap-target flex w-full items-center gap-2 rounded-sm border bg-muted/40 px-2 py-2 text-left text-xs hover:bg-muted"
            >
              <Plus className="size-3.5" /> {k.label}
            </button>
          ))}
          <div className="border-t pt-3 space-y-2">
            <button
              onClick={save}
              className="tap-target flex w-full items-center justify-center gap-1 rounded-sm bg-primary px-2 py-2 text-xs text-primary-foreground"
            >
              <Save className="size-3.5" /> Save Workflow
            </button>
            <button
              onClick={() =>
                workflowSummary(project, {
                  nodes: nodes.map((n) => ({
                    id: n.id,
                    position: n.position,
                    data: cleanNodeData(n.data as { label: string; kind: WorkflowNodeKind }),
                  })),
                  edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
                })
              }
              className="tap-target flex w-full items-center justify-center gap-1 rounded-sm border px-2 py-2 text-xs hover:bg-muted"
            >
              <FileText className="size-3.5" /> Export Summary PDF
            </button>
            <Link
              to="/engineer/reports"
              className="tap-target flex w-full items-center justify-center rounded-sm border px-2 py-2 text-xs hover:bg-muted"
            >
              Open Reports
            </Link>
          </div>
          {message && (
            <div className="rounded-sm border bg-muted p-2 text-xs text-muted-foreground">
              {message}
            </div>
          )}
          {validation.length > 0 && (
            <div className="rounded-sm border border-warning/30 bg-warning/10 p-2 text-[11px] text-muted-foreground">
              {validation.slice(0, 6).map((v) => (
                <div key={v}>{v}</div>
              ))}
            </div>
          )}
        </section>
      </aside>

      <section className="h-[calc(100vh-170px)] min-h-[520px] border bg-card">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </section>
    </div>
  );
}

function buildGates(p: Project): Gate[] {
  const findings = evaluate(p);
  const compliance = score(findings);
  const classInfo = classLocation(p.classLocation);
  const smys = materialSmys(p.materialGrade);
  const wall =
    p.outsideDiameter_mm && p.wallThickness_mm
      ? wallThickness({
          designPressure_MPa: p.designPressure_MPa,
          outsideDiameter_mm: p.outsideDiameter_mm,
          SMYS_MPa: smys,
          designFactor: classInfo.designFactor,
          corrosionAllowance_mm: p.corrosionAllowance_mm,
          selectedWall_mm: p.wallThickness_mm,
        })
      : null;
  const derivedMaop =
    p.outsideDiameter_mm && p.wallThickness_mm
      ? maop({
          wallThickness_mm: p.wallThickness_mm,
          outsideDiameter_mm: p.outsideDiameter_mm,
          SMYS_MPa: smys,
          designFactor: classInfo.designFactor,
          corrosionAllowance_mm: p.corrosionAllowance_mm,
          limit_MPa: p.designPressure_MPa,
        })
      : null;
  const hydrotestOk = !!(
    p.MAOP_MPa &&
    p.hydrotestPressure_MPa &&
    p.hydrotestPressure_MPa >= 1.25 * p.MAOP_MPa
  );
  const integrityRequired =
    p.fluidType === "liquid" || p.fluidType === "water_injection" || p.designLife_years >= 25;

  return [
    gate(
      "design_basis",
      "Design Basis",
      basisComplete(p) ? "compliant" : "incomplete",
      basisComplete(p)
        ? "Basis fields are populated."
        : "Complete project, code, route, OD, pressure, material, and reviewer basis.",
      "Complete Design Basis.",
    ),
    gate(
      "hydraulic",
      "Hydraulics",
      p.outsideDiameter_mm ? "warning" : "incomplete",
      p.outsideDiameter_mm
        ? "Screening hydraulics available; detailed route model still required."
        : "Select OD/NPS before hydraulic screening.",
      "Run velocity, pressure drop, surge, and vapor-pressure checks.",
    ),
    gate(
      "wall_thickness",
      "Wall Thickness",
      wall?.pass === false ? "noncompliant" : wall ? "compliant" : "incomplete",
      wall
        ? `Required wall ${wall.value} mm; selected ${p.wallThickness_mm} mm.`
        : "Wall check cannot run without OD and wall.",
      "Use design assistant/optimizer to close pressure wall.",
    ),
    gate(
      "material",
      "Material",
      p.materialGrade ? "warning" : "incomplete",
      p.materialGrade
        ? "Material selected; qualification still requires project specification, toughness, and service review."
        : "Select line-pipe material.",
      "Confirm material spec and service compatibility.",
    ),
    gate(
      "hydrotest",
      "Hydrotest",
      hydrotestOk ? "compliant" : "incomplete",
      hydrotestOk
        ? "Hydrotest ratio screen is closed."
        : "Set MAOP and hydrotest pressure at or above screening ratio.",
      "Confirm test pack, elevation head, and weakest component.",
    ),
    gate(
      "integrity",
      "Integrity Review",
      integrityRequired ? "warning" : "compliant",
      integrityRequired
        ? "Integrity plan required for liquid/injection/long-life service."
        : "No special integrity trigger in screening basis.",
      "Complete threat register and anomaly plan.",
    ),
    gate(
      "approval",
      "Approval",
      compliance.score >= 80 && p.reviewer ? "compliant" : "incomplete",
      p.reviewer
        ? `Reviewer assigned; compliance score ${compliance.score}%.`
        : "Assign independent reviewer and close compliance findings.",
      "Assign reviewer and issue controlled reports.",
    ),
  ];
}

function gate(
  kind: WorkflowNodeKind,
  label: string,
  status: ComplianceStatus,
  detail: string,
  action: string,
): Gate {
  return { kind, label, status, detail, action };
}

function basisComplete(p: Project) {
  return !!(
    p.name &&
    p.client &&
    p.engineer &&
    p.reviewer &&
    p.designCode &&
    p.region &&
    p.outsideDiameter_mm &&
    p.wallThickness_mm &&
    p.designPressure_MPa > 0 &&
    p.materialGrade
  );
}

function materialSmys(grade: string) {
  if (grade.includes("X70")) return 483;
  if (grade.includes("X65")) return 448;
  if (grade.includes("X60")) return 414;
  if (grade.includes("X52")) return 359;
  return 414;
}

function cleanNodeData(data: { label: string; kind: WorkflowNodeKind }) {
  const canonical = KINDS.find((item) => item.kind === data.kind)?.label ?? data.label;
  return { ...data, label: canonical };
}

function applyGateStyles(nodes: Node[], gateMap: Map<WorkflowNodeKind, Gate>) {
  return nodes.map((node) => {
    const kind = (node.data as { kind: WorkflowNodeKind }).kind;
    const gate = gateMap.get(kind);
    const label = cleanNodeData(node.data as { label: string; kind: WorkflowNodeKind }).label;
    const color =
      gate?.status === "compliant"
        ? "var(--compliant)"
        : gate?.status === "warning"
          ? "var(--warning)"
          : gate?.status === "noncompliant"
            ? "var(--noncompliant)"
            : "var(--incomplete)";
    return {
      ...node,
      data: {
        ...node.data,
        label: `${label}${gate ? `\n${gate.status.toUpperCase()}` : ""}`,
      },
      style: {
        whiteSpace: "pre-line",
        fontSize: 12,
        padding: 10,
        border: `2px solid ${color}`,
        borderRadius: 4,
        background: "var(--color-card)",
        color: "var(--color-foreground)",
        minWidth: 150,
      },
    };
  });
}
