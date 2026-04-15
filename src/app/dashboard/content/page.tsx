import { db } from "@/lib/db";
import { FileText, Plus, TrendingUp, MousePointerClick } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  let articles: any[] = [];
  let niches: any[] = [];
  let stats = { total: 0, published: 0, totalClicks: 0, totalRevenue: 0 };

  try {
    [articles, niches] = await Promise.all([
      db.article.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { niche: true },
      }),
      db.niche.findMany({ include: { _count: { select: { articles: true } } } }) as Promise<any[]>,
    ]);

    const agg = await db.article.aggregate({
      _sum: { clicks: true, estimatedRevenue: true },
      _count: true,
    });
    const pubCount = await db.article.count({ where: { status: "published" } });
    stats = {
      total: agg._count,
      published: pubCount,
      totalClicks: agg._sum.clicks ?? 0,
      totalRevenue: agg._sum.estimatedRevenue ?? 0,
    };
  } catch {
    // DB not ready yet
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Content Engine</h1>
          <p className="text-gray-400 mt-1">SEO articles with affiliate monetization</p>
        </div>
        <Link
          href="/dashboard/content/new-niche"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add niche
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total articles" value={stats.total.toString()} icon={FileText} color="blue" />
        <StatCard title="Published" value={stats.published.toString()} icon={TrendingUp} color="emerald" />
        <StatCard title="Total clicks" value={stats.totalClicks.toString()} icon={MousePointerClick} color="amber" />
        <StatCard title="Est. revenue" value={`€${stats.totalRevenue.toFixed(2)}`} icon={TrendingUp} color="purple" />
      </div>

      {/* Niches */}
      <h2 className="text-lg font-semibold mb-3">Niches</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {niches.length === 0 ? (
          <div className="col-span-3 bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No niches configured yet. Add a niche to start generating content.
          </div>
        ) : (
          niches.map((niche) => (
            <div key={niche.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{niche.name}</h3>
                <span className={`w-2 h-2 rounded-full ${niche.enabled ? "bg-emerald-400" : "bg-gray-600"}`} />
              </div>
              <p className="text-sm text-gray-400 mb-2">{niche.keywords.length} keywords</p>
              <p className="text-xs text-gray-500">{niche._count?.articles ?? 0} articles</p>
            </div>
          ))
        )}
      </div>

      {/* Articles table */}
      <h2 className="text-lg font-semibold mb-3">Recent articles</h2>
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        {articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No articles yet. Configure a niche and run the content engine.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Niche</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Words</th>
                <th className="text-right p-3 font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 max-w-xs truncate">{article.title}</td>
                  <td className="p-3 text-gray-400">{article.niche.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      article.status === "published" ? "bg-emerald-500/10 text-emerald-400" :
                      article.status === "draft" ? "bg-amber-500/10 text-amber-400" :
                      "bg-gray-500/10 text-gray-400"
                    }`}>{article.status}</span>
                  </td>
                  <td className="p-3 text-right text-gray-400">{article.wordCount}</td>
                  <td className="p-3 text-right text-gray-400">{article.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
