// GET  /api/incentive-rules  — list all rules for the garage
// POST /api/incentive-rules  — create a new rule

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const rules = await prisma.incentiveRule.findMany({
    where: { garageId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const rule = await prisma.incentiveRule.create({
    data: { ...body, garageId },
  });
  return NextResponse.json(rule, { status: 201 });
});
