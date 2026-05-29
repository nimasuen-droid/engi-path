import type { CalculationClassification } from "@/models";

const LABELS: Record<CalculationClassification, string> = {
  screening: "Screening",
  design_basis: "Design Basis",
  detailed_not_implemented: "Detailed / Not Implemented",
};

export function CalculationClassificationBadge({
  classification,
}: {
  classification: CalculationClassification;
}) {
  const tone =
    classification === "screening"
      ? "border-warning/30 bg-warning/10 text-warning"
      : classification === "design_basis"
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-muted-foreground/30 bg-muted text-muted-foreground";
  return (
    <span className={`rounded-sm border px-2 py-1 text-[10px] font-mono uppercase ${tone}`}>
      {LABELS[classification]}
    </span>
  );
}
