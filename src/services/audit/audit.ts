import { auditRepo } from "@/services/storage/db";
import type { AuditEntry } from "@/models";

export async function logAudit(entry: Omit<AuditEntry, "id" | "ts">) {
  const e: AuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
  };
  await auditRepo.add(e);
  return e;
}
