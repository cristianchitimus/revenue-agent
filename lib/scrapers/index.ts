import { prisma } from "@/lib/db";
import { categorizeJob, extractSkills, scoreJob } from "@/lib/scoring";
import { scrapeRemoteOk } from "./remoteok";
import { scrapeWwr } from "./wwr";
import { scrapeRemotive } from "./remotive";
import { scrapeHimalayas } from "./himalayas";
import { scrapeHn } from "./hn";
import { scrapeReddit } from "./reddit";
import { scrapeUpworkRss } from "./upwork-rss";
import type { ScrapeResult } from "./types";

const SCRAPERS = [
  scrapeRemoteOk,
  scrapeWwr,
  scrapeRemotive,
  scrapeHimalayas,
  scrapeHn,
  scrapeReddit,
  scrapeUpworkRss,
];

export interface RunSummary {
  platform: string;
  jobsFound: number;
  jobsNew: number;
  error?: string;
  ms: number;
}

export async function runAllScrapers(): Promise<RunSummary[]> {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Kick off all scrapers concurrently. A slow scraper can't block others.
  const results = await Promise.all(
    SCRAPERS.map(async (scraper) => {
      const started = Date.now();
      let result: ScrapeResult;
      try {
        result = await scraper();
      } catch (err) {
        return {
          result: {
            platformSlug: "unknown",
            jobs: [],
            error: err instanceof Error ? err.message : String(err),
          },
          ms: Date.now() - started,
        };
      }
      return { result, ms: Date.now() - started };
    })
  );

  const summaries: RunSummary[] = [];

  for (const { result, ms } of results) {
    const platform = await prisma.platform.upsert({
      where: { slug: result.platformSlug },
      update: { lastScanAt: new Date() },
      create: {
        slug: result.platformSlug,
        name: result.platformSlug,
        lastScanAt: new Date(),
      },
    });

    const scanRun = await prisma.scanRun.create({
      data: {
        platformId: platform.id,
        status: result.error ? "error" : "running",
        jobsFound: result.jobs.length,
        error: result.error,
      },
    });

    let jobsNew = 0;

    for (const raw of result.jobs) {
      const category = categorizeJob({
        title: raw.title,
        description: raw.description,
        skills: raw.skills,
        postedAt: raw.postedAt,
      });
      const enrichedSkills = Array.from(
        new Set([...raw.skills, ...extractSkills({
          title: raw.title,
          description: raw.description,
          skills: raw.skills,
          postedAt: raw.postedAt,
        })])
      );
      const matchScore = scoreJob(
        {
          title: raw.title,
          description: raw.description,
          skills: enrichedSkills,
          budgetMin: raw.budgetMin,
          budgetMax: raw.budgetMax,
          postedAt: raw.postedAt,
        },
        settings
      );

      try {
        const existing = await prisma.job.findUnique({
          where: {
            platformId_externalId: {
              platformId: platform.id,
              externalId: raw.externalId,
            },
          },
        });

        if (!existing) jobsNew++;

        await prisma.job.upsert({
          where: {
            platformId_externalId: {
              platformId: platform.id,
              externalId: raw.externalId,
            },
          },
          update: {
            // Don't overwrite user-set status on updates
            title: raw.title,
            description: raw.description.slice(0, 10000),
            budgetMin: raw.budgetMin,
            budgetMax: raw.budgetMax,
            matchScore,
          },
          create: {
            platformId: platform.id,
            externalId: raw.externalId,
            title: raw.title,
            description: raw.description.slice(0, 10000),
            company: raw.company,
            location: raw.location,
            remote: raw.remote,
            url: raw.url,
            budgetMin: raw.budgetMin,
            budgetMax: raw.budgetMax,
            budgetType: raw.budgetType,
            currency: raw.currency,
            skills: enrichedSkills,
            category,
            matchScore,
            postedAt: raw.postedAt,
          },
        });
      } catch {
        // Skip duplicate/bad rows, continue with others
      }
    }

    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: {
        finishedAt: new Date(),
        status: result.error ? "error" : "success",
        jobsNew,
      },
    });

    await prisma.platform.update({
      where: { id: platform.id },
      data: { jobsFound: { increment: jobsNew } },
    });

    summaries.push({
      platform: result.platformSlug,
      jobsFound: result.jobs.length,
      jobsNew,
      error: result.error,
      ms,
    });
  }

  return summaries;
}
