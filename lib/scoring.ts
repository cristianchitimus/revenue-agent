/**
 * Job scoring engine.
 * Computes a 0-100 relevance score for each job based on user skills, budget, and keyword filters.
 *
 * Score composition:
 *   - Skill match:        0-50 points
 *   - Budget fit:         0-20 points
 *   - Category fit:       0-15 points (fullstack/design sweet spot)
 *   - Keyword include:    0-10 points
 *   - Fresh posting:      0-5  points (< 24h = 5, < 72h = 3, else 0)
 *   - Exclude keywords:   instant 0 if matched
 */

import type { Settings } from "@prisma/client";

export interface RawJob {
  title: string;
  description: string;
  skills: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  postedAt: Date;
}

const FULLSTACK_TERMS = [
  "full-stack", "fullstack", "full stack", "next.js", "nextjs", "react",
  "typescript", "node.js", "nodejs", "prisma", "supabase", "postgres",
  "tailwind", "vercel", "stripe", "api", "backend", "frontend", "saas",
  "web app", "mvp", "dashboard", "landing page",
];

const DESIGN_TERMS = [
  "ui/ux", "ui design", "ux design", "figma", "web design", "landing design",
  "brand", "branding", "logo", "visual design", "product design", "interaction design",
];

export function categorizeJob(raw: RawJob): "fullstack" | "design" | "both" | "other" {
  const text = `${raw.title} ${raw.description} ${raw.skills.join(" ")}`.toLowerCase();
  const hasFullstack = FULLSTACK_TERMS.some((t) => text.includes(t));
  const hasDesign = DESIGN_TERMS.some((t) => text.includes(t));
  if (hasFullstack && hasDesign) return "both";
  if (hasFullstack) return "fullstack";
  if (hasDesign) return "design";
  return "other";
}

export function extractSkills(raw: RawJob): string[] {
  const text = `${raw.title} ${raw.description} ${raw.skills.join(" ")}`.toLowerCase();
  const ALL = [...new Set([...FULLSTACK_TERMS, ...DESIGN_TERMS])];
  return ALL.filter((t) => text.includes(t));
}

export function scoreJob(raw: RawJob, settings: Settings): number {
  const text = `${raw.title} ${raw.description} ${raw.skills.join(" ")}`.toLowerCase();

  // Hard exclude
  for (const kw of settings.excludeKeywords) {
    if (text.includes(kw.toLowerCase())) return 0;
  }

  let score = 0;

  // Skill match (50 points)
  const primary = settings.primarySkills.filter((s) =>
    text.includes(s.toLowerCase())
  ).length;
  const secondary = settings.secondarySkills.filter((s) =>
    text.includes(s.toLowerCase())
  ).length;
  const skillScore = Math.min(50, primary * 8 + secondary * 3);
  score += skillScore;

  // Budget fit (20 points)
  if (raw.budgetMin != null) {
    if (raw.budgetMin >= settings.minBudget) score += 20;
    else if (raw.budgetMin >= settings.minBudget / 2) score += 10;
  } else {
    // Unknown budget - neutral, give 8
    score += 8;
  }

  // Category fit (15 points)
  const cat = categorizeJob(raw);
  if (cat === "both") score += 15;
  else if (cat === "fullstack" || cat === "design") score += 12;
  else score += 0;

  // Include keywords (10 points)
  if (settings.includeKeywords.length > 0) {
    const hits = settings.includeKeywords.filter((k) =>
      text.includes(k.toLowerCase())
    ).length;
    score += Math.min(10, hits * 5);
  } else {
    score += 5; // neutral
  }

  // Freshness (5 points)
  const ageHours =
    (Date.now() - new Date(raw.postedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 24) score += 5;
  else if (ageHours < 72) score += 3;

  return Math.min(100, Math.max(0, Math.round(score)));
}
