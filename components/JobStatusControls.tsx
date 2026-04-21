"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ACTIONS = [
  { key: "saved", label: "Save", style: "text-amber-300" },
  { key: "applied", label: "Mark applied", style: "text-green-300" },
  { key: "rejected", label: "Reject", style: "text-zinc-500" },
  { key: "hidden", label: "Hide", style: "text-zinc-500" },
];

export default function JobStatusControls({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const [current, setCurrent] = useState(status);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function setStatus(next: string) {
    setCurrent(next);
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, status: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex gap-2 mt-4 flex-wrap">
      <span className="text-xs text-zinc-500 mr-2 self-center">
        Current: <span className="text-zinc-300">{current}</span>
      </span>
      {ACTIONS.filter((a) => a.key !== current).map((a) => (
        <button
          key={a.key}
          onClick={() => setStatus(a.key)}
          className={`text-xs px-3 py-1 rounded border border-border hover:border-zinc-600 ${a.style}`}
        >
          {a.label}
        </button>
      ))}
      {current !== "new" && (
        <button
          onClick={() => setStatus("new")}
          className="text-xs px-3 py-1 rounded border border-border hover:border-zinc-600 text-zinc-400"
        >
          Reset to new
        </button>
      )}
    </div>
  );
}
