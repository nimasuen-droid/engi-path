import { createFileRoute } from "@tanstack/react-router";
import { LessonPopover } from "@/components/LessonPopover";

const LESSONS = [
  {
    title: "Pipeline design fundamentals",
    desc: "Pressure, temperature, fluid classification, governing codes.",
    why: "A clean design basis prevents wrong calculations downstream.",
    how: "Start with fluid, installation, design pressure, temperature, OD, material, corrosion allowance, and design life.",
    drivenBy:
      "Service, route, pressure envelope, temperature envelope, constructability, corrosion, and client specification.",
    codeRef: "ASME B31.4 / ASME B31.8 design basis",
  },
  {
    title: "Class location and design factor",
    desc: "How population density shapes allowable stress.",
    why: "Gas pipeline public exposure directly changes allowable utilization.",
    how: "Select the class from route occupancy, then use the matching design factor in wall thickness and hoop stress checks.",
    drivenBy: "Occupied buildings, public activity, route development, and consequence.",
    codeRef: "ASME B31.8 Section 840/841 summary",
  },
  {
    title: "Material selection for sour service",
    desc: "NACE MR0175 hardness, chemistry, and qualification logic.",
    why: "H2S exposure can make ordinary line pipe unsuitable even when pressure design passes.",
    how: "Confirm sour qualification, hardness, chemistry, weld procedure, corrosion strategy, and inspection plan.",
    drivenBy:
      "H2S partial pressure, pH, chlorides, water, stress level, hardness, and material grade.",
    codeRef: "NACE MR0175 / ISO 15156",
  },
  {
    title: "Hydrostatic testing fundamentals",
    desc: "Strength test basis, MAOP relationship, and acceptance logic.",
    why: "Hydrotest verifies strength before operation and anchors MAOP confidence.",
    how: "Compare test pressure to MAOP, check minimum ratio, confirm limits against material stress, and document medium/hold requirements.",
    drivenBy:
      "MAOP, design code, test section, elevation head, material strength, and project test philosophy.",
    codeRef: "ASME B31.4/B31.8 hydrostatic test basis",
  },
  {
    title: "Integrity management foundations",
    desc: "Threats, risk, inspection planning per API 1160 and FFS concepts.",
    why: "Design does not end at commissioning; degradation and inspection confidence drive safe operation.",
    how: "Identify threats, estimate remaining life, plan inspection, and escalate anomalies to FFS or repair assessment.",
    drivenBy:
      "Corrosion growth, wall thickness, defect size, fluid threat, consequence, and inspection history.",
    codeRef: "API 1160 / API 579 / ASME FFS-1",
  },
];

export const Route = createFileRoute("/training/lessons")({
  component: Lessons,
});

function Lessons() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Short lessons for engineers before they run scenarios or project calculations.
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {LESSONS.map((l) => (
          <div key={l.title} className="border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">{l.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
              </div>
              <LessonPopover
                title={l.title}
                why={l.why}
                how={l.how}
                drivenBy={l.drivenBy}
                codeRef={l.codeRef}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
