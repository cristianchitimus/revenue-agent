"use client";

import { EngineStatus } from "@/components/engine-status";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Engine {
  id: string;
  engine: string;
  enabled: boolean;
  lastRunAt: Date | null;
  schedule: string;
}

const engineMeta: Record<
  string,
  { name: string; description: string; stats: { label: string; value: string }[] }
> = {
  content: {
    name: "Content Engine",
    description: "Generates SEO articles with affiliate links and publishes to niche sites",
    stats: [
      { label: "Schedule", value: "Daily 06:00" },
      { label: "Target", value: "5 articles/day" },
    ],
  },
  leadgen: {
    name: "Lead Gen Engine",
    description: "Scrapes and enriches business leads, delivers to B2B subscribers",
    stats: [
      { label: "Schedule", value: "Every 4h" },
      { label: "Sources", value: "4 active" },
    ],
  },
  freelance: {
    name: "Freelance Agent",
    description: "Monitors job platforms, scores opportunities, generates proposals",
    stats: [
      { label: "Schedule", value: "Every 2h" },
      { label: "Platforms", value: "4 active" },
    ],
  },
};

export function EngineStatusPanel({ engines }: { engines: Engine[] }) {
  const router = useRouter();
  const [runningEngine, setRunningEngine] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, string>>({});

  const allEngines = ["content", "leadgen", "freelance"].map((key) => {
    const found = engines.find((e) => e.engine === key);
    return {
      key,
      enabled: found?.enabled ?? false,
      lastRunAt: found?.lastRunAt ?? null,
      ...(engineMeta[key] ?? {
        name: key,
        description: "",
        stats: [],
      }),
    };
  });

  async function toggleEngine(engine: string, currentState: boolean) {
    await fetch("/api/engines/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engine, enabled: !currentState }),
    });
    router.refresh();
  }

  async function runEngine(engine: string) {
    setRunningEngine(engine);
    setLastResult((prev) => ({ ...prev, [engine]: "Running..." }));
    try {
      const res = await fetch("/api/engines/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine }),
      });
      const data = await res.json();
      setLastResult((prev) => ({
        ...prev,
        [engine]: data.error ? `Error: ${data.error}` : JSON.stringify(data),
      }));
      router.refresh();
    } catch (err) {
      setLastResult((prev) => ({
        ...prev,
        [engine]: `Failed: ${err instanceof Error ? err.message : "unknown"}`,
      }));
    } finally {
      setRunningEngine(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allEngines.map((e) => (
          <div key={e.key}>
            <EngineStatus
              name={e.name}
              description={e.description}
              enabled={e.enabled}
              lastRun={e.lastRunAt ? new Date(e.lastRunAt).toLocaleString("ro-RO") : null}
              status={runningEngine === e.key ? "running" : "idle"}
              stats={e.stats}
              onToggle={() => toggleEngine(e.key, e.enabled)}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => runEngine(e.key)}
                disabled={runningEngine !== null}
                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded-lg transition-colors"
              >
                {runningEngine === e.key ? "Running..." : "Run now"}
              </button>
            </div>
            {lastResult[e.key] && (
              <p className="mt-1 text-xs text-gray-500 truncate" title={lastResult[e.key]}>
                {lastResult[e.key]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
