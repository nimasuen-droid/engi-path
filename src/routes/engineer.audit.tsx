import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { auditRepo } from '@/services/storage/db';
import type { AuditEntry } from '@/models';

export const Route = createFileRoute('/engineer/audit')({
  component: Audit,
});

function Audit() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  useEffect(() => { void auditRepo.list().then(setRows); }, []);
  return (
    <div className="border bg-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-3 py-2 text-left">Timestamp</th><th className="px-3 py-2 text-left">User</th><th className="px-3 py-2 text-left">Module</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Project</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No audit entries yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t font-mono">
              <td className="px-3 py-1.5">{new Date(r.ts).toLocaleString()}</td>
              <td className="px-3 py-1.5">{r.user}</td>
              <td className="px-3 py-1.5">{r.module}</td>
              <td className="px-3 py-1.5">{r.action}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{r.projectId?.slice(0, 8) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
