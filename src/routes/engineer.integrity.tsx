import { createFileRoute } from "@tanstack/react-router";
import { RequireActiveProject } from "@/components/RequireActiveProject";
import { useProjects } from "@/state/projects";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { LessonPopover } from "@/components/LessonPopover";
import { useState } from "react";

export const Route = createFileRoute("/engineer/integrity")({
  component: () => <RequireActiveProject>{(id) => <Integrity id={id} />}</RequireActiveProject>,
});

const GROWTH_PRESETS = [
  { label: "Low - 0.05 mm/yr", value: 0.05 },
  { label: "Moderate - 0.10 mm/yr", value: 0.1 },
  { label: "High - 0.25 mm/yr", value: 0.25 },
  { label: "Severe - 0.50 mm/yr", value: 0.5 },
];

const DEFECT_PRESETS = [
  { label: "Screening metal loss - 1.5 mm", value: 1.5 },
  { label: "Moderate anomaly - 3.0 mm", value: 3 },
  { label: "Severe anomaly - 5.0 mm", value: 5 },
];

function Integrity({ id }: { id: string }) {
  const p = useProjects().projects.find((x) => x.id === id)!;
  const [growth, setGrowth] = useState(0.1);
  const [defect, setDefect] = useState(1.5);

  const hasWallBasis = !!(p.wallThickness_mm && p.wallThickness_mm > p.corrosionAllowance_mm);
  const remainingLifeYears = hasWallBasis
    ? Math.max(0, (p.wallThickness_mm! - p.corrosionAllowance_mm - defect) / growth)
    : 0;
  const inspectionInterval = Math.max(1, Math.round(remainingLifeYears / 2));
  const severity =
    remainingLifeYears > 10 ? "compliant" : remainingLifeYears > 3 ? "warning" : "noncompliant";

  const anomalies = [
    {
      id: "A-001",
      km: 12.4,
      type: "External corrosion",
      severity: "noncompliant" as const,
      depthPct: 42,
    },
    { id: "A-002", km: 28.9, type: "Dent", severity: "warning" as const, depthPct: 18 },
    { id: "A-003", km: 41.2, type: "Metal loss", severity: "compliant" as const, depthPct: 8 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Integrity Screening
        </div>
        <LessonPopover
          title="Integrity screening"
          why="Integrity is where design assumptions meet in-service degradation. Wall thickness, corrosion allowance, defect depth, and corrosion growth drive remaining life."
          how="Use the screening result to decide whether inspection, repair, FFS assessment, or specialist review is needed. Do not treat it as final RBI or FFS approval."
          drivenBy="Wall thickness, corrosion allowance, current metal loss, corrosion growth rate, fluid threat, inspection confidence, and consequence."
          codeRef="API 1160 / API 579 / ASME FFS-1"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Remaining Life"
          value={remainingLifeYears.toFixed(1)}
          unit="yr"
          status={severity}
        />
        <MetricCard label="Suggested Inspection" value={inspectionInterval} unit="yr" />
        <MetricCard label="Anomalies" value={anomalies.length} />
        <MetricCard label="Reference" value="API 1160 / 579" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="border bg-card p-4 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Corrosion Inputs
          </div>
          <label className="block text-xs">
            Growth rate
            <select
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value))}
              className="w-full mt-0.5 px-2 py-1 border bg-background rounded-sm font-mono"
            >
              {GROWTH_PRESETS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            Current metal loss
            <select
              value={defect}
              onChange={(e) => setDefect(Number(e.target.value))}
              className="w-full mt-0.5 px-2 py-1 border bg-background rounded-sm font-mono"
            >
              {DEFECT_PRESETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-[10px] text-muted-foreground">
            Pipe wall: {p.wallThickness_mm ?? "-"} mm | CA: {p.corrosionAllowance_mm} mm
          </div>
          {!hasWallBasis && (
            <div className="border-l-4 border-l-warning bg-muted/40 p-3 text-xs text-muted-foreground">
              Select a valid wall thickness and corrosion allowance before relying on remaining-life
              screening.
            </div>
          )}
        </div>
        <div className="border bg-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th>KP</th>
                <th>Type</th>
                <th>Depth %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-3 py-1.5 font-mono">{a.id}</td>
                  <td className="px-3 py-1.5 font-mono">{a.km}</td>
                  <td className="px-3 py-1.5">{a.type}</td>
                  <td className="px-3 py-1.5 font-mono">{a.depthPct}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={a.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground italic">
        Screening only - full RBI / FFS engine remains Phase 2.
      </div>
    </div>
  );
}
