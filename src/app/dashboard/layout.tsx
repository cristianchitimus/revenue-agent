"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  Settings,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/content", label: "Content Engine", icon: FileText },
  { href: "/dashboard/leads", label: "Lead Gen", icon: Users },
  { href: "/dashboard/freelance", label: "Freelance Agent", icon: Briefcase },
  { href: "/dashboard/revenue", label: "Revenue", icon: DollarSign },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" />
            <span className="text-lg font-semibold">Revenue Agent</span>
          </Link>
          <p className="text-xs text-gray-500 mt-1">Autonomous income system</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Daily target</p>
            <p className="text-lg font-semibold text-emerald-400">€50.00</p>
            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: "0%" }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
