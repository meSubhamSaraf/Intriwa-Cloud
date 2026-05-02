// ─────────────────────────────────────────────────────────────────────────────
// Translator: ServiceRequest
// ─────────────────────────────────────────────────────────────────────────────
// Converts between the Prisma DB model and the shape the API/UI consumes.
// Keep all field renaming and computed fields here so services stay clean.
//
// "fromDb"  — DB row → API response DTO (camelCase, safe to serialise to JSON)
// "toCreate" — raw API input → Prisma create input
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceRequest, Customer, Vehicle, Mechanic } from "@/generated/prisma/client";

// The enriched shape returned by the API (includes relations)
export type ServiceRequestDTO = {
  id: string;
  srNumber: string;
  status: string;
  locationType: string;
  complaint: string | null;
  diagnosis: string | null;
  customer: { id: string; name: string; phone: string } | null;
  vehicle: { id: string; make: string; model: string; regNumber: string | null } | null;
  mechanic: { id: string; name: string } | null;
  openedAt: string; // ISO string — safe to send over the wire
  closedAt: string | null;
  scheduledAt: string | null;
};

type SRWithRelations = ServiceRequest & {
  customer: Customer | null;
  vehicle: Vehicle | null;
  mechanic: Mechanic | null;
};

export function srFromDb(sr: SRWithRelations): ServiceRequestDTO {
  return {
    id: sr.id,
    srNumber: sr.srNumber,
    status: sr.status,
    locationType: sr.locationType,
    complaint: sr.complaint,
    diagnosis: sr.diagnosis,
    customer: sr.customer
      ? { id: sr.customer.id, name: sr.customer.name, phone: sr.customer.phone }
      : null,
    vehicle: sr.vehicle
      ? {
          id: sr.vehicle.id,
          make: sr.vehicle.make,
          model: sr.vehicle.model,
          regNumber: sr.vehicle.regNumber,
        }
      : null,
    mechanic: sr.mechanic ? { id: sr.mechanic.id, name: sr.mechanic.name } : null,
    openedAt: sr.openedAt.toISOString(),
    closedAt: sr.closedAt?.toISOString() ?? null,
    scheduledAt: sr.scheduledAt?.toISOString() ?? null,
  };
}
