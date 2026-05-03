// GET /api/profiles — list all profiles (team members) for the garage

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const profiles = await prisma.profile.findMany({
    where: { garageId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(profiles);
});
