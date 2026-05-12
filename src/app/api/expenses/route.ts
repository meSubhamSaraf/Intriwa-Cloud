// GET  /api/expenses          — list expenses; supports ?startDate=&endDate=
// POST /api/expenses          — create a new expense

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate   = searchParams.get("endDate");

  const expenses = await prisma.garageExpense.findMany({
    where: {
      garageId,
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate   ? { lte: new Date(endDate)   } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const { category, description, amount, date, proofUrl } = body as {
    category: string;
    description: string;
    amount: number;
    date: string;
    proofUrl?: string;
  };

  if (!category || !description || amount == null || !date) {
    return NextResponse.json(
      { error: "category, description, amount, and date are required" },
      { status: 400 }
    );
  }

  const expense = await prisma.garageExpense.create({
    data: {
      garageId,
      category,
      description,
      amount,
      date: new Date(date),
      proofUrl: proofUrl ?? null,
    },
  });

  return NextResponse.json(expense, { status: 201 });
});
