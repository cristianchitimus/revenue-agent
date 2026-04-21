import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAnthropic, PROPOSAL_MODEL } from "@/lib/anthropic";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Platform-specific proposal norms
const PLATFORM_NORMS: Record<
  string,
  { wordRange: string; tone: string; structure: string }
> = {
  "upwork-rss": {
    wordRange: "300-500 words",
    tone: "professional, specific, never generic",
    structure:
      "1) Hook referencing their specific problem in first 2 lines (Upwork truncates), 2) why you're a fit (1-2 concrete past wins), 3) proposed approach with 2-3 steps, 4) 2 clarifying questions, 5) timeline + next step",
  },
  remoteok: {
    wordRange: "200-400 words, email format",
    tone: "direct, founder-to-founder",
    structure:
      "Subject line, context sentence, value prop in 2 sentences, relevant work sample, CTA to hop on a call",
  },
  wwr: {
    wordRange: "200-400 words, cover letter format",
    tone: "polished, traditional",
    structure:
      "Intro, why this role, 2 relevant achievements, availability, CTA",
  },
  remotive: {
    wordRange: "200-400 words, cover letter format",
    tone: "polished, traditional",
    structure:
      "Intro, why this role, 2 relevant achievements, availability, CTA",
  },
  himalayas: {
    wordRange: "200-400 words, cover letter format",
    tone: "polished, traditional",
    structure:
      "Intro, why this role, 2 relevant achievements, availability, CTA",
  },
  hn: {
    wordRange: "150-250 words, casual email",
    tone: "technical, concise, no fluff",
    structure:
      "Direct opening ('saw your HN post'), relevant tech stack match, 1 specific example, ask for a 15-min call",
  },
  reddit: {
    wordRange: "120-200 words, DM format",
    tone: "friendly, no corporate speak",
    structure:
      "Casual opener, match to their need, 1 portfolio link, price range, DM me to discuss",
  },
};

function buildPrompt(
  job: {
    title: string;
    description: string;
    company: string | null;
    skills: string[];
    budgetMin: number | null;
    budgetMax: number | null;
    budgetType: string | null;
    platformSlug: string;
  },
  settings: {
    displayName: string;
    headline: string;
    yearsExperience: number;
    hourlyRateUsd: number;
    primarySkills: string[];
    secondarySkills: string[];
    portfolioUrl: string | null;
    bio: string;
    proposalTone: string;
  }
) {
  const norm =
    PLATFORM_NORMS[job.platformSlug] || PLATFORM_NORMS["upwork-rss"];
  const budget =
    job.budgetMin && job.budgetMax
      ? `$${(job.budgetMin / 100).toFixed(0)}-$${(job.budgetMax / 100).toFixed(0)} ${job.budgetType || ""}`
      : "not specified";

  return `You are helping ${settings.displayName}, a ${settings.headline} with ${settings.yearsExperience} years experience, write a proposal for a freelance job.

## ${settings.displayName}'s profile
- Hourly rate: $${settings.hourlyRateUsd}/hr
- Primary skills: ${settings.primarySkills.join(", ")}
- Secondary skills: ${settings.secondarySkills.join(", ")}
- Portfolio: ${settings.portfolioUrl || "(none yet)"}
- Bio: ${settings.bio}

## The job
- Platform: ${job.platformSlug}
- Title: ${job.title}
- Company / Client: ${job.company || "unknown"}
- Skills tagged: ${job.skills.join(", ") || "none"}
- Budget: ${budget}
- Description:
${job.description.slice(0, 4000)}

## Platform norms for this proposal
- Length: ${norm.wordRange}
- Tone: ${norm.tone}
- Structure: ${norm.structure}

## Requirements
- Reference AT LEAST 2 specific details from the job description (a feature, a tech choice, a constraint they mentioned) - never write anything that could apply to any other job.
- Do NOT use phrases like "I am writing to apply for", "I am excited about this opportunity", "I believe I am a good fit". Ban generic cover-letter language.
- Do NOT hallucinate past projects - use only what's in the bio. If the bio doesn't have a specific win to cite, make the proposal about the APPROACH and the STACK MATCH, not past work.
- Include exactly 2 clarifying questions that prove you actually read the brief.
- End with a clear next step (call, reply, or specific question).
- Match the client's apparent level of formality from their post (casual post → casual proposal).

Output ONLY the proposal text. No preamble, no headers explaining sections, no markdown formatting. Write it as if you're typing it into the submission box directly.`;
}

export async function POST(req: NextRequest) {
  try {
    const { jobId } = (await req.json()) as { jobId: string };
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { platform: true },
    });
    if (!job) {
      return NextResponse.json({ error: "job not found" }, { status: 404 });
    }

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    const prompt = buildPrompt(
      {
        title: job.title,
        description: job.description,
        company: job.company,
        skills: job.skills,
        budgetMin: job.budgetMin,
        budgetMax: job.budgetMax,
        budgetType: job.budgetType,
        platformSlug: job.platform.slug,
      },
      settings
    );

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: PROPOSAL_MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const proposal = await prisma.proposal.create({
      data: {
        jobId: job.id,
        content,
        wordCount,
        status: "draft",
      },
    });

    return NextResponse.json({ success: true, proposal });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
