import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Get all enabled engines
  const engines = await db.engineConfig.findMany({ where: { enabled: true } });

  for (const engine of engines) {
    try {
      // Trigger each engine via its API route
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/engines/${engine.engine}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      results[engine.engine] = await response.json();
    } catch (error) {
      results[engine.engine] = {
        error: error instanceof Error ? error.message : "Failed",
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    enginesTriggered: engines.map((e) => e.engine),
    results,
  });
}
