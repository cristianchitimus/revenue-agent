import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    // Whitelist fields
    const allowed: string[] = [
      "displayName",
      "headline",
      "yearsExperience",
      "hourlyRateUsd",
      "primarySkills",
      "secondarySkills",
      "minBudget",
      "minMatchScore",
      "excludeKeywords",
      "includeKeywords",
      "proposalTone",
      "portfolioUrl",
      "bio",
    ];
    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
