"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Proposal {
  id: string;
  content: string;
  wordCount: number;
  status: string;
  createdAt: Date | string;
}

export default function ProposalGenerator({
  jobId,
  existing,
}: {
  jobId: string;
  existing: Proposal[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to generate");
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="bg-surface border border-border rounded-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Proposals {existing.length > 0 && `(${existing.length})`}
        </h2>
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 bg-accent text-black font-medium rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? "Generating…" : existing.length > 0 ? "Generate another" : "Generate proposal"}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm rounded p-3 mb-4">
          {error}
        </div>
      )}

      {existing.length === 0 && !loading ? (
        <p className="text-sm text-zinc-500">
          Click &quot;Generate proposal&quot; to create a tailored proposal using Claude.
          The proposal will reference specific details from this job and apply the
          right tone for the platform.
        </p>
      ) : (
        <div className="space-y-4">
          {existing.map((p) => (
            <div
              key={p.id}
              className="border border-border rounded-md p-4 bg-bg"
            >
              <div className="flex items-center justify-between mb-3 text-xs text-zinc-500">
                <div className="flex gap-3">
                  <span>{new Date(p.createdAt).toLocaleString()}</span>
                  <span>{p.wordCount} words</span>
                  <span className="text-accent">{p.status}</span>
                </div>
                <button
                  onClick={() => copy(p.id, p.content)}
                  className="text-xs text-zinc-400 hover:text-zinc-100"
                >
                  {copied === p.id ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-sans">
                {p.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
