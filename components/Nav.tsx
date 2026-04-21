import Link from "next/link";

export default function Nav() {
  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-accent">
          Freelance Agent
        </Link>
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-100">Dashboard</Link>
          <Link href="/jobs" className="hover:text-zinc-100">Jobs</Link>
          <Link href="/proposals" className="hover:text-zinc-100">Proposals</Link>
          <Link href="/settings" className="hover:text-zinc-100">Settings</Link>
        </div>
      </div>
    </nav>
  );
}
