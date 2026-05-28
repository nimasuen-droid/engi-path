import { createFileRoute } from '@tanstack/react-router';
import { RequireActiveProject } from '@/components/RequireActiveProject';
import { useProjects } from '@/state/projects';
import { useCallback, useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, applyEdgeChanges, applyNodeChanges, type Node, type Edge, type Connection, type NodeChange, type EdgeChange, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import type { WorkflowNodeKind } from '@/models';
import { Save, Plus } from 'lucide-react';
import { workflowSummary } from '@/services/reports/pdf';

export const Route = createFileRoute('/engineer/workflow')({
  component: () => <RequireActiveProject>{(id) => <Builder id={id} />}</RequireActiveProject>,
});

const KIND_COLORS: Record<WorkflowNodeKind, string> = {
  design_basis: 'border-primary',
  hydraulic: 'border-chart-2',
  wall_thickness: 'border-warning',
  material: 'border-accent-foreground',
  hydrotest: 'border-compliant',
  integrity: 'border-noncompliant',
  approval: 'border-graphite',
};

const KINDS: { kind: WorkflowNodeKind; label: string }[] = [
  { kind: 'design_basis', label: 'Design Basis' },
  { kind: 'hydraulic', label: 'Hydraulic Calculation' },
  { kind: 'wall_thickness', label: 'Wall Thickness' },
  { kind: 'material', label: 'Material Selection' },
  { kind: 'hydrotest', label: 'Hydrotest' },
  { kind: 'integrity', label: 'Integrity Review' },
  { kind: 'approval', label: 'Approval' },
];

function defaultGraph(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: KINDS.map((k, i) => ({
      id: k.kind,
      position: { x: 60 + (i % 4) * 200, y: 60 + Math.floor(i / 4) * 140 },
      data: { label: k.label, kind: k.kind },
      style: { fontSize: 12, padding: 8, border: '2px solid var(--color-border)', borderRadius: 4, background: 'var(--color-card)', color: 'var(--color-foreground)' },
    })),
    edges: [
      { id: 'e1', source: 'design_basis', target: 'hydraulic', markerEnd: { type: MarkerType.Arrow } },
      { id: 'e2', source: 'hydraulic', target: 'wall_thickness', markerEnd: { type: MarkerType.Arrow } },
      { id: 'e3', source: 'wall_thickness', target: 'material', markerEnd: { type: MarkerType.Arrow } },
      { id: 'e4', source: 'material', target: 'hydrotest', markerEnd: { type: MarkerType.Arrow } },
      { id: 'e5', source: 'hydrotest', target: 'integrity', markerEnd: { type: MarkerType.Arrow } },
      { id: 'e6', source: 'integrity', target: 'approval', markerEnd: { type: MarkerType.Arrow } },
    ],
  };
}

function Builder({ id }: { id: string }) {
  const { projects, upsert } = useProjects();
  const project = projects.find((x) => x.id === id)!;
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [validation, setValidation] = useState<string[]>([]);

  useEffect(() => {
    if (project.workflow) {
      setNodes(project.workflow.nodes.map((n) => ({ id: n.id, position: n.position, data: n.data, style: { fontSize: 12, padding: 8, border: '2px solid var(--color-border)', borderRadius: 4, background: 'var(--color-card)', color: 'var(--color-foreground)' } })));
      setEdges(project.workflow.edges.map((e) => ({ ...e, markerEnd: { type: MarkerType.Arrow } })));
    } else {
      const d = defaultGraph();
      setNodes(d.nodes); setEdges(d.edges);
    }
  }, [project.id]);

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((nds) => applyNodeChanges(c, nds)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(c, eds)), []);
  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.Arrow } }, eds)), []);

  function addNode(kind: WorkflowNodeKind, label: string) {
    setNodes((nds) => [...nds, {
      id: `${kind}-${Date.now()}`,
      position: { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
      data: { label, kind },
      style: { fontSize: 12, padding: 8, border: '2px solid var(--color-border)', borderRadius: 4, background: 'var(--color-card)', color: 'var(--color-foreground)' },
    }]);
  }

  function validate(): string[] {
    const issues: string[] = [];
    const ids = new Set(nodes.map((n) => n.id));
    const targets = new Set(edges.map((e) => e.target));
    const sources = new Set(edges.map((e) => e.source));
    if (!nodes.find((n) => (n.data as { kind: WorkflowNodeKind }).kind === 'design_basis')) issues.push('Missing Design Basis node.');
    if (!nodes.find((n) => (n.data as { kind: WorkflowNodeKind }).kind === 'approval')) issues.push('Missing Approval node.');
    nodes.forEach((n) => {
      if (!targets.has(n.id) && !sources.has(n.id) && ids.size > 1) issues.push(`Node "${(n.data as { label: string }).label}" is disconnected.`);
    });
    return issues;
  }

  function save() {
    const issues = validate();
    setValidation(issues);
    const graph = {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data as { label: string; kind: WorkflowNodeKind } })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    void upsert({ ...project, workflow: graph });
  }

  return (
    <div className="grid grid-cols-[200px_1fr] gap-3 h-[calc(100vh-160px)]">
      <div className="border bg-card p-3 space-y-3 overflow-y-auto">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Node Palette</div>
        {KINDS.map((k) => (
          <button key={k.kind} onClick={() => addNode(k.kind, k.label)} className={`w-full text-left text-xs border-l-4 ${KIND_COLORS[k.kind]} bg-muted/40 px-2 py-1.5 hover:bg-muted flex items-center gap-1`}>
            <Plus className="size-3" /> {k.label}
          </button>
        ))}
        <div className="pt-2 border-t border-border space-y-2">
          <button onClick={save} className="w-full text-xs bg-primary text-primary-foreground px-2 py-1.5 rounded-sm flex items-center justify-center gap-1"><Save className="size-3" /> Save Workflow</button>
          <button onClick={() => workflowSummary(project, { nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data as { label: string; kind: WorkflowNodeKind } })), edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })) })} className="w-full text-xs border px-2 py-1.5 rounded-sm">Export Summary PDF</button>
          {validation.length > 0 && (
            <div className="text-[10px] text-warning space-y-0.5">
              {validation.map((v, i) => <div key={i}>• {v}</div>)}
            </div>
          )}
        </div>
      </div>
      <div className="border bg-card">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
