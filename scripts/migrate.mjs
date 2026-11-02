// Applique les migrations Prisma pendant le build, sans bloquer le déploiement
// quand la base n'est pas joignable depuis l'environnement de build.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn("⚠ DATABASE_URL absent pendant le build : migrations Prisma ignorées.");
  process.exit(0);
}
try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} catch {
  console.warn("⚠ Échec de « prisma migrate deploy » pendant le build : déploiement poursuivi, migrations à appliquer manuellement.");
}
