import type { ScrapedJob, ScrapeResult } from "./types";
import { parseBudget } from "./types";

const SUBREDDITS = [
  "forhire",
  "jobbit",
  "remotejs",
  "designjobs",
];

const OFFERING_TAGS = ["[for hire]", "[fh]"];
const HIRING_TAGS = ["[hiring]", "[h]", "hiring:"];

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    url: string;
    permalink: string;
    created_utc: number;
    subreddit: string;
    link_flair_text: string | null;
    num_comments: number;
    score: number;
  };
}

interface RedditListing {
  data: { children: RedditPost[]; after: string | null };
}

async function getAccessToken(): Promise<string> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  const userAgent = process.env.REDDIT_USER_AGENT || "freelance-agent/1.0";

  if (!id || !secret || !username || !password) {
    throw new Error("Missing Reddit credentials");
  }

  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Reddit auth ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function scrapeReddit(): Promise<ScrapeResult> {
  try {
    if (
      !process.env.REDDIT_CLIENT_ID ||
      !process.env.REDDIT_CLIENT_SECRET ||
      !process.env.REDDIT_USERNAME
    ) {
      return {
        platformSlug: "reddit",
        jobs: [],
        error: "Reddit credentials not configured (optional)",
      };
    }

    const token = await getAccessToken();
    const userAgent = process.env.REDDIT_USER_AGENT || "freelance-agent/1.0";
    const all: ScrapedJob[] = [];

    // Fetch all subreddits in parallel (Reddit allows 60/min per OAuth token)
    const results = await Promise.allSettled(
      SUBREDDITS.map((sub) =>
        fetch(`https://oauth.reddit.com/r/${sub}/new?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": userAgent,
          },
          cache: "no-store",
        }).then(async (res) => ({
          sub,
          ok: res.ok,
          json: res.ok ? ((await res.json()) as RedditListing) : null,
        }))
      )
    );

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value.ok || !r.value.json) continue;
      const { sub, json: listing } = r.value;

      for (const post of listing.data.children) {
        const p = post.data;
        const title = p.title.toLowerCase();
        const flair = (p.link_flair_text || "").toLowerCase();

        // Skip "for hire" posts (people offering services)
        if (OFFERING_TAGS.some((t) => title.includes(t))) continue;
        if (flair === "for hire" || flair === "fh") continue;

        // Keep hiring posts only (we dropped hire-only subs)
        const isHiring =
          HIRING_TAGS.some((t) => title.includes(t)) || flair === "hiring";
        if (!isHiring) continue;

        const budget = parseBudget(`${p.title} ${p.selftext}`);

        all.push({
          externalId: `reddit-${p.id}`,
          title: p.title.replace(/\[hiring\]/i, "").trim(),
          description: p.selftext || "",
          company: `u/${p.author}`,
          location: `r/${p.subreddit}`,
          remote: true,
          url: `https://reddit.com${p.permalink}`,
          budgetMin: budget.min ?? null,
          budgetMax: budget.max ?? null,
          budgetType: budget.type,
          currency: "USD",
          skills: [],
          postedAt: new Date(p.created_utc * 1000),
        });
      }
    }

    return { platformSlug: "reddit", jobs: all };
  } catch (err) {
    return {
      platformSlug: "reddit",
      jobs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
