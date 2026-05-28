import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '@/models';
import { projectRepo } from '@/services/storage/db';
import { logAudit } from '@/services/audit/audit';

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (p: Project) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Project | null>;
  archive: (id: string, archived: boolean) => Promise<void>;
  setActive: (id: string | null) => void;
}

const useStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      loaded: false,
      async load() {
        const projects = await projectRepo.list();
        set({ projects, loaded: true });
      },
      async upsert(p) {
        const now = new Date().toISOString();
        const existed = get().projects.find((x) => x.id === p.id);
        const next: Project = { ...p, updatedAt: now, createdAt: p.createdAt ?? now };
        await projectRepo.put(next);
        set({ projects: [...get().projects.filter((x) => x.id !== p.id), next] });
        await logAudit({
          user: 'local-engineer',
          module: 'projects',
          action: existed ? 'update' : 'create',
          projectId: p.id,
          before: existed,
          after: next,
        });
      },
      async remove(id) {
        await projectRepo.remove(id);
        set({ projects: get().projects.filter((p) => p.id !== id) });
        await logAudit({ user: 'local-engineer', module: 'projects', action: 'delete', projectId: id });
      },
      async duplicate(id) {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return null;
        const copy: Project = { ...src, id: crypto.randomUUID(), name: `${src.name} (Copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        await get().upsert(copy);
        return copy;
      },
      async archive(id, archived) {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return;
        await get().upsert({ ...src, archived });
      },
      setActive(id) { set({ activeProjectId: id }); },
    }),
    { name: 'pdca-projects-meta', partialize: (s) => ({ activeProjectId: s.activeProjectId }) },
  ),
);

export const useProjects = useStore;
