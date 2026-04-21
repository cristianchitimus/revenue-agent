export interface ScrapedJob {
  externalId: string;
  title: string;
  description: string;
  company?: string | null;
  location?: string | null;
  remote: boolean;
  url: string;
  budgetMin?: number | null; // USD cents
  budgetMax?: number | null; // USD cents
  budgetType?: "fixed" | "hourly" | "unknown";
  currency: string;
  skills: string[];
  postedAt: Date;
}

export interface ScrapeResult {
  platformSlug: string;
  jobs: ScrapedJob[];
  error?: string;
}

export type Scraper = () => Promise<ScrapeResult>;

// HTTP helpers
export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent":
        "freelance-agent/1.0 (+https://github.com/; contact: user@example.com)",
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    // Don't cache scraper responses
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return (await res.json()) as T;
}

export async function fetchText(
  url: string,
  init?: RequestInit
): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent":
        "freelance-agent/1.0 (+https://github.com/; contact: user@example.com)",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return await res.text();
}

// Strip HTML tags from RSS/Atom content
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Parse budget strings like "$500-$1000" or "$50/hr" into cents
export function parseBudget(s: string): {
  min?: number;
  max?: number;
  type: "fixed" | "hourly" | "unknown";
} {
  if (!s) return { type: "unknown" };
  const lower = s.toLowerCase();
  const isHourly = /\/\s*(hr|hour|h)\b/.test(lower) || /hourly/.test(lower);

  const numbers = [...s.matchAll(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?k?)/gi)]
    .map((m) => {
      let n = m[1].replace(/,/g, "");
      let mult = 1;
      if (n.toLowerCase().endsWith("k")) {
        mult = 1000;
        n = n.slice(0, -1);
      }
      return Math.round(parseFloat(n) * mult * 100); // to cents
    })
    .filter((n) => n > 0 && n < 100_000_000);

  if (numbers.length === 0) return { type: isHourly ? "hourly" : "unknown" };
  if (numbers.length === 1)
    return {
      min: numbers[0],
      max: numbers[0],
      type: isHourly ? "hourly" : "fixed",
    };
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    type: isHourly ? "hourly" : "fixed",
  };
}
