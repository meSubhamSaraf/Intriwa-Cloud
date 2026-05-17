// GET  /api/qa/scenarios  — list all QA scenarios for the garage
// POST /api/qa/scenarios  — create a new scenario

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const scenarios = await prisma.qAScenario.findMany({
    where: { garageId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(scenarios);
});

export const POST = withAuth(async (req, { garageId }) => {
  const { title, description, priority } = await req.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }
  const scenario = await prisma.qAScenario.create({
    data: { garageId, title: title.trim(), description: description.trim(), priority: priority ?? "MEDIUM" },
  });
  return NextResponse.json(scenario, { status: 201 });
});
