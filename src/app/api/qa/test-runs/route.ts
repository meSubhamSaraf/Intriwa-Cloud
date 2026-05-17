// GET  /api/qa/test-runs  — list last 20 runs
// POST /api/qa/test-runs  — save a new run (called by Playwright reporter)
//
// The POST endpoint accepts an API key via ?apikey=QA_REPORTER_KEY so the
// Playwright reporter (which runs outside a browser session) can write without
// a Supabase cookie. Falls back to normal withAuth for manual calls.

import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { Prisma } from "@/generated/prisma/client";

export const GET = withAuth(async (_req, { garageId }) => {
  const runs = await prisma.qATestRun.findMany({
    where: { garageId },
    orderBy: { runAt: "desc" },
    take: 30,
  });
  return NextResponse.json(runs);
});

export async function POST(req: NextRequest) {
  const apiKey  = req.nextUrl.searchParams.get("apikey");
  const secret  = process.env.QA_REPORTER_KEY;
  const garageId = req.nextUrl.searchParams.get("garageId") ?? process.env.DEFAULT_GARAGE_ID;

  if (!apiKey || !secret || apiKey !== secret || !garageId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const run = await prisma.qATestRun.create({ data: { garageId, ...sanitise(body) } });
  if (body.results) await syncScenarioStatuses(garageId, body.results);
  return NextResponse.json(run, { status: 201 });
}

function sanitise(body: Record<string, unknown>) {
  return {
    total:    Number(body.total   ?? 0),
    passed:   Number(body.passed  ?? 0),
    failed:   Number(body.failed  ?? 0),
    skipped:  Number(body.skipped ?? 0),
    duration: Number(body.duration ?? 0),
    results:  body.results ?? Prisma.JsonNull,
  };
}

async function syncScenarioStatuses(garageId: string, results: Record<string, string>) {
  // results is { [scenarioTitle]: "PASSING" | "FAILING" | "SKIPPED" }
  for (const [title, status] of Object.entries(results)) {
    await prisma.qAScenario.updateMany({
      where: { garageId, title },
      data: { status, lastRunAt: new Date() },
    });
  }
}
