import { NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scrapers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const summary = await runAllScrapers();
    const totalNew = summary.reduce((acc, s) => acc + s.jobsNew, 0);
    const totalFound = summary.reduce((acc, s) => acc + s.jobsFound, 0);
    return NextResponse.json({
      success: true,
      totalNew,
      totalFound,
      platforms: summary,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
