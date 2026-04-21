import type { ScrapedJob, ScrapeResult } from "./types";
import { fetchJson, parseBudget, stripHtml } from "./types";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

interface RemotiveResponse {
  "0-legal-notice"?: string;
  jobs: RemotiveJob[];
}

// Remotive supports category filtering
const CATEGORIES = ["software-dev", "design"];

export async function scrapeRemotive(): Promise<ScrapeResult> {
  const all: ScrapedJob[] = [];
  const errors: string[] = [];

  for (const cat of CATEGORIES) {
    try {
      const data = await fetchJson<RemotiveResponse>(
        `https://remotive.com/api/remote-jobs?category=${cat}&limit=100`
      );

      for (const j of data.jobs) {
        // Pay-per-job only: skip full_time / part_time / internship
        const jobType = (j.job_type || "").toLowerCase();
        if (!["contract", "freelance"].includes(jobType)) continue;

        const budget = parseBudget(j.salary || "");

        all.push({
          externalId: `remotive-${j.id}`,
          title: j.title,
          description: stripHtml(j.description || ""),
          company: j.company_name,
          location: j.candidate_required_location || "Worldwide",
          remote: true,
          url: j.url,
          budgetMin: budget.min ?? null,
          budgetMax: budget.max ?? null,
          budgetType: budget.type,
          currency: "USD",
          skills: j.tags || [],
          postedAt: j.publication_date ? new Date(j.publication_date) : new Date(),
        });
      }
    } catch (err) {
      errors.push(`${cat}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Dedupe
  const seen = new Set<string>();
  const jobs = all.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  return {
    platformSlug: "remotive",
    jobs,
    error: errors.length && jobs.length === 0 ? errors.join("; ") : undefined,
  };
}
