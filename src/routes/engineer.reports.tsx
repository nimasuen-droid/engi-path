import { createFileRoute } from '@tanstack/react-router';
import { RequireActiveProject } from '@/components/RequireActiveProject';
import { useProjects } from '@/state/projects';
import { designBasisMemo, wallThicknessReport, hydrotestReport, complianceSummary, workflowSummary } from '@/services/reports/pdf';
import { evaluate } from '@/services/rules/library';
import { FileText } from 'lucide-react';

export const Route = createFileRoute('/engineer/reports')({
  component: () => <RequireActiveProject>{(id) => <Reports id={id} />}</RequireActiveProject>,
});

function Reports({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const findings = evaluate(p);
  const reports = [
    { name: 'Design Basis Memo', fn: () => designBasisMemo(p) },
    { name: 'Wall Thickness Report', fn: () => wallThicknessReport(p) },
    { name: 'Hydrotest Report', fn: () => hydrotestReport(p) },
    { name: 'Compliance Summary', fn: () => complianceSummary(p, findings) },
    { name: 'Workflow Summary', fn: () => workflowSummary(p, p.workflow) },
  ];
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {reports.map((r) => (
        <button key={r.name} onClick={r.fn} className="border bg-card p-4 text-left hover:border-primary transition-colors">
          <FileText className="size-5 text-primary" />
          <div className="mt-2 font-semibold text-sm">{r.name}</div>
          <div className="text-xs text-muted-foreground mt-1">Generate PDF · {p.name}</div>
        </button>
      ))}
    </div>
  );
}
