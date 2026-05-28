import { useProjects } from '@/state/projects';
import { Link } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';

export function RequireActiveProject({ children }: { children: (id: string) => React.ReactNode }) {
  const { activeProjectId, projects } = useProjects();
  const project = projects.find((p) => p.id === activeProjectId);
  if (!project) {
    return (
      <div className="max-w-md mx-auto mt-12 border bg-card p-6 text-center">
        <AlertCircle className="size-6 mx-auto text-warning" />
        <h3 className="mt-2 font-semibold">No active project</h3>
        <p className="mt-1 text-sm text-muted-foreground">Create or select a project to use this module.</p>
        <Link to="/engineer/projects" className="mt-4 inline-block bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-sm">Go to Projects</Link>
      </div>
    );
  }
  return <>{children(project.id)}</>;
}
