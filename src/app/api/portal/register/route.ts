// POST /api/portal/register
// Self-registration for new customers via phone OTP.
// Links the new Customer to the default garage (env var or first in DB).

import { NextResponse } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";
import { prisma } from "@/lib/connectors/prisma";

export async function POST(req: Request) {
  const supabase = await createServerConnector();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const phone = user.phone?.replace(/\D/g, "").slice(-10);
  if (!phone) return NextResponse.json({ error: "No phone number on account" }, { status: 400 });

  const { name } = await req.json() as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Check if already registered
  const existing = await prisma.customer.findFirst({ where: { phone: { endsWith: phone } } });
  if (existing) return NextResponse.json({ customer: existing });

  // Resolve garageId — env var first, fall back to first garage in DB
  let garageId = process.env.DEFAULT_GARAGE_ID ?? null;
  if (!garageId) {
    const first = await prisma.garage.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    garageId = first?.id ?? null;
  }
  if (!garageId) return NextResponse.json({ error: "No garage configured" }, { status: 500 });

  const customer = await prisma.customer.create({
    data: { garageId, name: name.trim(), phone },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
