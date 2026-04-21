import type { ScrapedJob, ScrapeResult } from "./types";
import { fetchJson, stripHtml } from "./types";

interface HnStoryHit {
  objectID: string;
  title?: string;
  url?: string;
  author?: string;
  created_at: string;
  created_at_i: number;
  num_comments?: number;
}

interface HnCommentHit {
  objectID: string;
  comment_text?: string;
  author?: string;
  created_at: string;
  created_at_i: number;
  parent_id?: number;
  story_id?: number;
}

interface HnResponse<T> {
  hits: T[];
}

// Find the most recent "Ask HN: Who is hiring?" thread
async function findLatestWhoIsHiring(): Promise<HnStoryHit | null> {
  const res = await fetchJson<HnResponse<HnStoryHit>>(
    "https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=story&hitsPerPage=5"
  );
  const hit = res.hits
    .filter((h) =>
      h.title?.toLowerCase().includes("ask hn: who is hiring")
    )
    .sort((a, b) => b.created_at_i - a.created_at_i)[0];
  return hit || null;
}

// Fetch top-level comments in that thread (capped for serverless time budget)
async function fetchComments(storyId: string): Promise<HnCommentHit[]> {
  const all: HnCommentHit[] = [];
  let page = 0;
  // Cap: 2 pages × 100 = 200 comments max. Enough for top matches on
  // the Hobby plan's 60s function limit.
  while (page < 2) {
    const res = await fetchJson<HnResponse<HnCommentHit>>(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=100&page=${page}`
    );
    if (!res.hits.length) break;
    all.push(...res.hits);
    if (res.hits.length < 100) break;
    page++;
  }
  return all;
}

// Extract URL from HN comment HTML
function extractUrl(html: string): string | null {
  const m = html.match(/<a[^>]+href="([^"]+)"/i);
  return m ? m[1] : null;
}

// Try to pull first non-empty line as "title"
function extractTitle(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim().length > 10);
  if (!firstLine) return text.slice(0, 100);
  return firstLine.slice(0, 200).trim();
}

export async function scrapeHn(): Promise<ScrapeResult> {
  try {
    const thread = await findLatestWhoIsHiring();
    if (!thread) {
      return {
        platformSlug: "hn",
        jobs: [],
        error: "No Who-is-hiring thread found",
      };
    }

    const comments = await fetchComments(thread.objectID);

    const jobs: ScrapedJob[] = comments
      .filter((c) => c.comment_text && c.comment_text.length > 80)
      // Only top-level comments (parent = story)
      .filter((c) => c.parent_id === Number(thread.objectID))
      .map((c) => {
        const text = stripHtml(c.comment_text || "");
        const url =
          extractUrl(c.comment_text || "") ||
          `https://news.ycombinator.com/item?id=${c.objectID}`;
        return {
          externalId: `hn-${c.objectID}`,
          title: extractTitle(text),
          description: text,
          company: c.author || null,
          location: null,
          remote: /remote/i.test(text),
          url,
          budgetMin: null,
          budgetMax: null,
          budgetType: "unknown",
          currency: "USD",
          skills: [],
          postedAt: new Date(c.created_at_i * 1000),
        } as ScrapedJob;
      });

    return { platformSlug: "hn", jobs };
  } catch (err) {
    return {
      platformSlug: "hn",
      jobs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
