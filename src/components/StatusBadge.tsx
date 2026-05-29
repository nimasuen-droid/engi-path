import { cn } from "@/lib/utils";
import type { ComplianceStatus } from "@/models";

const STYLES: Record<ComplianceStatus, string> = {
  compliant: "bg-compliant text-compliant-foreground",
  warning: "bg-warning text-warning-foreground",
  noncompliant: "bg-noncompliant text-noncompliant-foreground",
  incomplete: "bg-incomplete text-incomplete-foreground",
};

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: ComplianceStatus;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-mono uppercase tracking-wide",
        STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {children ?? status}
    </span>
  );
}
