import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { engine } = await req.json();

    if (!["content", "leadgen", "freelance"].includes(engine)) {
      return NextResponse.json({ error: "Invalid engine" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/engines/${engine}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
