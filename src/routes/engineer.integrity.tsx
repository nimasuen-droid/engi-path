import { createFileRoute } from '@tanstack/react-router';
import { RequireActiveProject } from '@/components/RequireActiveProject';
import { useProjects } from '@/state/projects';
import { MetricCard } from '@/components/MetricCard';
import { useState } from 'react';

export const Route = createFileRoute('/engineer/integrity')({
  component: () => <RequireActiveProject>{(id) => <Integrity id={id} />}</RequireActiveProject>,
});

function Integrity({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const [growth, setGrowth] = useState(0.1); // mm/yr
  const [defect, setDefect] = useState(1.5); // current metal loss mm

  const remainingLifeYears = p.wallThickness_mm && p.corrosionAllowance_mm
    ? Math.max(0, ((p.wallThickness_mm - p.corrosionAllowance_mm) - defect) / growth)
    : 0;
  const inspectionInterval = Math.max(1, Math.round(remainingLifeYears / 2));

  const anomalies = [
    { id: 'A-001', km: 12.4, type: 'External corrosion', severity: 'noncompliant' as const, depthPct: 42 },
    { id: 'A-002', km: 28.9, type: 'Dent', severity: 'warning' as const, depthPct: 18 },
    { id: 'A-003', km: 41.2, type: 'Metal loss', severity: 'compliant' as const, depthPct: 8 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Remaining Life" value={remainingLifeYears.toFixed(1)} unit="yr" status={remainingLifeYears > 10 ? 'compliant' : remainingLifeYears > 3 ? 'warning' : 'noncompliant'} />
        <MetricCard label="Suggested Inspection" value={inspectionInterval} unit="yr" />
        <MetricCard label="Anomalies" value={anomalies.length} />
        <MetricCard label="Reference" value="API 1160 / 579" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="border bg-card p-4 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Corrosion Inputs</div>
          <label className="block text-xs">Growth rate (mm/yr)
            <input type="number" step="0.01" value={growth} onChange={(e) => setGrowth(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 border bg-background rounded-sm font-mono" />
          </label>
          <label className="block text-xs">Current metal loss (mm)
            <input type="number" step="0.1" value={defect} onChange={(e) => setDefect(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 border bg-background rounded-sm font-mono" />
          </label>
          <div className="text-[10px] text-muted-foreground">Pipe wall: {p.wallThickness_mm ?? '—'} mm · CA: {p.corrosionAllowance_mm} mm</div>
        </div>
        <div className="border bg-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">ID</th><th>KP</th><th>Type</th><th>Depth %</th><th>Status</th></tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-3 py-1.5 font-mono">{a.id}</td>
                  <td className="px-3 py-1.5 font-mono">{a.km}</td>
                  <td className="px-3 py-1.5">{a.type}</td>
                  <td className="px-3 py-1.5 font-mono">{a.depthPct}</td>
                  <td className="px-3 py-1.5"><span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm bg-${a.severity} text-${a.severity}-foreground`}>{a.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground italic">Phase 2 module — RBI / FFS engine arriving next iteration.</div>
    </div>
  );
}
