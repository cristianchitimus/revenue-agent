import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLATFORMS = [
  { slug: "remoteok", name: "Remote OK" },
  { slug: "wwr", name: "We Work Remotely" },
  { slug: "remotive", name: "Remotive" },
  { slug: "himalayas", name: "Himalayas" },
  { slug: "hn", name: "Hacker News Who's Hiring" },
  { slug: "reddit", name: "Reddit r/forhire" },
  { slug: "upwork-rss", name: "Upwork (public RSS)" },
];

async function main() {
  for (const p of PLATFORMS) {
    await prisma.platform.upsert({
      where: { slug: p.slug },
      update: { name: p.name },
      create: { slug: p.slug, name: p.name, enabled: true },
    });
  }

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log("Seeded platforms:", PLATFORMS.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
