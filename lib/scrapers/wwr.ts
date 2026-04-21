import { XMLParser } from "fast-xml-parser";
import type { ScrapedJob, ScrapeResult } from "./types";
import { fetchText, stripHtml } from "./types";

// WWR category feeds
const FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
];

interface RssItem {
  guid?: string | { "#text": string };
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  region?: string;
  category?: string | string[];
}

export async function scrapeWwr(): Promise<ScrapeResult> {
  const parser = new XMLParser({ ignoreAttributes: false });
  const all: ScrapedJob[] = [];
  const errors: string[] = [];

  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed);
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

        // WWR titles are "Company: Position"
        const titleParts = item.title.split(":");
        const company = titleParts.length > 1 ? titleParts[0].trim() : null;
        const position =
          titleParts.length > 1 ? titleParts.slice(1).join(":").trim() : item.title;

        const cats = Array.isArray(item.category)
          ? item.category
          : item.category
          ? [item.category]
          : [];

        all.push({
          externalId: guid,
          title: position,
          description: stripHtml(item.description || ""),
          company,
          location: item.region || "Remote",
          remote: true,
          url: item.link,
          budgetMin: null,
          budgetMax: null,
          budgetType: "unknown",
          currency: "USD",
          skills: cats,
          postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
    } catch (err) {
      errors.push(`${feed}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Dedupe by externalId (categories overlap)
  const seen = new Set<string>();
  const jobs = all.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  return {
    platformSlug: "wwr",
    jobs,
    error: errors.length && jobs.length === 0 ? errors.join("; ") : undefined,
  };
}
