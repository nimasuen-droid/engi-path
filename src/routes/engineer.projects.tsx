import { createFileRoute } from "@tanstack/react-router";
import { useProjects } from "@/state/projects";
import { useState } from "react";
import type { FluidType, InstallationType, Project } from "@/models";
import { Archive, Copy, Database, Pencil, Plus, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
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

export const Route = createFileRoute("/engineer/projects")({
  component: Projects,
});

function blankProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: "",
    client: "",
    fluidType: "gas",
    installationType: "onshore",
    designCode: "ASME B31.8",
    region: "Generic training corridor",
    engineer: "",
    designPressure_MPa: 9.93,
    designTemperature_C: 40,
    corrosionAllowance_mm: 3,
    materialGrade: "API 5L X60",
    length_km: 10,
    designLife_years: 30,
    outsideDiameter_mm: 762,
    wallThickness_mm: 15.88,
    MAOP_MPa: 9.2,
    hydrotestPressure_MPa: 11.6,
    classLocation: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function Projects() {
  const {
    projects,
    upsert,
    remove,
    duplicate,
    archive,
    loadSampleData,
    setActive,
    activeProjectId,
  } = useProjects();
  const [edit, setEdit] = useState<Project | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void loadSampleData()}
            className="tap-target inline-flex items-center gap-1 border text-xs px-3 py-2 rounded-sm hover:bg-muted"
          >
            <Database className="size-3.5" /> Load 5 Sample Data
          </button>
          <button
            onClick={() => setEdit(blankProject())}
            className="tap-target inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-sm hover:opacity-90"
          >
            <Plus className="size-3.5" /> New Project
          </button>
        </div>
      </div>
      <div className="app-card touch-scroll overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr className="text-left font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Fluid</th>
              <th className="px-3 py-2">Install</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">L (km)</th>
              <th className="px-3 py-2">P (MPa)</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  No projects yet. Load the 5 sample projects or create a guided project.
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className={`border-t ${p.archived ? "opacity-50" : ""}`}>
                <td className="px-3 py-2">
                  <input
                    type="radio"
                    name="active"
                    checked={activeProjectId === p.id}
                    onChange={() => setActive(p.id)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.client}</td>
                <td className="px-3 py-2 font-mono">{p.fluidType}</td>
                <td className="px-3 py-2 font-mono">{p.installationType}</td>
                <td className="px-3 py-2 font-mono">{p.designCode}</td>
                <td className="px-3 py-2 font-mono">{p.length_km}</td>
                <td className="px-3 py-2 font-mono">{p.designPressure_MPa}</td>
                <td className="px-3 py-2">
                  {p.archived ? (
                    <StatusBadge status="incomplete">archived</StatusBadge>
                  ) : (
                    <StatusBadge status="compliant">active</StatusBadge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      title="Edit"
                      onClick={() => setEdit(p)}
                      className="p-1 hover:bg-muted rounded-sm"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      title="Duplicate"
                      onClick={() => duplicate(p.id)}
                      className="p-1 hover:bg-muted rounded-sm"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      title={p.archived ? "Unarchive" : "Archive"}
                      onClick={() => archive(p.id, !p.archived)}
                      className="p-1 hover:bg-muted rounded-sm"
                    >
                      <Archive className="size-3.5" />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => confirm("Delete project?") && remove(p.id)}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded-sm"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Editor
          project={edit}
          onClose={() => setEdit(null)}
          onSave={(p) => {
            void upsert(p);
            setActive(p.id);
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}

function Editor({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [p, setP] = useState<Project>(project);
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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="bg-card border w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-md sm:rounded-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">
            {project.name ? `Edit - ${project.name}` : "New Project"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-sm">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <Field label="Name">
            <input className={inp} value={p.name} onChange={(e) => upd("name", e.target.value)} />
          </Field>
          <Field label="Client">
            <input
              className={inp}
              value={p.client}
              onChange={(e) => upd("client", e.target.value)}
            />
          </Field>
          <Field label="Engineer">
            <input
              className={inp}
              value={p.engineer}
              onChange={(e) => upd("engineer", e.target.value)}
            />
          </Field>
          <Field label="Reviewer">
            <input
              className={inp}
              value={p.reviewer ?? ""}
              onChange={(e) => upd("reviewer", e.target.value)}
            />
          </Field>
          <Field label="Region">
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
          </Field>
          <Field label="Design Code">
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
          </Field>
          <Field
            label="Fluid"
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
          </Field>
          <Field
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
          </Field>
          <Field
            label="Material Grade"
            lesson={
              <LessonPopover
                title={selectedMaterial.grade}
                why={selectedMaterial.why}
                how="Select a line-pipe grade that meets pressure design, temperature, weldability, toughness, and corrosion-service requirements."
                drivenBy="SMYS, toughness, weld procedure, fluid service, sour service, temperature, and project specification."
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
          </Field>
          <Field
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
                  {c.label} - F {c.designFactor}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="OD / NPS"
            lesson={
              <LessonPopover
                title={`NPS ${selectedPipe.nps} / OD ${selectedPipe.od_mm} mm`}
                why={selectedPipe.why}
                how="Choose NPS from standard pipe outside diameters, then compare the calculated required wall with available schedules."
                drivenBy="Flow rate, velocity, pressure drop, constructability, standard pipe availability, and pressure containment."
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
          </Field>
          <Field label="Wall Thickness / Schedule">
            <select
              className={inp}
              value={p.wallThickness_mm ?? ""}
              onChange={(e) => upd("wallThickness_mm", Number(e.target.value))}
            >
              <option value="">Select wall</option>
              {selectedPipe.commonSchedules.map((s) => (
                <option key={s.schedule} value={s.wall_mm}>
                  {s.schedule} - {s.wall_mm} mm
                </option>
              ))}
            </select>
          </Field>
          <Field label="Design Pressure (MPa)">
            <input
              type="number"
              step="0.01"
              className={inp}
              value={p.designPressure_MPa}
              onChange={(e) => upd("designPressure_MPa", Number(e.target.value))}
            />
          </Field>
          <Field label="Design Temperature (deg C)">
            <input
              type="number"
              className={inp}
              value={p.designTemperature_C}
              onChange={(e) => upd("designTemperature_C", Number(e.target.value))}
            />
          </Field>
          <Field label="Corrosion Allowance">
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
          </Field>
          <Field label="Length (km)">
            <input
              type="number"
              step="0.1"
              className={inp}
              value={p.length_km}
              onChange={(e) => upd("length_km", Number(e.target.value))}
            />
          </Field>
          <Field label="Design Life">
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
          </Field>
          <Field label="MAOP (MPa, optional)">
            <input
              type="number"
              step="0.01"
              className={inp}
              value={p.MAOP_MPa ?? ""}
              onChange={(e) => upd("MAOP_MPa", Number(e.target.value))}
            />
          </Field>
          <Field label="Hydrotest (MPa, optional)">
            <input
              type="number"
              step="0.01"
              className={inp}
              value={p.hydrotestPressure_MPa ?? ""}
              onChange={(e) => upd("hydrotestPressure_MPa", Number(e.target.value))}
            />
          </Field>
          <Field label="Sour Service">
            <label className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={!!p.sourService}
                onChange={(e) => upd("sourService", e.target.checked)}
              />{" "}
              H2S exposure
            </label>
          </Field>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="tap-target text-xs px-3 py-2 border rounded-sm">
            Cancel
          </button>
          <button
            disabled={!p.name}
            onClick={() => onSave(p)}
            className="tap-target text-xs px-3 py-2 bg-primary text-primary-foreground rounded-sm disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full mt-0.5 px-2 py-2 border bg-background rounded-sm font-mono";
function Field({
  label,
  lesson,
  children,
}: {
  label: string;
  lesson?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
        {lesson}
      </span>
      {children}
    </label>
  );
}
