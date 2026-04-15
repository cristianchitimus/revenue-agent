import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for article generation

async function generateArticle(keyword: string, niche: string): Promise<{
  title: string;
  content: string;
  metaDescription: string;
}> {
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
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Write a comprehensive, SEO-optimized article about "${keyword}" in the ${niche} niche.

Requirements:
- Title: catchy, includes the keyword naturally
- Length: 1500-2500 words
- Structure: use H2 and H3 headings in markdown
- Include practical tips, examples, and actionable advice
- Natural keyword placement (keyword density ~1-2%)
- Include a compelling introduction and conclusion
- Write in an engaging, authoritative tone
- Include places where affiliate product recommendations would fit naturally (mark them with [AFFILIATE_PLACEHOLDER: product type])
- Meta description: 150-160 characters, compelling, includes keyword

Respond in JSON format:
{
  "title": "...",
  "content": "... (markdown)",
  "metaDescription": "..."
}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0]?.text ?? "";

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse article JSON");

  return JSON.parse(jsonMatch[0]);
}

export async function POST() {
  const startTime = Date.now();

  // Log the run start
  const runLog = await db.runLog.create({
    data: { engine: "content", status: "running", message: "Starting content generation" },
  });

  try {
    // Check if engine is enabled
    const config = await db.engineConfig.findUnique({ where: { engine: "content" } });
    if (!config?.enabled) {
      await db.runLog.update({
        where: { id: runLog.id },
        data: { status: "success", message: "Engine disabled, skipping", endedAt: new Date(), duration: Date.now() - startTime },
      });
      return NextResponse.json({ message: "Engine disabled" });
    }

    // Get enabled niches with their keyword pools
    const niches = await db.niche.findMany({ where: { enabled: true } });

    if (niches.length === 0) {
      await db.runLog.update({
        where: { id: runLog.id },
        data: { status: "success", message: "No niches configured", endedAt: new Date(), duration: Date.now() - startTime },
      });
      return NextResponse.json({ message: "No niches configured" });
    }

    let articlesCreated = 0;

    for (const niche of niches) {
      // Pick a keyword that hasn't been used yet
      const existingSlugs = await db.article.findMany({
        where: { nicheId: niche.id },
        select: { keyword: true },
      });
      const usedKeywords = new Set(existingSlugs.map((a) => a.keyword.toLowerCase()));
      const availableKeyword = niche.keywords.find(
        (k) => !usedKeywords.has(k.toLowerCase())
      );

      if (!availableKeyword) continue;

      try {
        const article = await generateArticle(availableKeyword, niche.name);

        await db.article.create({
          data: {
            nicheId: niche.id,
            title: article.title,
            slug: slugify(article.title),
            keyword: availableKeyword,
            content: article.content,
            metaDescription: article.metaDescription,
            wordCount: article.content.split(/\s+/).length,
            status: "draft",
          },
        });

        articlesCreated++;
      } catch (err) {
        console.error(`Failed to generate article for "${availableKeyword}":`, err);
      }
    }

    // Update engine last run
    await db.engineConfig.update({
      where: { engine: "content" },
      data: { lastRunAt: new Date() },
    });

    await db.runLog.update({
      where: { id: runLog.id },
      data: {
        status: "success",
        message: `Generated ${articlesCreated} articles`,
        endedAt: new Date(),
        duration: Date.now() - startTime,
      },
    });

    return NextResponse.json({ success: true, articlesCreated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.runLog.update({
      where: { id: runLog.id },
      data: { status: "error", message, endedAt: new Date(), duration: Date.now() - startTime },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
