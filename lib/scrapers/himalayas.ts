import type { ScrapedJob, ScrapeResult } from "./types";
import { fetchJson, stripHtml } from "./types";

interface HimalayasJob {
  guid: string;
  title: string;
  companyName?: string;
  companyLogo?: string;
  locationRestrictions?: string[];
  pubDate: string;
  applicationLink?: string;
  description?: string;
  excerpt?: string;
  categories?: string[];
  seniority?: string[];
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
}

interface HimalayasResponse {
  jobs: HimalayasJob[];
}

export async function scrapeHimalayas(): Promise<ScrapeResult> {
  try {
    // Himalayas public API (sitemap-based, but they expose a JSON feed)
    // We use their jobs feed endpoint
    const data = await fetchJson<HimalayasResponse>(
      "https://himalayas.app/jobs/api"
    );

    const jobs: ScrapedJob[] = (data.jobs || [])
      .filter((j) => j.guid && j.title)
      .map((j) => ({
        externalId: j.guid,
        title: j.title,
        description: stripHtml(j.description || j.excerpt || ""),
        company: j.companyName || null,
        location: (j.locationRestrictions || []).join(", ") || "Remote",
        remote: true,
        url: j.applicationLink || `https://himalayas.app/jobs/${j.guid}`,
        budgetMin: j.minSalary ? j.minSalary * 100 : null,
        budgetMax: j.maxSalary ? j.maxSalary * 100 : null,
        budgetType: j.minSalary ? "fixed" : "unknown",
        currency: j.currency || "USD",
        skills: [...(j.categories || []), ...(j.seniority || [])],
        postedAt: j.pubDate ? new Date(j.pubDate) : new Date(),
      }));

    return { platformSlug: "himalayas", jobs };
  } catch (err) {
    return {
      platformSlug: "himalayas",
      jobs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
