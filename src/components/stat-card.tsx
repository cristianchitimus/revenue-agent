import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "emerald" | "blue" | "amber" | "rose" | "purple";
}

const colorMap = {
  emerald: "bg-emerald-500/10 text-emerald-400",
  blue: "bg-blue-500/10 text-blue-400",
  amber: "bg-amber-500/10 text-amber-400",
  rose: "bg-rose-500/10 text-rose-400",
  purple: "bg-purple-500/10 text-purple-400",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "emerald",
}: StatCardProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{title}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {trend && (
        <p
          className={`text-xs mt-2 ${
            trend.value >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
          {trend.label}
        </p>
      )}
    </div>
  );
}
