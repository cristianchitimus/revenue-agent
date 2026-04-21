"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Platform {
  id: string;
  slug: string;
  name: string;
}

export default function JobFilters({
  platforms,
  current,
}: {
  platforms: Platform[];
  current: {
    minScore?: string;
    category?: string;
    status?: string;
    platform?: string;
    q?: string;
  };
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
      router.push(`/jobs?${params.toString()}`);
    },
    [sp, router]
  );

  return (
    <div className="bg-surface border border-border rounded-md p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Search</label>
        <input
          type="text"
          defaultValue={current.q || ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update("q", (e.target as HTMLInputElement).value);
            }
          }}
          placeholder="Keyword (press Enter)"
          className="w-48"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Min score</label>
        <select
          value={current.minScore || "0"}
          onChange={(e) => update("minScore", e.target.value)}
        >
          <option value="0">Any</option>
          <option value="30">30+</option>
          <option value="50">50+</option>
          <option value="70">70+ (hot)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Category</label>
        <select
          value={current.category || "all"}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="all">All</option>
          <option value="fullstack">Full-stack</option>
          <option value="design">Design</option>
          <option value="both">Both (best)</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Status</label>
        <select
          value={current.status || "all"}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="all">All active</option>
          <option value="new">New</option>
          <option value="saved">Saved</option>
          <option value="applied">Applied</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Platform</label>
        <select
          value={current.platform || "all"}
          onChange={(e) => update("platform", e.target.value)}
        >
          <option value="all">All</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {(current.q || current.minScore || current.category || current.platform || current.status) && (
        <button
          onClick={() => router.push("/jobs")}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
