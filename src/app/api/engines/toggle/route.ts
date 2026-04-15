import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { engine, enabled } = await req.json();

    if (!["content", "leadgen", "freelance"].includes(engine)) {
      return NextResponse.json({ error: "Invalid engine" }, { status: 400 });
    }

    const config = await db.engineConfig.upsert({
      where: { engine },
      update: { enabled },
      create: {
        engine,
        enabled,
        schedule: engine === "content" ? "0 6 * * *" : engine === "leadgen" ? "0 */4 * * *" : "0 */2 * * *",
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Toggle engine error:", error);
    return NextResponse.json({ error: "Failed to toggle engine" }, { status: 500 });
  }
}
