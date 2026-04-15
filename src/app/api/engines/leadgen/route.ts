import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function enrichLeadWithAI(lead: {
  companyName: string;
  website?: string | null;
  industry?: string | null;
}): Promise<{ aiScore: number; aiSummary: string; aiTags: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Analyze this business lead and provide a quality score and summary.

Company: ${lead.companyName}
Website: ${lead.website ?? "N/A"}
Industry: ${lead.industry ?? "Unknown"}

Respond in JSON:
{
  "aiScore": <0-100 quality score based on potential value as a B2B lead>,
  "aiSummary": "<2-3 sentence summary of the company and why they might need services>",
  "aiTags": ["tag1", "tag2", "tag3"] // relevant business tags
}`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const data = await response.json();
  const text = data.content[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse enrichment JSON");

  return JSON.parse(jsonMatch[0]);
}

export async function POST() {
  const startTime = Date.now();

  const runLog = await db.runLog.create({
    data: { engine: "leadgen", status: "running", message: "Starting lead generation" },
  });

  try {
    const config = await db.engineConfig.findUnique({ where: { engine: "leadgen" } });
    if (!config?.enabled) {
      await db.runLog.update({
        where: { id: runLog.id },
        data: { status: "success", message: "Engine disabled", endedAt: new Date(), duration: Date.now() - startTime },
      });
      return NextResponse.json({ message: "Engine disabled" });
    }

    // Get enabled lead sources
    const sources = await db.leadSource.findMany({ where: { enabled: true } });

    if (sources.length === 0) {
      await db.runLog.update({
        where: { id: runLog.id },
        data: { status: "success", message: "No sources configured", endedAt: new Date(), duration: Date.now() - startTime },
      });
      return NextResponse.json({ message: "No sources configured" });
    }

    let leadsScraped = 0;
    let leadsEnriched = 0;

    // Process each source
    for (const source of sources) {
      try {
        // In production, this would call actual scrapers
        // For now, this is the hook where scraping logic plugs in
        // The scraper modules will be added per source type
        console.log(`Processing source: ${source.name} (${source.type})`);

        // Update last scraped timestamp
        await db.leadSource.update({
          where: { id: source.id },
          data: { lastScrapedAt: new Date() },
        });
      } catch (err) {
        console.error(`Failed to scrape ${source.name}:`, err);
      }
    }

    // Enrich un-enriched leads
    const unenrichedLeads = await db.lead.findMany({
      where: { status: "new", aiScore: null },
      take: 20,
    });

    for (const lead of unenrichedLeads) {
      try {
        const enrichment = await enrichLeadWithAI({
          companyName: lead.companyName,
          website: lead.website,
          industry: lead.industry,
        });

        await db.lead.update({
          where: { id: lead.id },
          data: {
            aiScore: enrichment.aiScore,
            aiSummary: enrichment.aiSummary,
            aiTags: enrichment.aiTags,
            status: "enriched",
          },
        });

        leadsEnriched++;
      } catch (err) {
        console.error(`Failed to enrich lead ${lead.companyName}:`, err);
      }
    }

    await db.engineConfig.update({
      where: { engine: "leadgen" },
      data: { lastRunAt: new Date() },
    });

    await db.runLog.update({
      where: { id: runLog.id },
      data: {
        status: "success",
        message: `Scraped ${leadsScraped}, enriched ${leadsEnriched} leads`,
        endedAt: new Date(),
        duration: Date.now() - startTime,
      },
    });

    return NextResponse.json({ success: true, leadsScraped, leadsEnriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.runLog.update({
      where: { id: runLog.id },
      data: { status: "error", message, endedAt: new Date(), duration: Date.now() - startTime },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
