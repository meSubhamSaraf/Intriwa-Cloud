// ─────────────────────────────────────────────────────────────────────────────
// API Helper: Auth
// ─────────────────────────────────────────────────────────────────────────────
// Every route handler calls requireAuth() first.
// It verifies the Supabase session and returns the Profile row so routes
// know the caller's role and garageId without repeating that logic.
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

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });

  if (!profile) {
    throw NextResponse.json({ error: "Profile not found — contact your admin" }, { status: 403 });
  }

  if (!profile.garageId) {
    throw NextResponse.json({ error: "Account has no garage — contact your admin" }, { status: 403 });
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
