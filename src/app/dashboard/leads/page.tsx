import { db } from "@/lib/db";
import { Users, Database, Star, Truck } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  let leads: any[] = [];
  let stats = { total: 0, enriched: 0, avgScore: 0, clients: 0 };

  try {
    leads = await db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { source: true },
    });
    const total = await db.lead.count();
    const enriched = await db.lead.count({ where: { status: "enriched" } });
    const scoreAgg = await db.lead.aggregate({ _avg: { aiScore: true }, where: { aiScore: { not: null } } });
    const clients = await db.leadClient.count({ where: { active: true } });
    stats = { total, enriched, avgScore: scoreAgg._avg.aiScore ?? 0, clients };
  } catch {
    // DB not ready
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Lead Gen Engine</h1>
        <p className="text-gray-400 mt-1">B2B lead scraping, enrichment, and delivery</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total leads" value={stats.total.toString()} icon={Database} color="amber" />
        <StatCard title="Enriched" value={stats.enriched.toString()} icon={Users} color="emerald" />
        <StatCard title="Avg. score" value={stats.avgScore.toFixed(0)} icon={Star} color="blue" />
        <StatCard title="B2B clients" value={stats.clients.toString()} icon={Truck} color="purple" />
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No leads yet. Configure lead sources in Settings and run the lead gen engine.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left p-3 font-medium">Company</th>
                <th className="text-left p-3 font-medium">Industry</th>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3">
                    <div>{lead.companyName}</div>
                    {lead.contactEmail && <div className="text-xs text-gray-500">{lead.contactEmail}</div>}
                  </td>
                  <td className="p-3 text-gray-400">{lead.industry ?? "-"}</td>
                  <td className="p-3 text-gray-400">{lead.source.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      lead.status === "enriched" ? "bg-emerald-500/10 text-emerald-400" :
                      lead.status === "delivered" ? "bg-blue-500/10 text-blue-400" :
                      "bg-gray-500/10 text-gray-400"
                    }`}>{lead.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    {lead.aiScore != null ? (
                      <span className={`font-medium ${
                        lead.aiScore >= 70 ? "text-emerald-400" :
                        lead.aiScore >= 40 ? "text-amber-400" : "text-gray-400"
                      }`}>{lead.aiScore.toFixed(0)}</span>
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
