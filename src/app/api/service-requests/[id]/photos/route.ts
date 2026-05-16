// POST /api/service-requests/[id]/photos
// Logs uploaded media URLs as PHOTO timeline events.
// Body: { photos: { url: string; type: "image" | "video"; caption?: string }[] }

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const POST = withAuthParams<{ id: string }>(async (req, { profile }, { id }) => {
  const { photos } = (await req.json()) as {
    photos: { url: string; type: "image" | "video"; caption?: string }[];
  };

  if (!Array.isArray(photos) || photos.length === 0)
    return NextResponse.json({ error: "No photos provided" }, { status: 422 });

  const events = await prisma.$transaction(
    photos.map((p) =>
      prisma.timelineEvent.create({
        data: {
          serviceRequestId: id,
          type: "PHOTO",
          actorId: profile?.id ?? null,
          actorName: profile?.name ?? null,
          body: p.caption ?? (p.type === "video" ? "Video uploaded" : "Photo uploaded"),
          fileUrl: p.url,
          metadata: { mediaType: p.type } as object,
        },
      }),
    ),
  );

  return NextResponse.json({ created: events.length });
});
