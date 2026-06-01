import type { AssumptionConfidence } from "@/models";

const LABELS: Record<AssumptionConfidence, string> = {
  confirmed: "Confirmed",
  assumed: "Assumed",
  estimated: "Estimated",
  placeholder: "Sample dataset",
};

export function DataConfidenceBadge({
  confidence,
  prefix,
}: {
  confidence: AssumptionConfidence;
  prefix?: string;
}) {
  const tone =
    confidence === "confirmed"
      ? "border-compliant/30 bg-compliant/10 text-compliant"
      : confidence === "assumed"
        ? "border-primary/30 bg-primary/10 text-primary"
        : confidence === "estimated"
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-noncompliant/30 bg-noncompliant/10 text-noncompliant";
  return (
    <span
      className={`rounded-sm border px-2 py-1 text-[10px] font-mono uppercase ${tone}`}
      title={`${prefix ?? "Data confidence"}: ${LABELS[confidence]}`}
    >
      {prefix ? `${prefix}: ` : ""}
      {LABELS[confidence]}
    </span>
  );
}
