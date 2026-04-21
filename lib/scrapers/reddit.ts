import { XMLParser } from "fast-xml-parser";
import type { ScrapedJob, ScrapeResult } from "./types";
import { parseBudget, stripHtml } from "./types";

// Subreddits that host pay-per-job gig posts with [HIRING] tags
const SUBREDDITS = ["forhire", "jobbit", "designjobs"];

// Reddit exposes a public RSS feed per subreddit at /r/{name}/new.rss
// No OAuth needed. Rate limit is per-IP (shared across users) but lenient
// for low-frequency polling. We scan once per cron run = 1/day.
//
// Note: Reddit returns 403 to generic bot user-agents. Must present a real
// browser-like UA string.
const REDDIT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface RssItem {
  id?: string;
  title?: string;
  link?: { "@_href"?: string } | string;
  author?: { name?: string } | string;
  updated?: string;
  published?: string;
  content?: string | { "#text"?: string };
  category?: { "@_label"?: string; "@_term"?: string } | Array<{ "@_label"?: string; "@_term"?: string }>;
}

function extractLink(link: RssItem["link"]): string | null {
  if (!link) return null;
  if (typeof link === "string") return link;
  if (typeof link === "object" && link["@_href"]) return link["@_href"];
  return null;
}

function extractAuthor(author: RssItem["author"]): string | null {
  if (!author) return null;
  if (typeof author === "string") return author;
  return author.name || null;
}

function extractContent(content: RssItem["content"]): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content["#text"] || "";
}

function extractFlair(category: RssItem["category"]): string | null {
  if (!category) return null;
  const c = Array.isArray(category) ? category[0] : category;
  return c?.["@_label"] || c?.["@_term"] || null;
}

export async function scrapeReddit(): Promise<ScrapeResult> {
  const all: ScrapedJob[] = [];
  const errors: string[] = [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  });

  for (const sub of SUBREDDITS) {
    try {
      // Reddit public RSS - no auth required
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.rss?limit=50`, {
        headers: {
          "User-Agent": REDDIT_UA,
          Accept: "application/atom+xml, application/xml, text/xml",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        errors.push(`r/${sub}: HTTP ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const json = parser.parse(xml);
      const items: RssItem[] = Array.isArray(json?.feed?.entry)
        ? json.feed.entry
        : json?.feed?.entry
        ? [json.feed.entry]
        : [];

      for (const item of items) {
        if (!item.id || !item.title) continue;

        const title = typeof item.title === "string" ? item.title : String(item.title);
        const permalink = extractLink(item.link);
        if (!permalink) continue;

        // Filter: r/forhire convention is [HIRING] for clients hiring.
        // r/jobbit and r/designjobs are client-only boards, so we keep everything.
        // We explicitly EXCLUDE [FOR HIRE] / [FH] / SEEKING WORK (freelancers offering services).
        const titleLower = title.toLowerCase();
        const isOffering =
          /\[for\s*hire\]|\[fh\]|seeking\s+work|looking\s+for\s+work|available\s+for\s+hire/i.test(
            titleLower
          );
        if (isOffering) continue;

        // For r/forhire specifically, require [HIRING] or similar hiring signal
        if (sub === "forhire") {
          const isHiring =
            /\[hiring\]|\[h\]|hiring:/i.test(titleLower) ||
            (title.includes("[") && /hiring/i.test(title));
          if (!isHiring) continue;
        }

        const content = stripHtml(extractContent(item.content)).slice(0, 5000);
        const fullText = `${title} ${content}`;
        const budget = parseBudget(fullText);
        const author = extractAuthor(item.author);
        const flair = extractFlair(item.category);

        all.push({
          // Strip Reddit's t3_ prefix for cleaner IDs
          externalId: `reddit-${(item.id as string).replace(/^.*?t3_/, "t3_")}`,
          title: title
            .replace(/\[hiring\]\s*/i, "")
            .replace(/\[h\]\s*/i, "")
            .replace(/hiring:\s*/i, "")
            .trim(),
          description: content,
          company: author ? `u/${author}` : null,
          location: null,
          remote: /remote/i.test(fullText),
          url: permalink,
          budgetMin: budget.min ?? null,
          budgetMax: budget.max ?? null,
          budgetType: budget.type,
          currency: "USD",
          skills: flair ? [`r/${sub}`, flair] : [`r/${sub}`],
          postedAt: item.published
            ? new Date(item.published)
            : item.updated
            ? new Date(item.updated)
            : new Date(),
        });
      }

      // Small delay between subreddits to be polite to Reddit's RSS endpoint
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      errors.push(`r/${sub}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return {
    platformSlug: "reddit",
    jobs: all,
    error: errors.length && all.length === 0 ? errors.join("; ") : undefined,
  };
}
