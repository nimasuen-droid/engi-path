import { createFileRoute } from "@tanstack/react-router";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import { useProjects } from "@/state/projects";
import { useState } from "react";
import type { FluidType, InstallationType, Project } from "@/models";
import { CODES } from "@/services/codes/library";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { LessonPopover } from "@/components/LessonPopover";
import {
  CLASS_LOCATION_OPTIONS,
  CORROSION_ALLOWANCE_OPTIONS,
  DESIGN_LIFE_OPTIONS,
  FLUID_OPTIONS,
  INSTALLATION_OPTIONS,
  MATERIAL_OPTIONS,
  PIPE_SIZE_OPTIONS,
  REGION_OPTIONS,
  classLocation,
  pipeSizeByOd,
  recommendedDesignCode,
} from "@/data/standards";

export const Route = createFileRoute("/engineer/basis")({
  component: () => <RequireActiveProject>{(id) => <BasisWizard id={id} />}</RequireActiveProject>,
});

const STEPS = [
  "Pipeline Type",
  "Installation",
  "Fluid Properties",
  "Design Conditions",
  "Route Conditions",
  "Material",
  "Applicable Codes",
];

function BasisWizard({ id }: { id: string }) {
  const { projects, upsert } = useProjects();
  const project = projects.find((p) => p.id === id)!;
  const [p, setP] = useState<Project>(project);
  const [step, setStep] = useState(0);
  const selectedFluid = FLUID_OPTIONS.find((f) => f.value === p.fluidType) ?? FLUID_OPTIONS[0];
  const selectedInstall =
    INSTALLATION_OPTIONS.find((i) => i.value === p.installationType) ?? INSTALLATION_OPTIONS[0];
  const selectedClass = classLocation(p.classLocation);
  const selectedPipe = pipeSizeByOd(p.outsideDiameter_mm);
  const selectedMaterial =
    MATERIAL_OPTIONS.find((m) => m.grade === p.materialGrade) ?? MATERIAL_OPTIONS[1];

  const upd = <K extends keyof Project>(k: K, v: Project[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));
  const updateBasis = (fluidType: FluidType, installationType: InstallationType) => {
    setP((prev) => ({
      ...prev,
      fluidType,
      installationType,
      designCode: recommendedDesignCode(fluidType, installationType),
    }));
  };

  const applicableCodes = CODES.filter(
    (c) => c.applicability.includes(p.fluidType) || c.applicability.includes(p.installationType),
  );

  function save() {
    void upsert(p);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`size-7 rounded-full text-[10px] font-mono flex items-center justify-center border-2 transition-colors ${i === step ? "bg-primary text-primary-foreground border-primary" : i < step ? "bg-compliant text-compliant-foreground border-compliant" : "bg-card border-border text-muted-foreground"}`}
            >
              {i < step ? <Check className="size-3" /> : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? "bg-compliant" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        Step {step + 1} of {STEPS.length}
      </div>
      <h2 className="text-lg font-semibold mb-4">{STEPS[step]}</h2>

      <div className="border bg-card p-6 space-y-3 text-sm">
        {step === 0 && (
          <Row
            label="Pipeline Type / Fluid"
            lesson={
              <LessonPopover
                title={selectedFluid.label}
                why={selectedFluid.why}
                how={selectedFluid.how}
                drivenBy={selectedFluid.drivenBy}
                codeRef={selectedFluid.codeRef}
              />
            }
          >
            <select
              className={inp}
              value={p.fluidType}
              onChange={(e) => updateBasis(e.target.value as FluidType, p.installationType)}
            >
              {FLUID_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <Hint
              text={`Recommended basis: ${recommendedDesignCode(p.fluidType, p.installationType)}.`}
            />
          </Row>
        )}
        {step === 1 && (
          <Row
            label="Installation"
            lesson={
              <LessonPopover
                title={selectedInstall.label}
                why={selectedInstall.why}
                how={selectedInstall.how}
                drivenBy={selectedInstall.drivenBy}
                codeRef={selectedInstall.codeRef}
              />
            }
          >
            <select
              className={inp}
              value={p.installationType}
              onChange={(e) => updateBasis(p.fluidType, e.target.value as InstallationType)}
            >
              {INSTALLATION_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <Hint text="Installation can change the governing code, design checks, and report assumptions." />
          </Row>
        )}
        {step === 2 && (
          <>
            <Row label="Sour Service (H2S)">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!p.sourService}
                  onChange={(e) => upd("sourService", e.target.checked)}
                />{" "}
                Activates NACE MR0175 / ISO 15156 review
              </label>
            </Row>
            <Row
              label="Class Location (gas)"
              lesson={
                <LessonPopover
                  title={selectedClass.label}
                  why={selectedClass.why}
                  how={selectedClass.how}
                  drivenBy={selectedClass.drivenBy}
                  codeRef={selectedClass.codeRef}
                />
              }
            >
              <select
                className={inp}
                value={p.classLocation ?? 1}
                onChange={(e) => upd("classLocation", Number(e.target.value) as 1 | 2 | 3 | 4)}
              >
                {CLASS_LOCATION_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} - design factor {c.designFactor}
                  </option>
                ))}
              </select>
              <Hint
                text={`Current design factor driver: F = ${selectedClass.designFactor}. Higher class means lower allowable hoop stress utilization.`}
              />
            </Row>
          </>
        )}
        {step === 3 && (
          <>
            <Row
              label="Design Pressure (MPa)"
              lesson={
                <LessonPopover
                  title="Design Pressure"
                  why="Design pressure is the worst credible pressure used for pressure containment calculations, not simply the normal operating value."
                  how="Set it from the design basis, relief/overpressure philosophy, surge analysis, and project specification."
                  drivenBy="MAOP, surge, shut-in, relief settings, operating envelope, and client design margin."
                  codeRef="ASME B31.4/B31.8 pressure design basis"
                />
              }
            >
              <input
                type="number"
                step="0.01"
                className={inp}
                value={p.designPressure_MPa}
                onChange={(e) => upd("designPressure_MPa", Number(e.target.value))}
              />
            </Row>
            <Row label="Design Temperature (deg C)">
              <input
                type="number"
                className={inp}
                value={p.designTemperature_C}
                onChange={(e) => upd("designTemperature_C", Number(e.target.value))}
              />
            </Row>
            <Row
              label="OD / NPS"
              lesson={
                <LessonPopover
                  title={`NPS ${selectedPipe.nps} / OD ${selectedPipe.od_mm} mm`}
                  why={selectedPipe.why}
                  how="Choose NPS from standard pipe outside diameters, then validate wall thickness and available pipe schedules."
                  drivenBy="Flow, pressure drop, standard pipe availability, wall thickness, constructability, and piggability."
                  codeRef={selectedPipe.codeRef}
                />
              }
            >
              <select
                className={inp}
                value={p.outsideDiameter_mm ?? selectedPipe.od_mm}
                onChange={(e) => upd("outsideDiameter_mm", Number(e.target.value))}
              >
                {PIPE_SIZE_OPTIONS.map((s) => (
                  <option key={s.nps} value={s.od_mm}>
                    NPS {s.nps} - OD {s.od_mm} mm
                  </option>
                ))}
              </select>
            </Row>
          </>
        )}
        {step === 4 && (
          <>
            <Row label="Length (km)">
              <input
                type="number"
                step="0.1"
                className={inp}
                value={p.length_km}
                onChange={(e) => upd("length_km", Number(e.target.value))}
              />
            </Row>
            <Row label="Region">
              <select
                className={inp}
                value={p.region}
                onChange={(e) => upd("region", e.target.value)}
              >
                <option value="">Select region</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Row>
          </>
        )}
        {step === 5 && (
          <>
            <Row
              label="Material Grade"
              lesson={
                <LessonPopover
                  title={selectedMaterial.grade}
                  why={selectedMaterial.why}
                  how="Select a material that satisfies strength, toughness, corrosion, temperature, welding, and project specification requirements."
                  drivenBy="SMYS, weldability, sour service, temperature, fracture control, and client specification."
                  codeRef="API 5L / project material specification"
                />
              }
            >
              <select
                className={inp}
                value={p.materialGrade}
                onChange={(e) => upd("materialGrade", e.target.value)}
              >
                {MATERIAL_OPTIONS.map((m) => (
                  <option key={m.grade} value={m.grade}>
                    {m.grade} - SMYS {m.smys_MPa} MPa
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Corrosion Allowance">
              <select
                className={inp}
                value={p.corrosionAllowance_mm}
                onChange={(e) => upd("corrosionAllowance_mm", Number(e.target.value))}
              >
                {CORROSION_ALLOWANCE_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Design Life">
              <select
                className={inp}
                value={p.designLife_years}
                onChange={(e) => upd("designLife_years", Number(e.target.value))}
              >
                {DESIGN_LIFE_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y} years
                  </option>
                ))}
              </select>
            </Row>
          </>
        )}
        {step === 6 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Codes derived from your basis (summarized, not full text):
            </div>
            {applicableCodes.map((c) => (
              <div key={c.id} className="border-l-4 border-l-primary bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {c.scope}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{c.summary}</div>
              </div>
            ))}
            <Row label="Governing Design Code">
              <select
                className={inp}
                value={p.designCode}
                onChange={(e) => upd("designCode", e.target.value)}
              >
                {[
                  "ASME B31.8",
                  "ASME B31.4",
                  "ASME B31.12",
                  "DNV-ST-F101",
                  "DNV-RP-F104",
                  "Project basis / ASME B31.4 or B31.8",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Row>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between">
        <button
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="tap-target inline-flex items-center gap-1 text-xs px-3 py-2 border rounded-sm disabled:opacity-40"
        >
          <ChevronLeft className="size-3" /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={save} className="tap-target text-xs px-3 py-2 border rounded-sm">
            Save Draft
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="tap-target inline-flex items-center gap-1 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-sm"
            >
              Next <ChevronRight className="size-3" />
            </button>
          ) : (
            <button
              onClick={save}
              className="tap-target text-xs px-3 py-2 bg-compliant text-compliant-foreground rounded-sm"
            >
              Finish & Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = "w-full mt-0.5 px-2 py-2 border bg-background rounded-sm font-mono text-sm";
function Row({
  label,
  lesson,
  children,
}: {
  label: string;
  lesson?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
        {lesson}
      </div>
      {children}
    </div>
  );
}
function Hint({ text }: { text: string }) {
  return <div className="mt-1 text-[11px] text-muted-foreground italic">{text}</div>;
}
