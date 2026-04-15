import { db } from "@/lib/db";
import { Settings, Globe, Briefcase, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let engines: Awaited<ReturnType<typeof db.engineConfig.findMany>> = [];
  let niches: Awaited<ReturnType<typeof db.niche.findMany>> = [];
  let sources: Awaited<ReturnType<typeof db.leadSource.findMany>> = [];
  let platforms: Awaited<ReturnType<typeof db.jobPlatform.findMany>> = [];
  let profiles: Awaited<ReturnType<typeof db.skillProfile.findMany>> = [];

  try {
    [engines, niches, sources, platforms, profiles] = await Promise.all([
      db.engineConfig.findMany(),
      db.niche.findMany(),
      db.leadSource.findMany(),
      db.jobPlatform.findMany(),
      db.skillProfile.findMany(),
    ]);
  } catch {
    // DB not ready
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Configure engines, sources, and profiles</p>
      </div>

      {/* Engine configs */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" /> Engine configuration
        </h2>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {["content", "leadgen", "freelance"].map((engineKey) => {
            const engine = engines.find((e) => e.engine === engineKey);
            return (
              <div key={engineKey} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{engineKey} engine</p>
                  <p className="text-sm text-gray-400">
                    Schedule: {engine?.schedule ?? "Not set"} | Last run: {engine?.lastRunAt ? new Date(engine.lastRunAt).toLocaleString("ro-RO") : "Never"}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  engine?.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"
                }`}>{engine?.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Content niches */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" /> Content niches ({niches.length})
        </h2>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
          {niches.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No niches configured. Use the API to seed niches:
              <code className="block mt-2 bg-gray-800 p-2 rounded text-xs text-gray-300">
                POST /api/seed — seeds demo data
              </code>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {niches.map((n) => (
                <div key={n.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{n.name}</p>
                    <span className={`w-2 h-2 rounded-full ${n.enabled ? "bg-emerald-400" : "bg-gray-600"}`} />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Keywords: {n.keywords.join(", ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lead sources */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" /> Lead sources ({sources.length})
        </h2>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
          {sources.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No lead sources configured.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {sources.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-400">{s.type} — {s.baseUrl}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-emerald-400" : "bg-gray-600"}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Job platforms & profiles */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-gray-400" /> Freelance platforms ({platforms.length}) & profiles ({profiles.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
            <div className="p-3 border-b border-gray-800 text-sm font-medium text-gray-400">Platforms</div>
            {platforms.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No platforms configured.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {platforms.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-sm">
                    <span>{p.name} ({p.type})</span>
                    <span className={`w-2 h-2 rounded-full ${p.enabled ? "bg-emerald-400" : "bg-gray-600"}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
            <div className="p-3 border-b border-gray-800 text-sm font-medium text-gray-400">Skill profiles</div>
            {profiles.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No skill profiles configured.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {profiles.map((p) => (
                  <div key={p.id} className="p-3 text-sm">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-gray-400 text-xs">{p.skills.join(", ")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
