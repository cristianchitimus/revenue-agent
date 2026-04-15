import { db } from "@/lib/db";
import { Briefcase, Target, Send, CheckCircle } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function FreelancePage() {
  let jobs: any[] = [];
  let stats = { total: 0, scored: 0, proposed: 0, accepted: 0 };

  try {
    jobs = await db.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { platform: true, proposal: true },
    });
    stats = {
      total: await db.job.count(),
      scored: await db.job.count({ where: { status: "scored" } }),
      proposed: await db.job.count({ where: { status: "proposed" } }),
      accepted: await db.job.count({ where: { status: "accepted" } }),
    };
  } catch {
    // DB not ready
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Freelance Agent</h1>
        <p className="text-gray-400 mt-1">Job monitoring, scoring, and automated proposals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Jobs tracked" value={stats.total.toString()} icon={Briefcase} color="purple" />
        <StatCard title="Scored" value={stats.scored.toString()} icon={Target} color="blue" />
        <StatCard title="Proposals sent" value={stats.proposed.toString()} icon={Send} color="amber" />
        <StatCard title="Accepted" value={stats.accepted.toString()} icon={CheckCircle} color="emerald" />
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No jobs tracked yet. Configure job platforms and skill profiles in Settings.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left p-3 font-medium">Job</th>
                <th className="text-left p-3 font-medium">Platform</th>
                <th className="text-right p-3 font-medium">Budget</th>
                <th className="text-left p-3 font-medium">Complexity</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 max-w-xs">
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                      {job.title.length > 60 ? job.title.slice(0, 60) + "..." : job.title}
                    </a>
                  </td>
                  <td className="p-3 text-gray-400">{job.platform.name}</td>
                  <td className="p-3 text-right text-gray-400">
                    {job.budget ? `€${job.budget}` : "-"}
                  </td>
                  <td className="p-3">
                    {job.aiComplexity && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        job.aiComplexity === "auto" ? "bg-emerald-500/10 text-emerald-400" :
                        job.aiComplexity === "semi" ? "bg-amber-500/10 text-amber-400" :
                        "bg-rose-500/10 text-rose-400"
                      }`}>{job.aiComplexity}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      job.status === "proposed" ? "bg-blue-500/10 text-blue-400" :
                      job.status === "accepted" ? "bg-emerald-500/10 text-emerald-400" :
                      job.status === "scored" ? "bg-amber-500/10 text-amber-400" :
                      "bg-gray-500/10 text-gray-400"
                    }`}>{job.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    {job.aiScore != null ? (
                      <span className={`font-medium ${
                        job.aiScore >= 70 ? "text-emerald-400" :
                        job.aiScore >= 40 ? "text-amber-400" : "text-gray-400"
                      }`}>{job.aiScore.toFixed(0)}</span>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
