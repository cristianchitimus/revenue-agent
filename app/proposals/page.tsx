import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = await prisma.proposal.findMany({
    include: { job: { include: { platform: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Proposals</h1>
        <p className="text-sm text-zinc-500 mt-1">
          All generated proposals, most recent first
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center">
          <p className="text-zinc-400">No proposals yet.</p>
          <p className="text-sm text-zinc-500 mt-2">
            Open a job and click &quot;Generate proposal&quot; to create one.
          </p>
          <Link
            href="/jobs"
            className="inline-block mt-4 text-sm text-accent hover:underline"
          >
            Browse jobs →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <Link
              key={p.id}
              href={`/jobs/${p.job.id}`}
              className="block bg-surface border border-border rounded-md p-4 hover:border-accent transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.job.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {p.job.platform.name} · {p.wordCount} words ·{" "}
                    {new Date(p.createdAt).toLocaleString()}
                  </div>
                  <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                    {p.content.slice(0, 200)}…
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    p.status === "sent"
                      ? "bg-green-900/40 text-green-300"
                      : p.status === "won"
                      ? "bg-accent/20 text-accent"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
