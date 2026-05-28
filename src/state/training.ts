import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TrainingStore {
  results: Record<string, number>;
  record: (scenarioId: string, score: number) => void;
}

export const useTraining = create<TrainingStore>()(
  persist(
    (set, get) => ({
      results: {},
      record(id, score) { set({ results: { ...get().results, [id]: score } }); },
    }),
    { name: 'pdca-training' },
  ),
);

export const COMPETENCY_LEVELS = ['Graduate', 'Junior', 'Intermediate', 'Senior', 'Lead', 'Technical Authority'];
export function levelFor(completed: number, avg: number): string {
  if (completed >= 12 && avg >= 90) return 'Technical Authority';
  if (completed >= 8 && avg >= 85) return 'Lead';
  if (completed >= 6 && avg >= 75) return 'Senior';
  if (completed >= 4 && avg >= 65) return 'Intermediate';
  if (completed >= 2) return 'Junior';
  return 'Graduate';
}
