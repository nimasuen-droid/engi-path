import { createFileRoute } from '@tanstack/react-router';
import { RequireActiveProject } from '@/components/RequireActiveProject';
import { useProjects } from '@/state/projects';
import { useState } from 'react';
import type { Project, FluidType, InstallationType } from '@/models';
import { CODES } from '@/services/codes/library';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export const Route = createFileRoute('/engineer/basis')({
  component: () => <RequireActiveProject>{(id) => <BasisWizard id={id} />}</RequireActiveProject>,
});

const STEPS = ['Pipeline Type', 'Installation', 'Fluid Properties', 'Design Conditions', 'Route Conditions', 'Material', 'Applicable Codes'];

function BasisWizard({ id }: { id: string }) {
  const { projects, upsert } = useProjects();
  const project = projects.find((p) => p.id === id)!;
  const [p, setP] = useState<Project>(project);
  const [step, setStep] = useState(0);
  const upd = <K extends keyof Project>(k: K, v: Project[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const applicableCodes = CODES.filter((c) => c.applicability.includes(p.fluidType) || c.applicability.includes(p.installationType));

  function save() { void upsert(p); }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <button onClick={() => setStep(i)} className={`size-7 rounded-full text-[10px] font-mono flex items-center justify-center border-2 transition-colors ${i === step ? 'bg-primary text-primary-foreground border-primary' : i < step ? 'bg-compliant text-compliant-foreground border-compliant' : 'bg-card border-border text-muted-foreground'}`}>
              {i < step ? <Check className="size-3" /> : i + 1}
            </button>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-compliant' : 'bg-border'}`} />}
          </div>
        ))}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
      <h2 className="text-lg font-semibold mb-4">{STEPS[step]}</h2>

      <div className="border bg-card p-6 space-y-3 text-sm">
        {step === 0 && (
          <Row label="Pipeline Type / Fluid">
            <select className={inp} value={p.fluidType} onChange={(e) => upd('fluidType', e.target.value as FluidType)}>
              {(['gas','liquid','multiphase','water_injection','co2','hydrogen'] as FluidType[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <Hint text="Drives applicable design code (B31.8 for gas, B31.4 for liquids, B31.12 for H₂, DNV-RP-F104 for CO₂)." />
          </Row>
        )}
        {step === 1 && (
          <Row label="Installation">
            <select className={inp} value={p.installationType} onChange={(e) => upd('installationType', e.target.value as InstallationType)}>
              {(['onshore','offshore','buried','above_ground','subsea'] as InstallationType[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <Hint text="Offshore / subsea activates DNV-ST-F101 LRFD framework." />
          </Row>
        )}
        {step === 2 && (
          <>
            <Row label="Sour Service (H₂S)">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!p.sourService} onChange={(e) => upd('sourService', e.target.checked)} /> Activates NACE MR0175 / ISO 15156</label>
            </Row>
            <Row label="Class Location (gas)">
              <select className={inp} value={p.classLocation ?? 1} onChange={(e) => upd('classLocation', Number(e.target.value) as 1 | 2 | 3 | 4)}>
                <option value={1}>1 — remote</option><option value={2}>2 — fringe</option><option value={3}>3 — suburban</option><option value={4}>4 — multi-storey</option>
              </select>
              <Hint text="Higher class → lower design factor F." />
            </Row>
          </>
        )}
        {step === 3 && (
          <>
            <Row label="Design Pressure (MPa)"><input type="number" step="0.01" className={inp} value={p.designPressure_MPa} onChange={(e) => upd('designPressure_MPa', Number(e.target.value))} /></Row>
            <Row label="Design Temperature (°C)"><input type="number" className={inp} value={p.designTemperature_C} onChange={(e) => upd('designTemperature_C', Number(e.target.value))} /></Row>
            <Row label="OD (mm)"><input type="number" className={inp} value={p.outsideDiameter_mm ?? ''} onChange={(e) => upd('outsideDiameter_mm', Number(e.target.value))} /></Row>
          </>
        )}
        {step === 4 && (
          <>
            <Row label="Length (km)"><input type="number" step="0.1" className={inp} value={p.length_km} onChange={(e) => upd('length_km', Number(e.target.value))} /></Row>
            <Row label="Region"><input className={inp} value={p.region} onChange={(e) => upd('region', e.target.value)} /></Row>
          </>
        )}
        {step === 5 && (
          <>
            <Row label="Material Grade"><input className={inp} value={p.materialGrade} onChange={(e) => upd('materialGrade', e.target.value)} /></Row>
            <Row label="Corrosion Allowance (mm)"><input type="number" step="0.1" className={inp} value={p.corrosionAllowance_mm} onChange={(e) => upd('corrosionAllowance_mm', Number(e.target.value))} /></Row>
            <Row label="Design Life (yr)"><input type="number" className={inp} value={p.designLife_years} onChange={(e) => upd('designLife_years', Number(e.target.value))} /></Row>
          </>
        )}
        {step === 6 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Codes derived from your basis (summarized — not full text):</div>
            {applicableCodes.map((c) => (
              <div key={c.id} className="border-l-4 border-l-primary bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{c.scope}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{c.summary}</div>
              </div>
            ))}
            <Row label="Governing Design Code"><input className={inp} value={p.designCode} onChange={(e) => upd('designCode', e.target.value)} /></Row>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between">
        <button disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border rounded-sm disabled:opacity-40">
          <ChevronLeft className="size-3" /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={save} className="text-xs px-3 py-1.5 border rounded-sm">Save Draft</button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-sm">
              Next <ChevronRight className="size-3" />
            </button>
          ) : (
            <button onClick={save} className="text-xs px-3 py-1.5 bg-compliant text-compliant-foreground rounded-sm">Finish & Save</button>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full mt-0.5 px-2 py-1 border bg-background rounded-sm font-mono text-sm';
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
function Hint({ text }: { text: string }) { return <div className="mt-1 text-[11px] text-muted-foreground italic">{text}</div>; }
