import { createFileRoute } from '@tanstack/react-router';
import { RequireActiveProject } from '@/components/RequireActiveProject';
import { useProjects } from '@/state/projects';
import { useMemo, useState } from 'react';
import { wallThickness, maop, hydrotest, hoopStress, velocity, pressureDrop, pipeSizing, designFactorByClass } from '@/services/calculations';
import { CalcResultCard } from '@/components/CalcResultCard';

export const Route = createFileRoute('/engineer/calculations')({
  component: () => <RequireActiveProject>{(id) => <Calcs id={id} />}</RequireActiveProject>,
});

const TABS = ['Wall Thickness', 'MAOP', 'Hydrotest', 'Sizing', 'Pressure Drop', 'Velocity', 'Hoop Stress', 'Design Factor'] as const;

function Calcs({ id }: { id: string }) {
  const { projects, upsert } = useProjects();
  const p = projects.find((x) => x.id === id)!;
  const [tab, setTab] = useState<typeof TABS[number]>('Wall Thickness');
  const [smys, setSmys] = useState(414);
  const [F, setF] = useState(0.72);
  const [Q, setQ] = useState(2);
  const [v, setV] = useState(3);
  const [rho, setRho] = useState(850);
  const [f, setFD] = useState(0.018);

  const t = useMemo(() => p.outsideDiameter_mm ? wallThickness({ designPressure_MPa: p.designPressure_MPa, outsideDiameter_mm: p.outsideDiameter_mm, SMYS_MPa: smys, designFactor: F, corrosionAllowance_mm: p.corrosionAllowance_mm }) : null, [p, smys, F]);
  const mp = useMemo(() => (p.outsideDiameter_mm && p.wallThickness_mm) ? maop({ wallThickness_mm: p.wallThickness_mm, outsideDiameter_mm: p.outsideDiameter_mm, SMYS_MPa: smys, designFactor: F, corrosionAllowance_mm: p.corrosionAllowance_mm, limit_MPa: p.designPressure_MPa }) : null, [p, smys, F]);
  const hy = useMemo(() => p.MAOP_MPa ? hydrotest({ MAOP_MPa: p.MAOP_MPa }) : null, [p]);
  const sz = useMemo(() => pipeSizing({ Q_m3s: Q, targetV_ms: v }), [Q, v]);
  const ve = useMemo(() => p.outsideDiameter_mm ? velocity({ Q_m3s: Q, D_mm: p.outsideDiameter_mm, max_ms: 4 }) : null, [Q, p]);
  const pd = useMemo(() => p.outsideDiameter_mm ? pressureDrop({ f, D_mm: p.outsideDiameter_mm, rho_kgm3: rho, v_ms: v }) : null, [f, rho, v, p]);
  const hs = useMemo(() => (p.outsideDiameter_mm && p.wallThickness_mm) ? hoopStress({ P_MPa: p.designPressure_MPa, D_mm: p.outsideDiameter_mm, t_mm: p.wallThickness_mm, SMYS_MPa: smys, allow_pctSMYS: F * 100 }) : null, [p, smys, F]);
  const df = useMemo(() => designFactorByClass(p.classLocation ?? 1), [p.classLocation]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-2 border-b-2 -mb-px ${tab === t ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="border bg-card p-4 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Inputs</div>
          <Sm label="OD (mm)" value={p.outsideDiameter_mm ?? 0} on={(n) => upsert({ ...p, outsideDiameter_mm: n })} />
          <Sm label="Wall Thickness t (mm)" value={p.wallThickness_mm ?? 0} on={(n) => upsert({ ...p, wallThickness_mm: n })} />
          <Sm label="Design Pressure (MPa)" value={p.designPressure_MPa} on={(n) => upsert({ ...p, designPressure_MPa: n })} step={0.01} />
          <Sm label="Corrosion Allowance (mm)" value={p.corrosionAllowance_mm} on={(n) => upsert({ ...p, corrosionAllowance_mm: n })} step={0.1} />
          <Sm label="SMYS (MPa)" value={smys} on={setSmys} />
          <Sm label="Design Factor F" value={F} on={setF} step={0.01} />
          <Sm label="MAOP (MPa)" value={p.MAOP_MPa ?? 0} on={(n) => upsert({ ...p, MAOP_MPa: n })} step={0.01} />
          <Sm label="Hydrotest (MPa)" value={p.hydrotestPressure_MPa ?? 0} on={(n) => upsert({ ...p, hydrotestPressure_MPa: n })} step={0.01} />
          <div className="pt-2 border-t border-border">
            <Sm label="Flow Q (m³/s)" value={Q} on={setQ} step={0.1} />
            <Sm label="Target velocity v (m/s)" value={v} on={setV} step={0.1} />
            <Sm label="Density ρ (kg/m³)" value={rho} on={setRho} />
            <Sm label="Darcy friction f" value={f} on={setFD} step={0.001} />
          </div>
        </div>

        <div>
          {tab === 'Wall Thickness' && (t ? <CalcResultCard title="Wall Thickness" result={t} /> : <Empty msg="Set OD to compute." />)}
          {tab === 'MAOP' && (mp ? <CalcResultCard title="MAOP" result={mp} /> : <Empty msg="Set OD and t to compute." />)}
          {tab === 'Hydrotest' && (hy ? <CalcResultCard title="Recommended Hydrotest" result={hy} /> : <Empty msg="Set MAOP to compute." />)}
          {tab === 'Sizing' && <CalcResultCard title="Min. ID for target velocity" result={sz} />}
          {tab === 'Pressure Drop' && (pd ? <CalcResultCard title="Pressure Drop / km" result={pd} /> : <Empty msg="Set OD to compute." />)}
          {tab === 'Velocity' && (ve ? <CalcResultCard title="Fluid Velocity" result={ve} /> : <Empty msg="Set OD to compute." />)}
          {tab === 'Hoop Stress' && (hs ? <CalcResultCard title="Hoop Stress" result={hs} /> : <Empty msg="Set OD and t to compute." />)}
          {tab === 'Design Factor' && <CalcResultCard title={`Class ${p.classLocation ?? 1} Design Factor`} result={df} />}
        </div>
      </div>
    </div>
  );
}

function Sm({ label, value, on, step = 1 }: { label: string; value: number; on: (n: number) => void; step?: number }) {
  return (
    <label className="block text-xs">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => on(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 border bg-background rounded-sm font-mono" />
    </label>
  );
}
function Empty({ msg }: { msg: string }) { return <div className="border bg-card p-8 text-center text-sm text-muted-foreground">{msg}</div>; }
