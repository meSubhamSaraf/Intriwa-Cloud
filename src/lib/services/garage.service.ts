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
  // List all garages enriched with per-garage mechanic count, active job count,
  // and the primary OPS_MANAGER profile (super admin dashboard)
  async listAll() {
    const [garages, activeJobCounts] = await Promise.all([
      prisma.garage.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { mechanics: { where: { isActive: true } } } },
          profiles: {
            where: { role: "OPS_MANAGER" },
            take: 1,
            select: { id: true, name: true, email: true, phone: true, createdAt: true },
          },
        },
      }),
      prisma.serviceRequest.groupBy({
        by: ["garageId"],
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_PARTS"] } },
        _count: { id: true },
      }),
    ]);
    const jobMap = new Map(activeJobCounts.map((r) => [r.garageId, r._count.id]));
    return garages.map((g) => ({
      id: g.id,
      name: g.name,
      territory: g.territory,
      address: g.address,
      phone: g.phone,
      email: g.email,
      status: g.status as string,
      createdAt: g.createdAt,
      mechanicsCount: g._count.mechanics,
      activeJobs: jobMap.get(g.id) ?? 0,
      opsManagerName: g.profiles[0]?.name ?? "—",
      opsManagerEmail: g.profiles[0]?.email ?? "",
    }));
  }

  // List all OPS_MANAGER profiles across all garages (super admin only)
  async listOpsManagers() {
    return prisma.profile.findMany({
      where: { role: "OPS_MANAGER" },
      orderBy: { createdAt: "asc" },
      include: { garage: { select: { id: true, name: true } } },
    });
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
