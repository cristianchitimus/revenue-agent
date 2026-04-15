"use client";

import { Zap, ZapOff, Loader2 } from "lucide-react";

interface EngineStatusProps {
  name: string;
  description: string;
  enabled: boolean;
  lastRun?: string | null;
  status?: "idle" | "running" | "error";
  stats?: { label: string; value: string }[];
  onToggle?: () => void;
}

export function EngineStatus({
  name,
  description,
  enabled,
  lastRun,
  status = "idle",
  stats = [],
  onToggle,
}: EngineStatusProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              !enabled
                ? "bg-gray-600"
                : status === "running"
                ? "bg-amber-400 animate-pulse"
                : status === "error"
                ? "bg-rose-400"
                : "bg-emerald-400"
            }`}
          />
          <h3 className="font-medium">{name}</h3>
        </div>
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg transition-colors ${
            enabled
              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-gray-800 text-gray-500 hover:bg-gray-700"
          }`}
        >
          {status === "running" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : enabled ? (
            <Zap className="w-4 h-4" />
          ) : (
            <ZapOff className="w-4 h-4" />
          )}
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-3">{description}</p>
      {lastRun && (
        <p className="text-xs text-gray-600 mb-3">Last run: {lastRun}</p>
      )}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-800">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
