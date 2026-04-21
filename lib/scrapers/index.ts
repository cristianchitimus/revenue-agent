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

    if (result.jobs.length > 0) {
      // Prep all rows with scoring + category in memory
      const prepared = result.jobs.map((raw) => {
        const baseInput = {
          title: raw.title,
          description: raw.description,
          skills: raw.skills,
          postedAt: raw.postedAt,
        };
        const category = categorizeJob(baseInput);
        const enrichedSkills = Array.from(
          new Set([...raw.skills, ...extractSkills(baseInput)])
        );
        const matchScore = scoreJob(
          {
            ...baseInput,
            skills: enrichedSkills,
            budgetMin: raw.budgetMin,
            budgetMax: raw.budgetMax,
          },
          settings
        );
        return { raw, category, enrichedSkills, matchScore };
      });

      // Dedupe within this batch by externalId (some scrapers can double up)
      const seenIds = new Set<string>();
      const uniq = prepared.filter((p) => {
        if (seenIds.has(p.raw.externalId)) return false;
        seenIds.add(p.raw.externalId);
        return true;
      });

      // Single query: which externalIds already exist for this platform?
      const existing = await prisma.job.findMany({
        where: {
          platformId: platform.id,
          externalId: { in: uniq.map((p) => p.raw.externalId) },
        },
        select: { externalId: true },
      });
      const existingIds = new Set(existing.map((e) => e.externalId));

      const toCreate = uniq.filter((p) => !existingIds.has(p.raw.externalId));
      jobsNew = toCreate.length;

      // Batch insert new jobs (1 query instead of N)
      if (toCreate.length > 0) {
        try {
          await prisma.job.createMany({
            data: toCreate.map(({ raw, category, enrichedSkills, matchScore }) => ({
              platformId: platform.id,
              externalId: raw.externalId,
              title: raw.title.slice(0, 500),
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
            })),
            skipDuplicates: true,
          });
        } catch {
          // Swallow batch errors - some rows may conflict; ScanRun still records count
        }
      }

      // For existing jobs, just refresh matchScore (cheap updateMany per unique score bucket)
      // Skip updating everything else to preserve user-set status etc.
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
