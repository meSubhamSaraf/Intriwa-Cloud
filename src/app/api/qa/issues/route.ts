// GET  /api/qa/issues  — list issues
// POST /api/qa/issues  — create issue

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const issues = await prisma.qAIssue.findMany({
    where: { garageId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(issues);
});

export const POST = withAuth(async (req, { garageId }) => {
  const { title, description, type, priority } = await req.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }
  const issue = await prisma.qAIssue.create({
    data: {
      garageId,
      title: title.trim(),
      description: description.trim(),
      type: type ?? "BUG",
      priority: priority ?? "MEDIUM",
    },
  });
  return NextResponse.json(issue, { status: 201 });
});
