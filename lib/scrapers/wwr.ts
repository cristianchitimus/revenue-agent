import type { ScrapedJob, ScrapeResult } from "./types";
import { fetchText, stripHtml } from "./types";

// WWR Contract category feed only (pay-per-job gigs, not full-time hires)
const FEEDS = [
  "https://weworkremotely.com/categories/remote-contract-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-contract-design-jobs.rss",
];

// Simple regex-based RSS parser - avoids XML entity-limit issues that the
// fast-xml-parser throws on large WWR feeds (1000+ entities).
function parseRss(xml: string): Array<{
  guid: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  region: string;
  categories: string[];
}> {
  const items: Array<{
    guid: string;
    title: string;
    link: string;
    description: string;
    pubDate: string;
    region: string;
    categories: string[];
  }> = [];

  // Match each <item>...</item> block
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const body = match[1];
    const pick = (tag: string): string => {
      // Handle both <tag>value</tag> and <tag><![CDATA[value]]></tag>
      const re = new RegExp(
        `<${tag}\\b[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*<\\/${tag}>`,
        "i"
      );
      const m = body.match(re);
      return (m?.[1] ?? m?.[2] ?? "").trim();
    };
    const pickAll = (tag: string): string[] => {
      const re = new RegExp(
        `<${tag}\\b[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*<\\/${tag}>`,
        "gi"
      );
      const out: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        out.push((m[1] ?? m[2] ?? "").trim());
      }
      return out;
    };

    const guid = pick("guid");
    const title = pick("title");
    const link = pick("link");
    if (!guid || !title || !link) continue;

    items.push({
      guid,
      title,
      link,
      description: pick("description"),
      pubDate: pick("pubDate"),
      region: pick("region"),
      categories: pickAll("category"),
    });
  }

  return items;
}

export async function scrapeWwr(): Promise<ScrapeResult> {
  const all: ScrapedJob[] = [];
  const errors: string[] = [];

  // Fetch all feeds in parallel to stay within function time budget
  const results = await Promise.allSettled(
    FEEDS.map((feed) => fetchText(feed))
  );

  for (let i = 0; i < FEEDS.length; i++) {
    const feed = FEEDS[i];
    const res = results[i];
    if (res.status === "rejected") {
      errors.push(
        `${feed}: ${res.reason instanceof Error ? res.reason.message : res.reason}`
      );
      continue;
    }
    try {
      const items = parseRss(res.value);
      for (const item of items) {
        // WWR titles are "Company: Position"
        const titleParts = item.title.split(":");
        const company = titleParts.length > 1 ? titleParts[0].trim() : null;
        const position =
          titleParts.length > 1 ? titleParts.slice(1).join(":").trim() : item.title;

        all.push({
          externalId: item.guid,
          title: position,
          description: stripHtml(item.description),
          company,
          location: item.region || "Remote",
          remote: true,
          url: item.link,
          budgetMin: null,
          budgetMax: null,
          budgetType: "unknown",
          currency: "USD",
          skills: item.categories,
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
