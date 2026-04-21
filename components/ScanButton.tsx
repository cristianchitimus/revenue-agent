"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ScanButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handleScan() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(
          `✓ Found ${data.totalFound ?? 0} jobs, ${data.totalNew ?? 0} new`
        );
        startTransition(() => router.refresh());
      } else {
        setMessage(`Error: ${data.error || "unknown"}`);
      }
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 6000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className="text-xs text-zinc-400">{message}</span>
      )}
      <button
        onClick={handleScan}
        disabled={loading}
        className="px-4 py-2 bg-accent text-black font-medium rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-wait"
      >
        {loading ? "Scanning…" : "Scan Now"}
      </button>
    </div>
  );
}
