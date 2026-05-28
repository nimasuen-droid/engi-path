import { createFileRoute } from '@tanstack/react-router';
import { RequireActiveProject } from '@/components/RequireActiveProject';
import { useProjects } from '@/state/projects';
import { Upload, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export const Route = createFileRoute('/engineer/review')({
  component: () => <RequireActiveProject>{(id) => <Review id={id} />}</RequireActiveProject>,
});

// Phase 2 scaffold — mock findings only.
function Review({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const mockFindings = [
    { id: 'm1', title: 'Corrosion allowance missing', status: 'noncompliant' as const, location: 'Design Basis §2.4', detail: 'CA not declared in basis memo for sour service segments.' },
    { id: 'm2', title: 'MAOP / wall thickness mismatch', status: 'warning' as const, location: 'Mechanical §3.1', detail: 'Declared MAOP exceeds derived value by ~3%.' },
    { id: 'm3', title: 'Hydrotest pressure below minimum', status: 'noncompliant' as const, location: 'Test Pack §4.2', detail: 'Recorded test < 1.25 × MAOP.' },
    { id: 'm4', title: 'Material incompatibility (H₂S)', status: 'warning' as const, location: 'Material §5.0', detail: 'Hardness above NACE MR0175 limit for sour service.' },
  ];
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border bg-card p-8 text-center">
        <Upload className="size-6 mx-auto text-muted-foreground" />
        <div className="mt-2 text-sm font-medium">Upload design package</div>
        <div className="text-xs text-muted-foreground">PDF, DWG, XLS — parsing engine arrives in Phase 2. Showing sample findings.</div>
        <button disabled className="mt-3 text-xs bg-incomplete text-incomplete-foreground px-3 py-1.5 rounded-sm">Upload (Coming Soon)</button>
      </div>
      <div className="border bg-card divide-y">
        <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Sample findings · {p.name}</div>
        {mockFindings.map((f) => (
          <div key={f.id} className="p-4 grid md:grid-cols-[140px_1fr_auto] gap-3 items-start">
            <StatusBadge status={f.status} />
            <div>
              <div className="font-semibold text-sm flex items-center gap-1"><AlertTriangle className="size-3.5 text-warning" /> {f.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{f.detail}</div>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">{f.location}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
