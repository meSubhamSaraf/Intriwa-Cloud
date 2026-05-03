// GET /api/me/redirect
// Returns the correct home URL for the logged-in user based on their role.
// EmailForm calls this after a successful password login so mechanics land
// on /mechanic-portal instead of /dashboard without needing metadata set first.

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";

export const GET = withAuth(async (_req, { profile }) => {
  const redirect = profile.role === "MECHANIC" ? "/mechanic-portal" : "/dashboard";
  return NextResponse.json({ redirect, role: profile.role });
});
