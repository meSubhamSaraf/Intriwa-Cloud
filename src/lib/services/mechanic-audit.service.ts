// ─────────────────────────────────────────────────────────────────────────────
// Service: MechanicAudit
// ─────────────────────────────────────────────────────────────────────────────
// Logs every field change on a mechanic profile so there's a full history
// of who changed what and when.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/connectors/prisma";

// Fields to skip (internal, not meaningful to log)
const SKIP_FIELDS = new Set(["updatedAt", "createdAt", "lastLocation", "lastSeenAt"]);

export async function logMechanicChanges(
  mechanicId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  actorId?: string,
  actorName?: string
) {
  const entries: {
    mechanicId: string;
    actorId?: string;
    actorName?: string;
    field: string;
    oldValue?: string;
    newValue?: string;
  }[] = [];

  for (const key of Object.keys(after)) {
    if (SKIP_FIELDS.has(key)) continue;
    const oldVal = before[key];
    const newVal = after[key];
    if (String(oldVal) !== String(newVal)) {
      entries.push({
        mechanicId,
        actorId,
        actorName,
        field: key,
        oldValue: oldVal != null ? String(oldVal) : undefined,
        newValue: newVal != null ? String(newVal) : undefined,
      });
    }
  }

  if (entries.length > 0) {
    await prisma.mechanicAuditLog.createMany({ data: entries });
  }
}
