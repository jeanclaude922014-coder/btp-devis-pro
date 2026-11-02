// Réinitialise le mot de passe d'un compte directement en base.
// Usage : DATABASE_URL=... npx tsx scripts/reset-password.ts email@exemple.ci "NouveauMotDePasse"
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('Usage : npx tsx scripts/reset-password.ts email "nouveau mot de passe (8 caractères min.)"');
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const all = await prisma.user.findMany({ select: { email: true } });
    console.error(`Aucun compte pour ${email}. Comptes existants : ${all.map((u) => u.email).join(", ") || "aucun"}`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  console.log(`Mot de passe de ${email} réinitialisé.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
