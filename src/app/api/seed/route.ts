import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Seed engine configs
    for (const engine of [
      { engine: "content", schedule: "0 6 * * *" },
      { engine: "leadgen", schedule: "0 */4 * * *" },
      { engine: "freelance", schedule: "0 */2 * * *" },
    ]) {
      await db.engineConfig.upsert({
        where: { engine: engine.engine },
        update: {},
        create: { engine: engine.engine, enabled: true, schedule: engine.schedule },
      });
    }

    // Seed niches
    const niches = [
      {
        name: "Home Office Equipment",
        slug: "home-office-equipment",
        description: "Best gear for remote workers",
        keywords: [
          "best standing desk 2026",
          "ergonomic office chair review",
          "home office monitor setup",
          "best mechanical keyboard for coding",
          "noise canceling headphones for work",
          "home office lighting guide",
          "best webcam for video calls",
          "cable management solutions",
          "under desk treadmill review",
          "home office air purifier",
        ],
        siteUrl: null,
      },
      {
        name: "AI Tools & Software",
        slug: "ai-tools-software",
        description: "Reviews and guides for AI productivity tools",
        keywords: [
          "best AI writing tools 2026",
          "AI image generator comparison",
          "AI coding assistant review",
          "best AI video editing tools",
          "AI meeting assistant tools",
          "AI email writing tools",
          "best AI chatbots for business",
          "AI presentation maker review",
          "AI voice cloning tools",
          "AI data analysis tools",
        ],
        siteUrl: null,
      },
      {
        name: "Personal Finance Romania",
        slug: "personal-finance-romania",
        description: "Financial advice for Romanian audience",
        keywords: [
          "cum sa investesti in Romania 2026",
          "cel mai bun cont de economii Romania",
          "ETF uri pentru incepatori Romania",
          "impozit pe venit freelancer Romania",
          "revolut vs wise Romania",
          "cum sa faci buget personal",
          "asigurare de viata Romania comparatie",
          "investitii imobiliare Romania",
          "card de credit Romania comparatie",
          "pensie privata pilon 3 Romania",
        ],
        siteUrl: null,
      },
    ];

    for (const niche of niches) {
      await db.niche.upsert({
        where: { slug: niche.slug },
        update: { keywords: niche.keywords },
        create: niche,
      });
    }

    // Seed lead sources
    const leadSources = [
      { name: "ONRC Romania", type: "government", baseUrl: "https://www.onrc.ro" },
      { name: "Lista Firme", type: "directory", baseUrl: "https://www.listafirme.ro" },
      { name: "LinkedIn Public", type: "social", baseUrl: "https://www.linkedin.com" },
      { name: "eJobs Romania", type: "jobboard", baseUrl: "https://www.ejobs.ro" },
    ];

    for (const source of leadSources) {
      await db.leadSource.upsert({
        where: { name: source.name },
        update: {},
        create: source,
      });
    }

    // Seed job platforms
    const platforms = [
      { name: "Upwork", type: "rss", feedUrl: "https://www.upwork.com/ab/feed/jobs/rss" },
      { name: "Freelancer", type: "api", feedUrl: null },
      { name: "PeoplePerHour", type: "scrape", feedUrl: null },
      { name: "Toptal", type: "scrape", feedUrl: null },
    ];

    for (const platform of platforms) {
      await db.jobPlatform.upsert({
        where: { name: platform.name },
        update: {},
        create: platform,
      });
    }

    // Seed skill profile
    await db.skillProfile.create({
      data: {
        name: "Full-Stack Next.js Developer",
        skills: [
          "nextjs", "react", "typescript", "tailwindcss", "prisma",
          "postgresql", "supabase", "vercel", "stripe", "node",
          "python", "web-scraping", "api-integration", "automation",
        ],
        minBudget: 25,
        maxComplexity: "medium",
        bio: "Experienced full-stack developer specializing in Next.js, React, and TypeScript. I build fast, scalable web applications with modern tech stacks including Supabase, Prisma, and Vercel. Strong background in automation, API integrations, and data processing. I deliver clean, production-ready code with quick turnaround times.",
        portfolio: [],
      },
    }).catch(() => {
      // Already exists, ignore
    });

    return NextResponse.json({ success: true, message: "Seed data created" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
