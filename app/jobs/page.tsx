import Link from "next/link";
import { prisma } from "@/lib/db";
import JobFilters from "@/components/JobFilters";

export const dynamic = "force-dynamic";

interface SearchParams {
  minScore?: string;
  category?: string;
  status?: string;
  platform?: string;
  q?: string;
}

async function getJobs(params: SearchParams) {
  const minScore = Number(params.minScore || 0);
  const q = params.q?.trim();

  const jobs = await prisma.job.findMany({
    where: {
      matchScore: { gte: minScore },
      ...(params.category && params.category !== "all"
        ? { category: params.category }
        : {}),
      ...(params.status && params.status !== "all"
        ? { status: params.status }
        : { status: { not: "hidden" } }),
      ...(params.platform && params.platform !== "all"
        ? { platform: { slug: params.platform } }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { platform: true, proposals: { select: { id: true } } },
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: 200,
  });

  const platforms = await prisma.platform.findMany({
    orderBy: { slug: "asc" },
  });

  return { jobs, platforms };
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { jobs, platforms } = await getJobs(searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jobs</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {jobs.length} {jobs.length === 1 ? "job" : "jobs"} matching your filters
        </p>
      </div>

      <JobFilters platforms={platforms} current={searchParams} />

      {jobs.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center">
          <p className="text-zinc-400">No jobs match these filters.</p>
          <p className="text-sm text-zinc-500 mt-2">
            Try relaxing the minimum score or running a scan.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="block bg-surface border border-border rounded-md p-4 hover:border-accent transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{j.title}</span>
                    {j.proposals.length > 0 && (
                      <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                        proposal drafted
                      </span>
                    )}
                    {j.status !== "new" && (
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                        {j.status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 flex gap-2 flex-wrap">
                    <span>{j.platform.name}</span>
                    {j.company && <span>· {j.company}</span>}
                    {j.budgetMin && (
                      <span>
                        · ${(j.budgetMin / 100).toFixed(0)}
                        {j.budgetMax && j.budgetMax !== j.budgetMin
                          ? `-$${(j.budgetMax / 100).toFixed(0)}`
                          : ""}
                        {j.budgetType === "hourly" ? "/hr" : ""}
                      </span>
                    )}
                    <span>
                      · {new Date(j.postedAt).toLocaleDateString()}
                    </span>
                    {j.category && j.category !== "other" && (
                      <span className="text-accent">· {j.category}</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                    {j.description.slice(0, 200)}
                    {j.description.length > 200 ? "…" : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-mono px-2 py-1 rounded ${
                    j.matchScore >= 75
                      ? "bg-green-900/40 text-green-300"
                      : j.matchScore >= 60
                      ? "bg-amber-900/40 text-amber-300"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {j.matchScore}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
