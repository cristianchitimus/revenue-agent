import { XMLParser } from "fast-xml-parser";
import type { ScrapedJob, ScrapeResult } from "./types";
import { fetchText, parseBudget, stripHtml } from "./types";

/**
 * Upwork's official API is restricted to enterprise partners, BUT their
 * public RSS feeds are still available (as of early 2026) with a different
 * URL structure than the old api feed.
 *
 * We hit the public search RSS with relevant keywords. Results are limited
 * but always non-zero if keywords are valid.
 */
const QUERIES = [
  "nextjs",
  "react",
  "typescript",
  "full+stack",
  "supabase",
  "ui+design",
  "landing+page",
  "stripe+integration",
];

interface RssItem {
  guid?: string | { "#text": string };
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
}

function buildFeedUrl(query: string): string {
  // Public search RSS endpoint
  return `https://www.upwork.com/ab/feed/jobs/rss?q=${query}&sort=recency&paging=0%3B20`;
}

export async function scrapeUpworkRss(): Promise<ScrapeResult> {
  const parser = new XMLParser({ ignoreAttributes: false });
  const all: ScrapedJob[] = [];
  const errors: string[] = [];

  for (const q of QUERIES) {
    try {
      const xml = await fetchText(buildFeedUrl(q), {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });
      const json = parser.parse(xml);
      const items: RssItem[] = Array.isArray(json?.rss?.channel?.item)
        ? json.rss.channel.item
        : json?.rss?.channel?.item
        ? [json.rss.channel.item]
        : [];

      for (const item of items) {
        const guid =
          typeof item.guid === "string" ? item.guid : item.guid?.["#text"];
        if (!guid || !item.title || !item.link) continue;

        const desc = stripHtml(item.description || "");
        const budget = parseBudget(desc);
        const cats = Array.isArray(item.category)
          ? item.category
          : item.category
          ? [item.category]
          : [];

        all.push({
          externalId: guid,
          title: item.title,
          description: desc,
          company: null,
          location: null,
          remote: true,
          url: typeof item.link === "string" ? item.link : String(item.link),
          budgetMin: budget.min ?? null,
          budgetMax: budget.max ?? null,
          budgetType: budget.type,
          currency: "USD",
          skills: cats,
          postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }

      // Polite delay between Upwork requests
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      errors.push(`${q}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Dedupe by externalId (queries overlap)
  const seen = new Set<string>();
  const jobs = all.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  return {
    platformSlug: "upwork-rss",
    jobs,
    error:
      errors.length && jobs.length === 0
        ? `All queries failed: ${errors.slice(0, 2).join("; ")}`
        : undefined,
  };
}
