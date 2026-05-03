// POST /api/upload/sign
// Returns a Supabase Storage signed upload URL so the client can PUT directly.
// Body: { bucket?: string, path: string }
// Response: { signedUrl, token, path, publicUrl }

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { createAdminClient } from "@/lib/connectors/supabase-admin";

export const POST = withAuth(async (req, { garageId }) => {
  const { bucket = "job-photos", path } = await req.json();
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 422 });

  // Prefix path with garageId for tenant isolation
  const fullPath = `${garageId}/${path}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(fullPath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create signed URL" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fullPath);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: fullPath,
    publicUrl,
  });
});
