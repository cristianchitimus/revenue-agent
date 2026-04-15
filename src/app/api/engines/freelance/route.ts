import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { scrapeUpworkJobs } from "@/lib/scrapers/upwork";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function scoreJobWithAI(job: {
  title: string;
  description: string;
  budget?: number | null;
  skills: string[];
}, profileSkills: string[]): Promise<{
  aiScore: number;
  aiComplexity: string;
  aiCategory: string;
  aiNotes: string;
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
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Analyze this freelance job posting and score it for match quality.

My skills: ${profileSkills.join(", ")}

Job title: ${job.title}
Description: ${job.description.slice(0, 2000)}
Budget: ${job.budget ? `€${job.budget}` : "Not specified"}
Required skills: ${job.skills.join(", ")}

Respond in JSON:
{
  "aiScore": <0-100 match score>,
  "aiComplexity": "<auto|semi|manual>",
  "aiCategory": "<landing_page|scraping|bug_fix|api_integration|data_task|full_app|other>",
  "aiNotes": "<brief analysis: why this score, estimated hours, risks>"
}

Scoring criteria:
- auto (80-100): Simple tasks I can deliver with minimal oversight (landing pages, bug fixes, simple scraping)
- semi (50-79): Needs some human review but AI can draft most of it
- manual (0-49): Complex projects requiring deep involvement`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const data = await response.json();
  const text = data.content[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse job score JSON");

  return JSON.parse(jsonMatch[0]);
}

async function generateProposal(job: {
  title: string;
  description: string;
  budget?: number | null;
  aiCategory?: string | null;
}, profileBio: string): Promise<{ content: string; bidAmount: number; estimatedHours: number }> {
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
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Write a compelling freelance proposal for this job.

Job: ${job.title}
Description: ${job.description.slice(0, 1500)}
Budget: ${job.budget ? `€${job.budget}` : "Not specified"}
Category: ${job.aiCategory ?? "general"}

My profile: ${profileBio}

Write a personalized, professional proposal that:
- Opens with understanding their specific need
- Highlights relevant experience
- Proposes a clear approach/timeline
- Ends with a call to action
- Keep it 150-250 words
- Be confident but not arrogant

Respond in JSON:
{
  "content": "proposal text",
  "bidAmount": <suggested bid in EUR>,
  "estimatedHours": <estimated hours to complete>
}`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const data = await response.json();
  const text = data.content[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse proposal JSON");

  return JSON.parse(jsonMatch[0]);
}

export async function POST() {
  const startTime = Date.now();

  const runLog = await db.runLog.create({
    data: { engine: "freelance", status: "running", message: "Starting freelance agent" },
  });

  try {
    const config = await db.engineConfig.findUnique({ where: { engine: "freelance" } });
    if (!config?.enabled) {
      await db.runLog.update({
        where: { id: runLog.id },
        data: { status: "success", message: "Engine disabled", endedAt: new Date(), duration: Date.now() - startTime },
      });
      return NextResponse.json({ message: "Engine disabled" });
    }

    // Get skill profiles
    const profiles = await db.skillProfile.findMany({ where: { enabled: true } });
    const allSkills = profiles.flatMap((p) => p.skills);
    const mainProfile = profiles[0];

    // Get platforms
    const platforms = await db.jobPlatform.findMany({ where: { enabled: true } });

    if (platforms.length === 0 || profiles.length === 0) {
      await db.runLog.update({
        where: { id: runLog.id },
        data: { status: "success", message: "No platforms or profiles configured", endedAt: new Date(), duration: Date.now() - startTime },
      });
      return NextResponse.json({ message: "No platforms or profiles configured" });
    }

    let jobsScored = 0;
    let proposalsGenerated = 0;
    let jobsScraped = 0;

    // Step 1: Scrape new jobs from platforms
    for (const platform of platforms) {
      try {
        if (platform.name === "Upwork") {
          const newJobs = await scrapeUpworkJobs(platform.id);
          jobsScraped += newJobs;
          await db.jobPlatform.update({
            where: { id: platform.id },
            data: { lastCheckedAt: new Date() },
          });
        }
        // Future: add Freelancer, PeoplePerHour scrapers here
      } catch (err) {
        console.error(`Failed to scrape ${platform.name}:`, err);
      }
    }

    // Step 2: Score unscored jobs with AI
    const unscoredJobs = await db.job.findMany({
      where: { status: "new", aiScore: null },
      take: 20,
    });

    for (const job of unscoredJobs) {
      try {
        const score = await scoreJobWithAI(
          { title: job.title, description: job.description, budget: job.budget, skills: job.skills },
          allSkills
        );

        await db.job.update({
          where: { id: job.id },
          data: {
            aiScore: score.aiScore,
            aiComplexity: score.aiComplexity,
            aiCategory: score.aiCategory,
            aiNotes: score.aiNotes,
            status: "scored",
          },
        });

        jobsScored++;
      } catch (err) {
        console.error(`Failed to score job ${job.title}:`, err);
      }
    }

    // Generate proposals for high-scoring auto/semi jobs
    if (mainProfile) {
      const highScoreJobs = await db.job.findMany({
        where: {
          status: "scored",
          aiScore: { gte: 60 },
          aiComplexity: { in: ["auto", "semi"] },
          proposal: null,
        },
        take: 5,
        orderBy: { aiScore: "desc" },
      });

      for (const job of highScoreJobs) {
        try {
          const proposal = await generateProposal(
            { title: job.title, description: job.description, budget: job.budget, aiCategory: job.aiCategory },
            mainProfile.bio ?? "Experienced full-stack developer specializing in Next.js, React, and automation."
          );

          await db.proposal.create({
            data: {
              jobId: job.id,
              content: proposal.content,
              bidAmount: proposal.bidAmount,
              estimatedHours: proposal.estimatedHours,
              status: "draft",
            },
          });

          await db.job.update({
            where: { id: job.id },
            data: { status: "proposed" },
          });

          proposalsGenerated++;
        } catch (err) {
          console.error(`Failed to generate proposal for ${job.title}:`, err);
        }
      }
    }

    await db.engineConfig.update({
      where: { engine: "freelance" },
      data: { lastRunAt: new Date() },
    });

    await db.runLog.update({
      where: { id: runLog.id },
      data: {
        status: "success",
        message: `Scraped ${jobsScraped} jobs, scored ${jobsScored}, generated ${proposalsGenerated} proposals`,
        endedAt: new Date(),
        duration: Date.now() - startTime,
      },
    });

    return NextResponse.json({ success: true, jobsScraped, jobsScored, proposalsGenerated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.runLog.update({
      where: { id: runLog.id },
      data: { status: "error", message, endedAt: new Date(), duration: Date.now() - startTime },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
