import type { CodeEntry } from "@/models";

// Summarized metadata only — does NOT reproduce code text. Refer to the actual standard for engineering use.
export const CODES: CodeEntry[] = [
  {
    id: "b318",
    name: "ASME B31.8",
    scope: "Gas transmission and distribution piping",
    applicability: ["gas", "onshore", "buried", "above_ground"],
    summary:
      "Design, materials, fabrication, testing, and operation of gas transmission systems. Introduces class-location-based design factors.",
    relatedModules: ["Wall Thickness", "MAOP", "Compliance"],
  },
  {
    id: "b314",
    name: "ASME B31.4",
    scope: "Liquid hydrocarbon and slurry pipelines",
    applicability: ["liquid", "water_injection", "onshore", "buried"],
    summary:
      "Design and operation of liquid transmission pipelines. Typically uses a single design factor and hydrostatic test criteria.",
    relatedModules: ["Wall Thickness", "Hydrotest", "Compliance"],
  },
  {
    id: "b3112",
    name: "ASME B31.12",
    scope: "Hydrogen piping and pipelines",
    applicability: ["hydrogen"],
    summary:
      "Provides material performance factors and additional requirements for hydrogen service in industrial and transmission piping.",
    relatedModules: ["Wall Thickness", "Material Selection"],
  },
  {
    id: "dnv-f101",
    name: "DNV-ST-F101",
    scope: "Submarine pipeline systems",
    applicability: ["offshore", "subsea"],
    summary:
      "LRFD framework for submarine pipelines covering design, installation, testing, and operation.",
    relatedModules: ["Wall Thickness", "Integrity"],
  },
  {
    id: "dnv-f104",
    name: "DNV-RP-F104",
    scope: "CO₂ pipelines",
    applicability: ["co2"],
    summary:
      "Recommended practice for design and operation of CO₂ transmission pipelines including running ductile fracture.",
    relatedModules: ["Material Selection"],
  },
  {
    id: "nace-mr0175",
    name: "NACE MR0175 / ISO 15156",
    scope: "Materials for H₂S service",
    applicability: ["multiphase", "gas", "liquid"],
    summary:
      "Defines material requirements (hardness, chemistry, processing) for resistance to sulfide stress cracking.",
    relatedModules: ["Material Selection", "Compliance"],
  },
  {
    id: "api-1160",
    name: "API 1160",
    scope: "Integrity management — hazardous liquids",
    applicability: ["liquid", "water_injection"],
    summary:
      "Framework for threat identification, risk assessment, inspection, and mitigation of liquid pipelines.",
    relatedModules: ["Integrity Management"],
  },
  {
    id: "api-579",
    name: "API 579 / ASME FFS-1",
    scope: "Fitness-for-service",
    applicability: ["gas", "liquid", "multiphase"],
    summary:
      "Acceptance criteria for in-service damage (metal loss, cracks, blisters) with Level 1–3 assessments.",
    relatedModules: ["Integrity Management"],
  },
];
