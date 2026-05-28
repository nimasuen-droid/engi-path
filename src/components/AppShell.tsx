import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useProjects } from "@/state/projects";
import { useEffect } from "react";
import {
  Activity,
  ArrowLeft,
  Award,
  BookMarked,
  BookOpen,
  Calculator,
  ClipboardList,
  FileSearch,
  FileText,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  History,
  LayoutDashboard,
  ListChecks,
  Network,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ENGINEER_NAV: NavItem[] = [
  { to: "/engineer", label: "Dashboard", icon: LayoutDashboard },
  { to: "/engineer/manual", label: "User Guide", icon: HelpCircle },
  { to: "/engineer/projects", label: "Projects", icon: FolderKanban },
  { to: "/engineer/basis", label: "Design Basis", icon: ListChecks },
  { to: "/engineer/calculations", label: "Calculations", icon: Calculator },
  { to: "/engineer/workflow", label: "Workflow Builder", icon: Network },
  { to: "/engineer/compliance", label: "Compliance Review", icon: ShieldCheck },
  { to: "/engineer/review", label: "Intelligent Review", icon: FileSearch },
  { to: "/engineer/integrity", label: "Integrity Mgmt", icon: Activity },
  { to: "/engineer/codes", label: "Code Library", icon: BookOpen },
  { to: "/engineer/reports", label: "Reports", icon: FileText },
  { to: "/engineer/audit", label: "Audit Trail", icon: History },
];

const TRAINING_NAV: NavItem[] = [
  { to: "/training", label: "Dashboard", icon: LayoutDashboard },
  { to: "/training/manual", label: "User Guide", icon: HelpCircle },
  { to: "/training/lessons", label: "Guided Lessons", icon: BookMarked },
  { to: "/training/scenarios", label: "Scenario Simulator", icon: PlayCircle },
  { to: "/training/practice", label: "Code & Calc Practice", icon: GraduationCap },
  { to: "/training/competency", label: "Competency Tracker", icon: Award },
  { to: "/training/reports", label: "Learning Reports", icon: ClipboardList },
];

export function AppShell({
  mode,
  children,
}: {
  mode: "engineer" | "training";
  children: React.ReactNode;
}) {
  const nav = mode === "engineer" ? ENGINEER_NAV : TRAINING_NAV;
  const loc = useLocation();
  const { load, loaded, projects, activeProjectId, setActive } = useProjects();

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const active = projects.find((p) => p.id === activeProjectId);
  const current = nav.find(
    (n) => loc.pathname === n.to || (n.to !== `/${mode}` && loc.pathname.startsWith(n.to)),
  );
  const CurrentIcon = current?.icon ?? LayoutDashboard;

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="surface-graphite z-40 border-b border-sidebar-border lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 p-3 lg:p-4 lg:border-b lg:border-sidebar-border">
          <Link
            to="/"
            className="tap-target flex min-w-0 items-center gap-2 rounded-sm px-1 text-sidebar-foreground hover:opacity-85"
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="truncate text-sm font-semibold">PDCA</span>
          </Link>
          <span className="ml-auto rounded-sm bg-sidebar-accent px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-sidebar-foreground/80">
            {mode}
          </span>
        </div>
        <nav
          aria-label={`${mode} workspace navigation`}
          className="grid grid-cols-4 gap-1 px-3 pb-3 sm:grid-cols-6 lg:block lg:h-[calc(100vh-9rem)] lg:space-y-0.5 lg:overflow-y-auto lg:px-2 lg:py-2"
        >
          {nav.map((item) => {
            const isActive =
              loc.pathname === item.to ||
              (item.to !== `/${mode}` && loc.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "tap-target group flex min-w-0 flex-col items-center justify-center gap-1 rounded-sm border border-sidebar-border/50 px-1.5 py-2 text-center text-[10px] font-medium transition-colors sm:text-xs lg:w-full lg:flex-row lg:justify-start lg:gap-2 lg:border-transparent lg:px-3 lg:text-left",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-sidebar-foreground/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-sm bg-sidebar-accent/70 lg:size-auto lg:bg-transparent",
                    isActive && "bg-sidebar-foreground/10",
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-4 shrink-0 lg:size-3.5" />
                </span>
                <span className="line-clamp-2 leading-tight lg:line-clamp-none lg:whitespace-normal">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        {mode === "engineer" && (
          <div className="border-t border-sidebar-border p-3">
            <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-sidebar-foreground/60">
              Active Project
            </div>
            <select
              className="tap-target w-full rounded-sm border border-sidebar-border bg-sidebar-accent px-2 py-1 text-xs text-sidebar-foreground"
              value={activeProjectId ?? ""}
              onChange={(e) => setActive(e.target.value || null)}
            >
              <option value="">Select project</option>
              {projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            {active && (
              <div className="mt-1.5 truncate text-[10px] text-sidebar-foreground/60">
                {active.client} | {active.designCode}
              </div>
            )}
          </div>
        )}
      </aside>
      <main className="flex min-h-screen min-w-0 flex-1 flex-col lg:min-h-screen">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-sm border bg-muted text-primary">
              <CurrentIcon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                {mode === "engineer" ? "Engineer Mode" : "Training Mode"}
              </div>
              <div className="truncate text-sm font-semibold">{current?.label ?? "Dashboard"}</div>
            </div>
          </div>
          <div className="shrink-0 rounded-sm border bg-muted/40 px-2 py-1 text-[10px] font-mono text-muted-foreground">
            Local-first | v0.1 MVP
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">{children}</div>
        <footer className="border-t bg-muted/40 px-4 py-2 text-[10px] text-muted-foreground lg:px-6">
          Summarized engineering aid | Not a substitute for qualified review or the governing code.
        </footer>
      </main>
    </div>
  );
}
