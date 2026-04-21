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

// Strip HTML tags + decode entities. Handles double-encoded content from RSS/CDATA.
export function stripHtml(html: string): string {
  return html
    // Decode numeric entities first (&#60; &#x3C;)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    // Decode named entities (can be double-encoded; run twice)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Second pass for double-encoded content
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Remove HTML comments (Reddit uses <!-- SC_OFF --> markers)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
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
  const isHourly = /\/\s*(hr|hour|h)\b/.test(lower) || /hourly/.test(lower) || /per\s+hour/.test(lower);

  // Strict currency matching: require $ € £ prefix OR "usd"/"eur"/"gbp" suffix
  // This avoids false positives on random numbers in HTML/dates/phone numbers.
  // Accepts: $500, $1k, $1,500, €500, 500 USD, 1.5k, $50/hr
  const currencyRegex = /(?:[$€£]\s*([0-9]{1,3}(?:[,.][0-9]{3})*(?:\.[0-9]+)?k?)|([0-9]{1,4}(?:[,.][0-9]{3})*(?:\.[0-9]+)?k?)\s*(?:usd|eur|gbp|dollars?|euros?|pounds?)\b)/gi;

  const numbers: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = currencyRegex.exec(s)) !== null) {
    const raw = (match[1] || match[2] || "").replace(/,/g, "");
    let mult = 1;
    let n = raw;
    if (n.toLowerCase().endsWith("k")) {
      mult = 1000;
      n = n.slice(0, -1);
    }
    const val = Math.round(parseFloat(n) * mult * 100); // to cents
    // Filter: must be at least $10 (1000 cents) — anything less is noise
    // Max cap: $1M per item (we're looking at gigs)
    if (val >= 1000 && val < 100_000_000) {
      numbers.push(val);
    }
  }

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
