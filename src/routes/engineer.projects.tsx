import { createFileRoute } from '@tanstack/react-router';
import { useProjects } from '@/state/projects';
import { useState } from 'react';
import type { Project, FluidType, InstallationType } from '@/models';
import { Plus, Copy, Archive, Trash2, X, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export const Route = createFileRoute('/engineer/projects')({
  component: Projects,
});

const FLUIDS: FluidType[] = ['gas', 'liquid', 'multiphase', 'water_injection', 'co2', 'hydrogen'];
const INSTALLS: InstallationType[] = ['onshore', 'offshore', 'buried', 'above_ground', 'subsea'];

function blankProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: '', client: '', fluidType: 'gas', installationType: 'onshore',
    designCode: 'ASME B31.8', region: '', engineer: '',
    designPressure_MPa: 9.93, designTemperature_C: 40, corrosionAllowance_mm: 3,
    materialGrade: 'API 5L X60', length_km: 10, designLife_years: 30,
    outsideDiameter_mm: 762, classLocation: 1,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

function Projects() {
  const { projects, upsert, remove, duplicate, archive, setActive, activeProjectId } = useProjects();
  const [edit, setEdit] = useState<Project | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Projects</h2>
        <button onClick={() => setEdit(blankProject())} className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-sm hover:opacity-90">
          <Plus className="size-3.5" /> New Project
        </button>
      </div>
      <div className="border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr className="text-left font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
              <th className="px-3 py-2">Active</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Fluid</th><th className="px-3 py-2">Install</th><th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">L (km)</th><th className="px-3 py-2">P (MPa)</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No projects. Click "New Project".</td></tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className={`border-t ${p.archived ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2">
                  <input type="radio" name="active" checked={activeProjectId === p.id} onChange={() => setActive(p.id)} />
                </td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.client}</td>
                <td className="px-3 py-2 font-mono">{p.fluidType}</td>
                <td className="px-3 py-2 font-mono">{p.installationType}</td>
                <td className="px-3 py-2 font-mono">{p.designCode}</td>
                <td className="px-3 py-2 font-mono">{p.length_km}</td>
                <td className="px-3 py-2 font-mono">{p.designPressure_MPa}</td>
                <td className="px-3 py-2">{p.archived ? <StatusBadge status="incomplete">archived</StatusBadge> : <StatusBadge status="compliant">active</StatusBadge>}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <button title="Edit" onClick={() => setEdit(p)} className="p-1 hover:bg-muted rounded-sm"><Pencil className="size-3.5" /></button>
                    <button title="Duplicate" onClick={() => duplicate(p.id)} className="p-1 hover:bg-muted rounded-sm"><Copy className="size-3.5" /></button>
                    <button title={p.archived ? 'Unarchive' : 'Archive'} onClick={() => archive(p.id, !p.archived)} className="p-1 hover:bg-muted rounded-sm"><Archive className="size-3.5" /></button>
                    <button title="Delete" onClick={() => confirm('Delete project?') && remove(p.id)} className="p-1 hover:bg-destructive/10 text-destructive rounded-sm"><Trash2 className="size-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && <Editor project={edit} onClose={() => setEdit(null)} onSave={(p) => { void upsert(p); setActive(p.id); setEdit(null); }} />}
    </div>
  );
}

function Editor({ project, onClose, onSave }: { project: Project; onClose: () => void; onSave: (p: Project) => void }) {
  const [p, setP] = useState<Project>(project);
  const upd = <K extends keyof Project>(k: K, v: Project[K]) => setP((prev) => ({ ...prev, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{project.name ? `Edit · ${project.name}` : 'New Project'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-sm"><X className="size-4" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 text-xs">
          <Field label="Name"><input className={inp} value={p.name} onChange={(e) => upd('name', e.target.value)} /></Field>
          <Field label="Client"><input className={inp} value={p.client} onChange={(e) => upd('client', e.target.value)} /></Field>
          <Field label="Engineer"><input className={inp} value={p.engineer} onChange={(e) => upd('engineer', e.target.value)} /></Field>
          <Field label="Reviewer"><input className={inp} value={p.reviewer ?? ''} onChange={(e) => upd('reviewer', e.target.value)} /></Field>
          <Field label="Region"><input className={inp} value={p.region} onChange={(e) => upd('region', e.target.value)} /></Field>
          <Field label="Design Code"><input className={inp} value={p.designCode} onChange={(e) => upd('designCode', e.target.value)} /></Field>
          <Field label="Fluid">
            <select className={inp} value={p.fluidType} onChange={(e) => upd('fluidType', e.target.value as FluidType)}>
              {FLUIDS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Installation">
            <select className={inp} value={p.installationType} onChange={(e) => upd('installationType', e.target.value as InstallationType)}>
              {INSTALLS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Material Grade"><input className={inp} value={p.materialGrade} onChange={(e) => upd('materialGrade', e.target.value)} /></Field>
          <Field label="Class Location (gas)">
            <select className={inp} value={p.classLocation ?? 1} onChange={(e) => upd('classLocation', Number(e.target.value) as 1 | 2 | 3 | 4)}>
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
          </Field>
          <Field label="OD (mm)"><input type="number" className={inp} value={p.outsideDiameter_mm ?? ''} onChange={(e) => upd('outsideDiameter_mm', Number(e.target.value))} /></Field>
          <Field label="Wall Thickness (mm, optional)"><input type="number" className={inp} value={p.wallThickness_mm ?? ''} onChange={(e) => upd('wallThickness_mm', Number(e.target.value))} /></Field>
          <Field label="Design Pressure (MPa)"><input type="number" step="0.01" className={inp} value={p.designPressure_MPa} onChange={(e) => upd('designPressure_MPa', Number(e.target.value))} /></Field>
          <Field label="Design Temperature (°C)"><input type="number" className={inp} value={p.designTemperature_C} onChange={(e) => upd('designTemperature_C', Number(e.target.value))} /></Field>
          <Field label="Corrosion Allowance (mm)"><input type="number" step="0.1" className={inp} value={p.corrosionAllowance_mm} onChange={(e) => upd('corrosionAllowance_mm', Number(e.target.value))} /></Field>
          <Field label="Length (km)"><input type="number" step="0.1" className={inp} value={p.length_km} onChange={(e) => upd('length_km', Number(e.target.value))} /></Field>
          <Field label="Design Life (yr)"><input type="number" className={inp} value={p.designLife_years} onChange={(e) => upd('designLife_years', Number(e.target.value))} /></Field>
          <Field label="MAOP (MPa, optional)"><input type="number" step="0.01" className={inp} value={p.MAOP_MPa ?? ''} onChange={(e) => upd('MAOP_MPa', Number(e.target.value))} /></Field>
          <Field label="Hydrotest (MPa, optional)"><input type="number" step="0.01" className={inp} value={p.hydrotestPressure_MPa ?? ''} onChange={(e) => upd('hydrotestPressure_MPa', Number(e.target.value))} /></Field>
          <Field label="Sour Service">
            <label className="flex items-center gap-2 mt-1"><input type="checkbox" checked={!!p.sourService} onChange={(e) => upd('sourService', e.target.checked)} /> H₂S exposure</label>
          </Field>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-3 py-1.5 border rounded-sm">Cancel</button>
          <button disabled={!p.name} onClick={() => onSave(p)} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-sm disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full mt-0.5 px-2 py-1 border bg-background rounded-sm font-mono';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
