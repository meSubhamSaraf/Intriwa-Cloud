// ─────────────────────────────────────────────────────────────────────────────
// API Helper: Auth
// ─────────────────────────────────────────────────────────────────────────────
// Every route handler calls requireAuth() first.
// It verifies the Supabase session and returns the Profile row so routes
// know the caller's role and garageId without repeating that logic.
//
// Profile auto-creation:
//   For password-based logins the auth callback never fires, so this helper
//   upserts the Profile on every first API call.  Role and garageId are read
//   from Supabase user_metadata.  For MECHANIC users without a garageId in
//   their metadata we fall back to looking it up from the Mechanic record that
//   matches their email — so a test mechanic only needs role in metadata.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";
import { prisma } from "@/lib/connectors/prisma";
import type { Profile } from "@/generated/prisma/client";

export type AuthContext = {
  userId: string;
  profile: Profile;
  garageId: string;
};

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createServerConnector();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meta     = user.user_metadata ?? {};
  let   role     = (meta.role as string | undefined) ?? "OPS_MANAGER";
  let   garageId = (meta.garageId as string | undefined) ?? null;

  // Phone-based logins (mechanics): look up by phone number.
  // Supabase stores phone as +91XXXXXXXXXX; our DB stores 10-digit numbers.
  if (user.phone && !user.email) {
    const digits = user.phone.replace(/\D/g, "").slice(-10); // last 10 digits
    const linked = await prisma.mechanic.findFirst({
      where: { phone: { endsWith: digits }, isActive: true },
      select: { garageId: true },
    });
    if (linked) { role = "MECHANIC"; garageId = linked.garageId; }
  }

  // Email-based mechanic logins: look up by email if garageId still missing
  if (role === "MECHANIC" && !garageId && user.email) {
    const linked = await prisma.mechanic.findFirst({
      where: { email: user.email, isActive: true },
      select: { garageId: true },
    });
    garageId = linked?.garageId ?? null;
  }

  // Upsert the Profile — creates it on first login, no-ops on subsequent ones
  const profile = await prisma.profile.upsert({
    where:  { id: user.id },
    create: {
      id:       user.id,
      email:    user.email!,
      name:     (meta.name as string | undefined) ?? user.email!.split("@")[0],
      role:     role as "SUPER_ADMIN" | "OPS_MANAGER" | "MECHANIC",
      garageId,
    },
    update: {
      // Backfill garageId if it was resolved above and was previously null
      ...(garageId ? { garageId } : {}),
    },
  });

  if (!profile.garageId) {
    throw NextResponse.json(
      { error: "Account has no garage — contact your admin" },
      { status: 403 }
    );
  }

  return { userId: user.id, profile, garageId: profile.garageId };
}

// withAuth wraps simple routes (no dynamic params)
export function withAuth(
  handler: (req: Request, ctx: AuthContext) => Promise<NextResponse>
) {
  return async (req: Request) => {
    try {
      const ctx = await requireAuth();
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof NextResponse) return e;
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[API error]", msg, e);
      return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
    }
  };
}

// withAuthParams wraps dynamic routes that have URL params (e.g. /api/foo/[id])
export function withAuthParams<P = Record<string, string>>(
  handler: (req: Request, ctx: AuthContext, params: P) => Promise<NextResponse>
) {
  return async (req: Request, { params }: { params: Promise<P> }) => {
    try {
      const [ctx, resolvedParams] = await Promise.all([requireAuth(), params]);
      return await handler(req, ctx, resolvedParams);
    } catch (e) {
      if (e instanceof NextResponse) return e;
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[API error]", msg, e);
      return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
    }
  };
}
