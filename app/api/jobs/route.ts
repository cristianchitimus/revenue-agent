import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const minScore = Number(searchParams.get("minScore") || 0);
  const category = searchParams.get("category"); // fullstack | design | both
  const status = searchParams.get("status") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const limit = Math.min(200, Number(searchParams.get("limit") || 100));

  const jobs = await prisma.job.findMany({
    where: {
      matchScore: { gte: minScore },
      ...(category && category !== "all" ? { category } : {}),
      ...(status ? { status } : {}),
      ...(platform ? { platform: { slug: platform } } : {}),
    },
    include: { platform: true, proposals: { select: { id: true, status: true } } },
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({ jobs });
}

export async function PATCH(req: NextRequest) {
  try {
    const { jobId, status } = (await req.json()) as {
      jobId: string;
      status: string;
    };
    const job = await prisma.job.update({
      where: { id: jobId },
      data: { status },
    });
    return NextResponse.json({ success: true, job });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
