import type { ScrapedJob, ScrapeResult } from "./types";
import { fetchJson, parseBudget } from "./types";

// Remote OK returns an array where index 0 is metadata and rest are jobs
interface RemoteOkItem {
  id?: string;
  slug?: string;
  epoch?: number;
  date?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  logo?: string;
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  url?: string;
}

export async function scrapeRemoteOk(): Promise<ScrapeResult> {
  try {
    const data = await fetchJson<RemoteOkItem[]>("https://remoteok.com/api");
    // First item is metadata
    const items = data.slice(1);

    const jobs: ScrapedJob[] = items
      .filter((i) => i.id && i.position)
      // Pay-per-job filter: require tag or title to signal contract/freelance/gig
      .filter((i) => {
        const tags = (i.tags || []).map((t) => t.toLowerCase());
        const title = (i.position || "").toLowerCase();
        const desc = (i.description || "").toLowerCase();
        const CONTRACT_SIGNALS = [
          "contract",
          "freelance",
          "freelancer",
          "part-time",
          "part time",
          "gig",
          "hourly",
        ];
        const hasContractTag = tags.some((t) =>
          CONTRACT_SIGNALS.includes(t)
        );
        const hasContractInTitle = CONTRACT_SIGNALS.some((s) =>
          title.includes(s)
        );
        const hasContractInDesc =
          /\b(contract|freelance|freelancer|part-?time|gig)\b/i.test(desc);
        return hasContractTag || hasContractInTitle || hasContractInDesc;
      })
      .map((i) => {
        const min = i.salary_min ? i.salary_min * 100 : null; // to cents
        const max = i.salary_max ? i.salary_max * 100 : null;
        const postedAt =
          i.epoch ? new Date(i.epoch * 1000) : i.date ? new Date(i.date) : new Date();

        return {
          externalId: String(i.id),
          title: i.position!,
          description: i.description || "",
          company: i.company || null,
          location: i.location || null,
          remote: true,
          url: i.url || (i.slug ? `https://remoteok.com/remote-jobs/${i.slug}` : ""),
          budgetMin: min,
          budgetMax: max,
          budgetType: min ? "fixed" : "unknown",
          currency: "USD",
          skills: Array.isArray(i.tags) ? i.tags : [],
          postedAt,
        } as ScrapedJob;
      })
      .filter((j) => j.url);

    return { platformSlug: "remoteok", jobs };
  } catch (err) {
    return {
      platformSlug: "remoteok",
      jobs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
