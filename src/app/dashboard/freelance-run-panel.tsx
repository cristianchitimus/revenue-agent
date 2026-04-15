"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Clock } from "lucide-react";

export function FreelanceRunPanel({
  enabled,
  lastRun,
}: {
  enabled: boolean;
  lastRun: string | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function runNow() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/engines/freelance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) {
        setResult(`Error: ${data.error}`);
      } else {
        const parts = [];
        if (data.jobsScraped) parts.push(`${data.jobsScraped} jobs scraped`);
        if (data.jobsScored) parts.push(`${data.jobsScored} scored`);
        if (data.proposalsGenerated) parts.push(`${data.proposalsGenerated} proposals`);
        setResult(parts.length > 0 ? parts.join(", ") : "Run complete");
      }
      router.refresh();
    } catch (err) {
      setResult(`Failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${running ? "bg-amber-400 animate-pulse" : enabled ? "bg-emerald-400" : "bg-gray-600"}`} />
            <h3 className="font-semibold text-lg">Freelance Agent</h3>
          </div>
          <p className="text-sm text-gray-400">
            Scrapes Upwork jobs → AI scores them → generates proposals for top matches
          </p>
          {lastRun && (
            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last run: {lastRun}
            </p>
          )}
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors"
        >
          {running ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run now
            </>
          )}
        </button>
      </div>
      {result && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          result.startsWith("Error") || result.startsWith("Failed")
            ? "bg-rose-500/10 text-rose-400"
            : "bg-emerald-500/10 text-emerald-400"
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}
