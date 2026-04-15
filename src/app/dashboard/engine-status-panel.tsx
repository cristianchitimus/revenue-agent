"use client";

import { EngineStatus } from "@/components/engine-status";
import { useRouter } from "next/navigation";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {allEngines.map((e) => (
        <EngineStatus
          key={e.key}
          name={e.name}
          description={e.description}
          enabled={e.enabled}
          lastRun={e.lastRunAt ? new Date(e.lastRunAt).toLocaleString("ro-RO") : null}
          stats={e.stats}
          onToggle={() => toggleEngine(e.key, e.enabled)}
        />
      ))}
    </div>
  );
}
