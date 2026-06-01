import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  FileText,
  FolderKanban,
  GraduationCap,
  Hammer,
  HelpCircle,
  ListChecks,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pipeline Design & Compliance Assistant" },
      {
        name: "description",
        content:
          "Professional pipeline engineering platform for design, compliance, workflow, integrity, and competency.",
      },
      { property: "og:title", content: "Pipeline Design & Compliance Assistant" },
      {
        property: "og:description",
        content: "Engineering-grade pipeline design, compliance, and training environment.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-screen bg-background data-grid">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            PDCA · v0.1
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Pipeline Design & Compliance Assistant
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Engineering-grade environment for pipeline design, code compliance, workflow building,
            engineering review, integrity management, and competency development.
          </p>
        </header>

        <QuickLaunchGrid />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ModeCard
            to="/engineer"
            icon={Hammer}
            title="Engineer Mode"
            desc="Pipeline design, calculations, compliance checks, workflows, reviews, and reports."
            accent="primary"
          />
          <ModeCard
            to="/training"
            icon={GraduationCap}
            title="Training Mode"
            desc="Learn pipeline engineering through guided scenarios, engineering logic, and competency development."
            accent="compliant"
          />
          <ModeCard
            icon={Building2}
            title="Enterprise Mode"
            desc="Multi-user approvals, DCC integration, cloud sync, organization dashboards, and enterprise governance."
            accent="incomplete"
            disabled
          />
        </div>

        <div className="mt-12 grid gap-6 border-t pt-6 text-xs text-muted-foreground md:grid-cols-3">
          <Feature
            title="Local-first"
            desc="Projects persist in your browser via IndexedDB. No account required."
          />
          <Feature
            title="Code-aware"
            desc="Rule engine maps fluid, installation, and class to ASME, DNV, NACE, API."
          />
          <Feature
            title="Audit-ready"
            desc="Calculations, workflows, and PDF reports with full assumption traceability."
          />
        </div>
      </div>
    </div>
  );
}

const QUICK_LAUNCH = [
  { to: "/engineer", label: "Engineer", icon: Hammer, tone: "primary" },
  { to: "/training", label: "Training", icon: GraduationCap, tone: "compliant" },
  { to: "/engineer/manual", label: "Guide", icon: HelpCircle, tone: "primary" },
  { to: "/engineer/projects", label: "Projects", icon: FolderKanban, tone: "primary" },
  { to: "/engineer/basis", label: "Design Basis", icon: ListChecks, tone: "primary" },
  { to: "/engineer/calculations", label: "Calculations", icon: Calculator, tone: "primary" },
  { to: "/engineer/integrity", label: "Integrity", icon: Activity, tone: "warning" },
  { to: "/engineer/codes", label: "Codes", icon: BookOpen, tone: "primary" },
  { to: "/engineer/reports", label: "Reports", icon: FileText, tone: "primary" },
];

function QuickLaunchGrid() {
  return (
    <nav aria-label="Top app modules" className="app-card p-3">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Modules</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Open the engineering workspace from the top icon grid.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {QUICK_LAUNCH.map((item) => {
          const Icon = item.icon;
          const tone =
            item.tone === "compliant"
              ? "bg-compliant/10 text-compliant"
              : item.tone === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-primary/10 text-primary";
          return (
            <Link
              key={item.to}
              to={item.to}
              className="tap-target flex min-h-24 flex-col items-center justify-center gap-2 rounded-sm border bg-background px-2 py-3 text-center text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 focus-visible:border-primary"
              aria-label={`Open ${item.label}`}
            >
              <span className={`grid size-10 place-items-center rounded-sm ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="line-clamp-2 leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ModeCard({
  to,
  icon: Icon,
  title,
  desc,
  accent,
  disabled,
}: {
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent: "primary" | "compliant" | "incomplete";
  disabled?: boolean;
}) {
  const border =
    accent === "primary"
      ? "border-t-primary"
      : accent === "compliant"
        ? "border-t-compliant"
        : "border-t-incomplete";
  const content = (
    <div
      className={`relative h-full bg-card border border-t-4 ${border} p-6 transition-shadow ${disabled ? "opacity-60" : "hover:shadow-lg cursor-pointer"}`}
    >
      {disabled && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-incomplete text-incomplete-foreground px-1.5 py-0.5 rounded-sm">
          <Lock className="size-3" /> Coming Soon
        </span>
      )}
      <Icon className="size-7 text-primary" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {!disabled && (
        <div className="mt-6 flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-primary">
          Enter <ArrowRight className="size-3" />
        </div>
      )}
    </div>
  );
  if (disabled || !to) return content;
  return (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <div className="text-foreground font-semibold text-xs uppercase tracking-wider font-mono">
        {title}
      </div>
      <div className="mt-1">{desc}</div>
    </div>
  );
}
