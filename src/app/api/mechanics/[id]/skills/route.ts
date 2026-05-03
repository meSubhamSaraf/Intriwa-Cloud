// PUT /api/mechanics/[id]/skills — replace all skills for a mechanic

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PUT = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const { labels } = await req.json() as { labels: string[] };

  // Upsert each skill label into MechanicSkill, then replace junction rows
  const skillRecords = await Promise.all(
    labels.map((label) =>
      prisma.mechanicSkill.upsert({
        where: { label },
        create: { label, isPreset: false },
        update: {},
      })
    )
  );

  await prisma.mechanicToSkill.deleteMany({ where: { mechanicId: id } });
  await prisma.mechanicToSkill.createMany({
    data: skillRecords.map((s) => ({ mechanicId: id, skillId: s.id })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, count: labels.length });
});
