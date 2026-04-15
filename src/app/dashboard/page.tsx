import { db } from "@/lib/db";
import { Briefcase, Target, Send, CheckCircle, Zap } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { FreelanceRunPanel } from "./freelance-run-panel";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [total, scored, proposed, accepted, engines, recentRuns] = await Promise.all([
      db.job.count(),
      db.job.count({ where: { status: "scored" } }),
      db.job.count({ where: { status: "proposed" } }),
      db.job.count({ where: { status: "accepted" } }),
      db.engineConfig.findMany(),
      db.runLog.findMany({
        where: { engine: "freelance" },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
    ]);

    return { total, scored, proposed, accepted, engines, recentRuns };
  } catch {
    return { total: 0, scored: 0, proposed: 0, accepted: 0, engines: [], recentRuns: [] };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();
  const freelanceEngine = stats.engines.find((e) => e.engine === "freelance");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Freelance Agent</h1>
        <p className="text-gray-400 mt-1">Automated job discovery, scoring, and proposal generation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Jobs found" value={stats.total.toString()} icon={Briefcase} color="purple" />
        <StatCard title="AI scored" value={stats.scored.toString()} icon={Target} color="blue" />
        <StatCard title="Proposals ready" value={stats.proposed.toString()} icon={Send} color="amber" />
        <StatCard title="Accepted" value={stats.accepted.toString()} icon={CheckCircle} color="emerald" />
      </div>

      {/* Run engine */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          Engine control
        </h2>
        <FreelanceRunPanel
          enabled={freelanceEngine?.enabled ?? true}
          lastRun={freelanceEngine?.lastRunAt ? new Date(freelanceEngine.lastRunAt).toLocaleString("ro-RO") : null}
        />
      </div>

      {/* Recent runs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent runs</h2>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          {stats.recentRuns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No runs yet. Click &quot;Run now&quot; above to start finding jobs.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Result</th>
                  <th className="text-right p-3 font-medium">Duration</th>
                  <th className="text-right p-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        run.status === "success" ? "bg-emerald-500/10 text-emerald-400" :
                        run.status === "error" ? "bg-rose-500/10 text-rose-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>{run.status}</span>
                    </td>
                    <td className="p-3 text-gray-400 max-w-md truncate">{run.message ?? "-"}</td>
                    <td className="p-3 text-right text-gray-400">
                      {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : "-"}
                    </td>
                    <td className="p-3 text-right text-gray-500">
                      {new Date(run.startedAt).toLocaleTimeString("ro-RO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
