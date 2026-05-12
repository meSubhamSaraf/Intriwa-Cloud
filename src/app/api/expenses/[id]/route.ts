// DELETE /api/expenses/[id] — delete an expense

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const DELETE = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const expense = await prisma.garageExpense.findFirst({
    where: { id, garageId },
  });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.garageExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
