import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const results: Record<string, unknown> = {};
  const engines = await db.engineConfig.findMany({ where: { enabled: true } });

  for (const engine of engines) {
    try {
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
