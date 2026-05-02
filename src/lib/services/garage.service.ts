// ─────────────────────────────────────────────────────────────────────────────
// Service: Garage
// ─────────────────────────────────────────────────────────────────────────────
// Business logic for garage (tenant) management.
// Only the SUPER_ADMIN role can call these functions — enforce that at the
// API route level before calling any method here.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/connectors/prisma";
import type { Garage, SubscriptionStatus } from "@/generated/prisma/client";

export type CreateGarageInput = {
  name: string;
  territory?: string;
  address?: string;
  phone?: string;
  email?: string;
};

export type UpdateGarageInput = Partial<CreateGarageInput> & {
  status?: SubscriptionStatus;
};

export class GarageService {
  // List all garages (super admin dashboard)
  async listAll(): Promise<Garage[]> {
    return prisma.garage.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getById(id: string): Promise<Garage | null> {
    return prisma.garage.findUnique({ where: { id } });
  }

  async create(input: CreateGarageInput): Promise<Garage> {
    return prisma.garage.create({ data: input });
  }

  async update(id: string, input: UpdateGarageInput): Promise<Garage> {
    return prisma.garage.update({ where: { id }, data: input });
  }

  // Soft-delete by marking INACTIVE rather than deleting rows
  async deactivate(id: string): Promise<Garage> {
    return prisma.garage.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
  }

  // Returns aggregate stats shown on the super admin dashboard
  async getStats() {
    const [garages, mechanics, openJobs] = await Promise.all([
      prisma.garage.count(),
      prisma.mechanic.count({ where: { isActive: true } }),
      prisma.serviceRequest.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_PARTS"] } },
      }),
    ]);
    return { garages, mechanics, openJobs };
  }
}
