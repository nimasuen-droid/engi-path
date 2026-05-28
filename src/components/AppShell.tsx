import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useProjects } from '@/state/projects';
import { useEffect } from 'react';
import {
  LayoutDashboard, FolderKanban, ListChecks, Calculator, Network, ShieldCheck,
  FileSearch, Activity, BookOpen, FileText, History, GraduationCap, BookMarked,
  PlayCircle, ClipboardList, Award, ArrowLeft,
} from 'lucide-react';

interface NavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }> }

const ENGINEER_NAV: NavItem[] = [
  { to: '/engineer', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/engineer/projects', label: 'Projects', icon: FolderKanban },
  { to: '/engineer/basis', label: 'Design Basis', icon: ListChecks },
  { to: '/engineer/calculations', label: 'Calculations', icon: Calculator },
  { to: '/engineer/workflow', label: 'Workflow Builder', icon: Network },
  { to: '/engineer/compliance', label: 'Compliance Review', icon: ShieldCheck },
  { to: '/engineer/review', label: 'Intelligent Review', icon: FileSearch },
  { to: '/engineer/integrity', label: 'Integrity Mgmt', icon: Activity },
  { to: '/engineer/codes', label: 'Code Library', icon: BookOpen },
  { to: '/engineer/reports', label: 'Reports', icon: FileText },
  { to: '/engineer/audit', label: 'Audit Trail', icon: History },
];

const TRAINING_NAV: NavItem[] = [
  { to: '/training', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/training/lessons', label: 'Guided Lessons', icon: BookMarked },
  { to: '/training/scenarios', label: 'Scenario Simulator', icon: PlayCircle },
  { to: '/training/practice', label: 'Code & Calc Practice', icon: GraduationCap },
  { to: '/training/competency', label: 'Competency Tracker', icon: Award },
  { to: '/training/reports', label: 'Learning Reports', icon: ClipboardList },
];

export function AppShell({ mode, children }: { mode: 'engineer' | 'training'; children: React.ReactNode }) {
  const nav = mode === 'engineer' ? ENGINEER_NAV : TRAINING_NAV;
  const loc = useLocation();
  const { load, loaded, projects, activeProjectId, setActive } = useProjects();

  useEffect(() => { if (!loaded) void load(); }, [loaded, load]);

  const active = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 surface-graphite flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 text-sidebar-foreground hover:opacity-80">
            <ArrowLeft className="size-4" />
            <span className="font-semibold text-sm">PDCA</span>
            <span className="ml-auto text-[10px] font-mono uppercase tracking-wider opacity-60">{mode}</span>
          </Link>
        </div>
        <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive = loc.pathname === item.to || (item.to !== `/${mode}` && loc.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={cn(
                'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs transition-colors',
                isActive ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}>
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {mode === 'engineer' && (
          <div className="p-3 border-t border-sidebar-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sidebar-foreground/60 mb-1">Active Project</div>
            <select
              className="w-full bg-sidebar-accent text-sidebar-foreground text-xs rounded-sm px-2 py-1 border border-sidebar-border"
              value={activeProjectId ?? ''}
              onChange={(e) => setActive(e.target.value || null)}
            >
              <option value="">— Select —</option>
              {projects.filter((p) => !p.archived).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {active && <div className="mt-1.5 text-[10px] text-sidebar-foreground/60 truncate">{active.client} · {active.designCode}</div>}
          </div>
        )}
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              {mode === 'engineer' ? 'Engineer Mode' : 'Training Mode'}
            </div>
            <div className="text-sm font-medium">{nav.find((n) => loc.pathname === n.to || (n.to !== `/${mode}` && loc.pathname.startsWith(n.to)))?.label ?? 'Dashboard'}</div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">Local-first · v0.1 MVP</div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        <footer className="border-t bg-muted/40 px-6 py-2 text-[10px] text-muted-foreground">
          Summarized engineering aid · Not a substitute for qualified review or the governing code.
        </footer>
      </main>
    </div>
  );
}
