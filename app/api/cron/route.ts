import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scrapers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` header
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runAllScrapers();
    const totalNew = summary.reduce((acc, s) => acc + s.jobsNew, 0);
    return NextResponse.json({ success: true, totalNew, platforms: summary });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
