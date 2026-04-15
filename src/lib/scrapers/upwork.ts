import { db } from "@/lib/db";

interface UpworkJob {
  title: string;
  description: string;
  url: string;
  budget: number | null;
  budgetType: string | null;
  skills: string[];
  postedAt: Date | null;
  externalId: string;
}

function extractBudget(desc: string): { budget: number | null; budgetType: string | null } {
  // Upwork RSS includes budget info in description
  const fixedMatch = desc.match(/Budget<\/b>:\s*\$?([\d,]+)/i);
  const hourlyMatch = desc.match(/Hourly Range<\/b>:\s*\$?([\d.]+)-\$?([\d.]+)/i);

  if (fixedMatch) {
    return { budget: parseFloat(fixedMatch[1].replace(",", "")), budgetType: "fixed" };
  }
  if (hourlyMatch) {
    const avg = (parseFloat(hourlyMatch[1]) + parseFloat(hourlyMatch[2])) / 2;
    return { budget: Math.round(avg * 20), budgetType: "hourly" }; // estimate ~20h project
  }
  return { budget: null, budgetType: null };
}

function extractSkills(desc: string): string[] {
  const skillsMatch = desc.match(/Skills<\/b>:\s*([^<]+)/i);
  if (!skillsMatch) return [];
  return skillsMatch[1]
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseUpworkRSS(xml: string): UpworkJob[] {
  const jobs: UpworkJob[] = [];
  const items = xml.split("<item>").slice(1); // skip before first item

  for (const item of items) {
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       item.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/) ||
                      item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/);
    const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                      item.match(/<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1].trim();
    const url = linkMatch[1].trim();
    const rawDesc = descMatch?.[1] ?? "";
    const description = stripHtml(rawDesc);
    const { budget, budgetType } = extractBudget(rawDesc);
    const skills = extractSkills(rawDesc);

    // Extract external ID from URL
    const idMatch = url.match(/~(\w+)/);
    const externalId = idMatch ? idMatch[1] : url.slice(-20);

    jobs.push({
      title,
      description: description.slice(0, 5000),
      url,
      budget,
      budgetType,
      skills,
      postedAt: pubDateMatch ? new Date(pubDateMatch[1]) : null,
      externalId,
    });
  }

  return jobs;
}

// Upwork RSS feed URLs for different skill categories
const UPWORK_FEEDS = [
  // Web development
  "https://www.upwork.com/ab/feed/jobs/rss?q=nextjs+react&sort=recency&paging=0%3B10",
  "https://www.upwork.com/ab/feed/jobs/rss?q=typescript+frontend&sort=recency&paging=0%3B10",
  // Automation & scraping
  "https://www.upwork.com/ab/feed/jobs/rss?q=web+scraping+python&sort=recency&paging=0%3B10",
  "https://www.upwork.com/ab/feed/jobs/rss?q=automation+api+integration&sort=recency&paging=0%3B10",
  // Quick tasks
  "https://www.upwork.com/ab/feed/jobs/rss?q=landing+page+tailwind&sort=recency&paging=0%3B10",
  "https://www.upwork.com/ab/feed/jobs/rss?q=bug+fix+javascript&sort=recency&paging=0%3B10",
];

export async function scrapeUpworkJobs(platformId: string): Promise<number> {
  let totalNew = 0;

  for (const feedUrl of UPWORK_FEEDS) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RevenueAgent/1.0)",
        },
      });

      if (!response.ok) {
        console.error(`Upwork RSS error ${response.status} for ${feedUrl}`);
        continue;
      }

      const xml = await response.text();
      const jobs = parseUpworkRSS(xml);

      for (const job of jobs) {
        try {
          await db.job.upsert({
            where: {
              platformId_externalId: {
                platformId,
                externalId: job.externalId,
              },
            },
            update: {}, // don't overwrite existing
            create: {
              platformId,
              externalId: job.externalId,
              title: job.title,
              description: job.description,
              budget: job.budget,
              budgetType: job.budgetType,
              skills: job.skills,
              url: job.url,
              postedAt: job.postedAt,
              status: "new",
            },
          });
          totalNew++;
        } catch {
          // duplicate, skip
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${feedUrl}:`, err);
    }
  }

  return totalNew;
}
