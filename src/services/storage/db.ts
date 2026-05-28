import { openDB, type IDBPDatabase } from 'idb';
import type { Project, AuditEntry } from '@/models';

const DB_NAME = 'pdca-db';
const VERSION = 1;

let dbp: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbp) {
    dbp = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('audit')) db.createObjectStore('audit', { keyPath: 'id' });
      },
    });
  }
  return dbp;
}

export const projectRepo = {
  async list(): Promise<Project[]> {
    const db = await getDB(); if (!db) return [];
    return (await db.getAll('projects')) as Project[];
  },
  async get(id: string): Promise<Project | undefined> {
    const db = await getDB(); if (!db) return undefined;
    return (await db.get('projects', id)) as Project | undefined;
  },
  async put(p: Project) {
    const db = await getDB(); if (!db) return;
    await db.put('projects', p);
  },
  async remove(id: string) {
    const db = await getDB(); if (!db) return;
    await db.delete('projects', id);
  },
};

export const auditRepo = {
  async list(): Promise<AuditEntry[]> {
    const db = await getDB(); if (!db) return [];
    const all = (await db.getAll('audit')) as AuditEntry[];
    return all.sort((a, b) => b.ts.localeCompare(a.ts));
  },
  async add(e: AuditEntry) {
    const db = await getDB(); if (!db) return;
    await db.put('audit', e);
  },
};
