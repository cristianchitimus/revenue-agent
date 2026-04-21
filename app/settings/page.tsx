import { prisma } from "@/lib/db";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Your profile drives job matching and proposal generation. Be specific —
          better signals = better matches + proposals.
        </p>
      </div>

      <SettingsForm initial={settings} />
    </div>
  );
}
