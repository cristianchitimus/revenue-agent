import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProposalGenerator from "@/components/ProposalGenerator";
import JobStatusControls from "@/components/JobStatusControls";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      platform: true,
      proposals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!job) notFound();

  const budget =
    job.budgetMin && job.budgetMax
      ? `$${(job.budgetMin / 100).toFixed(0)}${
          job.budgetMax !== job.budgetMin
            ? `-$${(job.budgetMax / 100).toFixed(0)}`
            : ""
        }${job.budgetType === "hourly" ? "/hr" : ""}`
      : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/jobs"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Back to jobs
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-md p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="flex gap-2 flex-wrap text-sm text-zinc-500 mt-2">
              <span className="text-accent">{job.platform.name}</span>
              {job.company && <span>· {job.company}</span>}
              {job.location && <span>· {job.location}</span>}
              {budget && <span>· {budget}</span>}
              <span>· posted {new Date(job.postedAt).toLocaleString()}</span>
            </div>
            {job.skills.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {job.skills.slice(0, 15).map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`text-sm font-mono px-3 py-1.5 rounded ${
                job.matchScore >= 75
                  ? "bg-green-900/40 text-green-300"
                  : job.matchScore >= 60
                  ? "bg-amber-900/40 text-amber-300"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              score {job.matchScore}
            </span>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline"
            >
              Open on {job.platform.name} ↗
            </a>
          </div>
        </div>

        <JobStatusControls jobId={job.id} status={job.status} />

        <div className="mt-6 prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-zinc-300">
          {job.description}
        </div>
      </div>

      <ProposalGenerator jobId={job.id} existing={job.proposals} />
    </div>
  );
}
