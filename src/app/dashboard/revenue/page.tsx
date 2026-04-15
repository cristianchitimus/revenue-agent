import { db } from "@/lib/db";
import { DollarSign, TrendingUp, Calendar, PieChart } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  let revenueEntries: any[] = [];
  let stats = { total: 0, thisMonth: 0, today: 0, byEngine: {} as Record<string, number> };

  try {
    revenueEntries = await db.revenue.findMany({ orderBy: { date: "desc" }, take: 50 });

    const totalAgg = await db.revenue.aggregate({ _sum: { amount: true } });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthAgg = await db.revenue.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayAgg = await db.revenue.aggregate({ _sum: { amount: true }, where: { date: { gte: todayStart } } });

    const byEngineRaw = await db.revenue.groupBy({ by: ["engine"], _sum: { amount: true } });
    const byEngine: Record<string, number> = {};
    byEngineRaw.forEach((e) => { byEngine[e.engine] = e._sum.amount ?? 0; });

    stats = {
      total: totalAgg._sum.amount ?? 0,
      thisMonth: monthAgg._sum.amount ?? 0,
      today: todayAgg._sum.amount ?? 0,
      byEngine,
    };
  } catch {
    // DB not ready
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-gray-400 mt-1">Income tracking across all engines</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Today" value={`€${stats.today.toFixed(2)}`} icon={DollarSign} color="emerald" />
        <StatCard title="This month" value={`€${stats.thisMonth.toFixed(2)}`} icon={Calendar} color="blue" />
        <StatCard title="All time" value={`€${stats.total.toFixed(2)}`} icon={TrendingUp} color="purple" />
        <StatCard title="Engines" value={Object.keys(stats.byEngine).length.toString()} icon={PieChart} color="amber" />
      </div>

      {/* Revenue by engine */}
      {Object.keys(stats.byEngine).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(stats.byEngine).map(([engine, amount]) => (
            <div key={engine} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 capitalize">{engine}</p>
              <p className="text-xl font-bold text-emerald-400">€{amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue log */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        {revenueEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No revenue recorded yet. Revenue entries are added automatically as engines generate income.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Engine</th>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {revenueEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 text-gray-400">{new Date(entry.date).toLocaleDateString("ro-RO")}</td>
                  <td className="p-3 capitalize">{entry.engine}</td>
                  <td className="p-3 text-gray-400">{entry.source}</td>
                  <td className="p-3 text-gray-400 truncate max-w-xs">{entry.description ?? "-"}</td>
                  <td className="p-3 text-right font-medium text-emerald-400">€{entry.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
