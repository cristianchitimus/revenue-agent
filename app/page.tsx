import Link from "next/link";
import { prisma } from "@/lib/db";
import ScanButton from "@/components/ScanButton";

export const dynamic = "force-dynamic";

async function getStats() {
  const [totalJobs, newJobs, platforms, recentScans] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: "new" } }),
    prisma.platform.findMany({ orderBy: { slug: "asc" } }),
    prisma.scanRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { platform: true },
    }),
  ]);

  const byCategory = await prisma.job.groupBy({
    by: ["category"],
    _count: true,
  });

  const topJobs = await prisma.job.findMany({
    where: { status: "new" },
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: 5,
    include: { platform: true },
  });

  return { totalJobs, newJobs, platforms, recentScans, byCategory, topJobs };
}

export default async function Dashboard() {
  const { totalJobs, newJobs, platforms, recentScans, byCategory, topJobs } =
    await getStats();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Overview of scanned jobs across {platforms.length} platforms
          </p>
        </div>
        <ScanButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total jobs" value={totalJobs} />
        <Stat label="New (unseen)" value={newJobs} />
        <Stat
          label="Full-stack matches"
          value={byCategory.find((c) => c.category === "fullstack")?._count || 0}
        />
        <Stat
          label="Design + FS matches"
          value={byCategory.find((c) => c.category === "both")?._count || 0}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-3">Top matches (new)</h2>
          {topJobs.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No jobs yet. Click &quot;Scan Now&quot; above to start.
            </p>
          ) : (
            <ul className="space-y-3">
              {topJobs.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-3">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="flex-1 min-w-0 hover:text-accent"
                  >
                    <div className="text-sm font-medium truncate">
                      {j.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {j.platform.name} · {j.company || "—"}
                    </div>
                  </Link>
                  <span className="shrink-0 text-xs px-2 py-1 rounded bg-accent/10 text-accent font-mono">
                    {j.matchScore}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold mb-3">Recent scans</h2>
          {recentScans.length === 0 ? (
            <p className="text-sm text-zinc-500">No scans yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentScans.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span className="text-zinc-400">
                    {s.platform.name}
                    {s.error && <span className="text-red-400 ml-2">⚠</span>}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    +{s.jobsNew} new · {s.jobsFound} total
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-semibold mb-3">Platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {platforms.map((p) => (
            <div
              key={p.id}
              className="border border-border rounded p-3 bg-bg"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {p.enabled ? "Active" : "Disabled"} ·{" "}
                {p.lastScanAt
                  ? new Date(p.lastScanAt).toLocaleString()
                  : "never scanned"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
