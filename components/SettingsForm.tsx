"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Settings {
  displayName: string;
  headline: string;
  yearsExperience: number;
  hourlyRateUsd: number;
  primarySkills: string[];
  secondarySkills: string[];
  minBudget: number;
  minMatchScore: number;
  excludeKeywords: string[];
  includeKeywords: string[];
  proposalTone: string;
  portfolioUrl: string | null;
  bio: string;
}

function arrayField(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: initial.displayName,
    headline: initial.headline,
    yearsExperience: initial.yearsExperience,
    hourlyRateUsd: initial.hourlyRateUsd,
    primarySkills: initial.primarySkills.join(", "),
    secondarySkills: initial.secondarySkills.join(", "),
    minBudgetDollars: Math.round(initial.minBudget / 100),
    minMatchScore: initial.minMatchScore,
    excludeKeywords: initial.excludeKeywords.join(", "),
    includeKeywords: initial.includeKeywords.join(", "),
    proposalTone: initial.proposalTone,
    portfolioUrl: initial.portfolioUrl || "",
    bio: initial.bio,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          headline: form.headline,
          yearsExperience: Number(form.yearsExperience),
          hourlyRateUsd: Number(form.hourlyRateUsd),
          primarySkills: arrayField(form.primarySkills),
          secondarySkills: arrayField(form.secondarySkills),
          minBudget: Number(form.minBudgetDollars) * 100,
          minMatchScore: Number(form.minMatchScore),
          excludeKeywords: arrayField(form.excludeKeywords),
          includeKeywords: arrayField(form.includeKeywords),
          proposalTone: form.proposalTone,
          portfolioUrl: form.portfolioUrl || null,
          bio: form.bio,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("✓ Saved");
        router.refresh();
      } else {
        setMsg(`Error: ${data.error}`);
      }
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="bg-surface border border-border rounded-md p-5 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <Field label="Display name">
          <input
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
          />
        </Field>
        <Field label="Headline (one-liner)">
          <input
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Years experience">
            <input
              type="number"
              min="0"
              value={form.yearsExperience}
              onChange={(e) => set("yearsExperience", Number(e.target.value))}
            />
          </Field>
          <Field label="Hourly rate (USD)">
            <input
              type="number"
              min="0"
              value={form.hourlyRateUsd}
              onChange={(e) => set("hourlyRateUsd", Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Portfolio URL (optional)">
          <input
            type="url"
            value={form.portfolioUrl}
            onChange={(e) => set("portfolioUrl", e.target.value)}
            placeholder="https://..."
          />
        </Field>
        <Field
          label="Bio (used in proposals - be specific about wins/stack)"
          hint="2-4 sentences. Concrete > generic."
        >
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            className="w-full"
          />
        </Field>
      </section>

      <section className="bg-surface border border-border rounded-md p-5 space-y-4">
        <h2 className="font-semibold">Skills</h2>
        <Field
          label="Primary skills (comma-separated, 5-10)"
          hint="Heavy weight in matching (8 points each)"
        >
          <textarea
            rows={2}
            value={form.primarySkills}
            onChange={(e) => set("primarySkills", e.target.value)}
            className="w-full"
          />
        </Field>
        <Field
          label="Secondary skills"
          hint="Lighter weight (3 points each)"
        >
          <textarea
            rows={2}
            value={form.secondarySkills}
            onChange={(e) => set("secondarySkills", e.target.value)}
            className="w-full"
          />
        </Field>
      </section>

      <section className="bg-surface border border-border rounded-md p-5 space-y-4">
        <h2 className="font-semibold">Matching filters</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min budget ($)" hint="Jobs below this get reduced score">
            <input
              type="number"
              min="0"
              value={form.minBudgetDollars}
              onChange={(e) => set("minBudgetDollars", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Min match score"
            hint="For notifications (future)"
          >
            <input
              type="number"
              min="0"
              max="100"
              value={form.minMatchScore}
              onChange={(e) => set("minMatchScore", Number(e.target.value))}
            />
          </Field>
        </div>
        <Field
          label="Exclude keywords"
          hint="Instant-zero score if any of these appear"
        >
          <input
            value={form.excludeKeywords}
            onChange={(e) => set("excludeKeywords", e.target.value)}
          />
        </Field>
        <Field
          label="Include keywords (boost)"
          hint="Extra points when these appear"
        >
          <input
            value={form.includeKeywords}
            onChange={(e) => set("includeKeywords", e.target.value)}
          />
        </Field>
      </section>

      <section className="bg-surface border border-border rounded-md p-5 space-y-4">
        <h2 className="font-semibold">Proposal style</h2>
        <Field label="Tone">
          <select
            value={form.proposalTone}
            onChange={(e) => set("proposalTone", e.target.value)}
          >
            <option value="friendly-professional">Friendly-professional</option>
            <option value="direct">Direct / no fluff</option>
            <option value="technical">Technical</option>
            <option value="casual">Casual / founder-to-founder</option>
          </select>
        </Field>
      </section>

      <div className="flex items-center justify-end gap-4">
        {msg && <span className="text-sm text-zinc-400">{msg}</span>}
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-accent text-black font-medium rounded-md hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-zinc-300">{label}</span>
      {hint && <span className="block text-xs text-zinc-500 mt-0.5">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
