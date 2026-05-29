import { cn } from "@/lib/utils";
import type { CalcResult } from "@/services/calculations";
import { formatEngineeringValue } from "@/services/assurance/epc";
import type { CalculationClassification, UnitSystem } from "@/models";
import { CalculationClassificationBadge } from "./CalculationClassificationBadge";
import { StatusBadge } from "./StatusBadge";

export function CalcResultCard({
  title,
  result,
  className,
  unitSystem,
  classification = "screening",
}: {
  title: string;
  result: CalcResult;
  className?: string;
  unitSystem?: UnitSystem;
  classification?: CalculationClassification;
}) {
  const alternate = convertedResult(result, unitSystem);
  const statusText = result.pass === undefined ? "Screening result" : result.pass ? "Pass" : "Fail";
  return (
    <section
      aria-label={`${title} calculation result: ${statusText}`}
      className={cn("app-card space-y-3 p-4", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CalculationClassificationBadge classification={classification} />
          {result.pass !== undefined && (
            <StatusBadge status={result.pass ? "compliant" : "noncompliant"}>
              {result.pass ? "PASS" : "FAIL"}
            </StatusBadge>
          )}
        </div>
      </div>
      <div className="font-mono text-2xl leading-tight sm:text-3xl">
        {result.value} <span className="text-sm text-muted-foreground">{result.unit}</span>
      </div>
      {alternate && (
        <div className="rounded-sm border bg-background px-2 py-1 text-xs text-muted-foreground">
          Display conversion: <span className="font-mono">{alternate}</span>
        </div>
      )}
      {result.insight && (
        <div className="rounded-sm border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed">
          <div className="mb-1 text-[11px] font-mono uppercase tracking-wider text-primary">
            Engineering insight
          </div>
          {result.insight}
        </div>
      )}
      <div className="overflow-x-auto rounded-sm bg-muted p-2 font-mono text-xs">
        {result.formula}
      </div>
      {result.drivers && result.drivers.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            What drives this
          </div>
          <div className="grid gap-2">
            {result.drivers.map((driver) => (
              <div key={driver.label} className="rounded-sm border bg-background p-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{driver.label}</span>
                  <span className="font-mono text-muted-foreground">{driver.value}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{driver.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
          Assumptions
        </div>
        <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
          {result.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
      {result.recommendations && result.recommendations.length > 0 && (
        <div
          className={cn(
            "rounded-sm border p-3 text-xs",
            result.pass === false
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-background",
          )}
        >
          <div
            className={cn(
              "mb-1 text-[11px] font-mono uppercase tracking-wider",
              result.pass === false ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {result.pass === false ? "Recommended action" : "Best-practice follow-up"}
          </div>
          <ul className="space-y-1 list-disc list-inside text-muted-foreground">
            {result.recommendations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-[11px] text-muted-foreground">
        Code ref: <span className="font-mono">{result.codeRef}</span>
      </div>
      {result.notes && <div className="text-xs text-warning">{result.notes}</div>}
    </section>
  );
}

function convertedResult(result: CalcResult, unitSystem?: UnitSystem) {
  if (unitSystem !== "us_customary") return null;
  if (result.unit === "MPa") return formatEngineeringValue(result.value, "MPa", unitSystem);
  if (result.unit === "MPa peak") return formatEngineeringValue(result.value, "MPa", unitSystem);
  if (result.unit === "mm") return formatEngineeringValue(result.value, "mm", unitSystem);
  if (result.unit === "mm ID") return formatEngineeringValue(result.value, "mm", unitSystem);
  if (result.unit === "MPa/km") return formatEngineeringValue(result.value, "MPa/km", unitSystem);
  if (result.unit === "m/s") return formatEngineeringValue(result.value, "m/s", unitSystem);
  if (result.unit === "m/s allowable")
    return formatEngineeringValue(result.value, "m/s", unitSystem);
  return null;
}
