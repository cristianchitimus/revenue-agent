import { db } from "@/lib/db";
import { DollarSign, FileText, Users, Briefcase, TrendingUp, Activity } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { EngineStatusPanel } from "./engine-status-panel";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [articleCount, leadCount, jobCount, revenueData, engines, recentRuns] =
      await Promise.all([
        db.article.count(),
        db.lead.count(),
        db.job.count(),
        db.revenue.aggregate({ _sum: { amount: true } }),
        db.engineConfig.findMany(),
        db.runLog.findMany({
          orderBy: { startedAt: "desc" },
          take: 10,
        }),
      ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRevenue = await db.revenue.aggregate({
      _sum: { amount: true },
      where: { date: { gte: todayStart } },
    });

    return {
      articleCount,
      leadCount,
      jobCount,
      totalRevenue: revenueData._sum.amount ?? 0,
      todayRevenue: todayRevenue._sum.amount ?? 0,
      engines,
      recentRuns,
    };
  } catch {
    return {
      articleCount: 0,
      leadCount: 0,
      jobCount: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      engines: [],
      recentRuns: [],
    };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();
  const dailyTarget = 50;
  const progressPercent = Math.min(
    100,
    Math.round((stats.todayRevenue / dailyTarget) * 100)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Revenue agent status and performance overview
        </p>
      </div>

      {/* Daily progress */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-gray-400">Today&apos;s revenue</p>
            <p className="text-3xl font-bold text-emerald-400">
              €{stats.todayRevenue.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Daily target</p>
            <p className="text-3xl font-bold text-gray-300">€{dailyTarget}</p>
          </div>
        </div>
        <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {progressPercent}% of daily target reached
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total revenue"
          value={`€${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Articles published"
          value={stats.articleCount.toString()}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Leads generated"
          value={stats.leadCount.toString()}
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Jobs tracked"
          value={stats.jobCount.toString()}
          icon={Briefcase}
          color="purple"
        />
      </div>

      {/* Engines */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-400" />
          Engines
        </h2>
        <EngineStatusPanel engines={stats.engines} />
      </div>

      {/* Recent runs */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          Recent activity
        </h2>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          {stats.recentRuns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No runs yet. Engines will start producing activity once configured.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left p-3 font-medium">Engine</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Message</th>
                  <th className="text-right p-3 font-medium">Duration</th>
                  <th className="text-right p-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="p-3 capitalize">{run.engine}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          run.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : run.status === "error"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 truncate max-w-xs">
                      {run.message ?? "-"}
                    </td>
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
