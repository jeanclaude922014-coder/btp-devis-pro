import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

// Crée au démarrage les tables ajoutées par les migrations récentes quand le build
// n'a pas pu les appliquer (base injoignable depuis l'environnement de build).
// Les instructions sont idempotentes et la migration est inscrite dans
// _prisma_migrations, pour que « prisma migrate deploy » la considère appliquée.

type Migration = { name: string; checksum: string; table: string; sql: string[] };

const fk = (sql: string) => `DO $$ BEGIN ${sql}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

const MIGRATIONS: Migration[] = [
  {
    name: "20261102120000_add_dqe_imports",
    checksum: "6dd7cfbb34ab4b8af1ad46db6ad140339d39cf8a280e22910678201230eb9184",
    table: "DqeImport",
    sql: [
      `CREATE TABLE IF NOT EXISTS "DqeImport" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "data" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "DqeImport_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "DqeImport_organizationId_idx" ON "DqeImport"("organizationId")`,
      fk(`ALTER TABLE "DqeImport" ADD CONSTRAINT "DqeImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`),
    ],
  },
  {
    name: "20261103090000_add_project_tasks",
    checksum: "38504d9945dc3ab081d0f0d7a892f0a5110b5ab7feb2c04297943ffc01d045f8",
    table: "ProjectTask",
    sql: [
      `CREATE TABLE IF NOT EXISTS "ProjectTask" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "projectId" TEXT,
        "title" TEXT NOT NULL,
        "lot" TEXT,
        "status" TEXT NOT NULL DEFAULT 'a_faire',
        "progress" INTEGER NOT NULL DEFAULT 0,
        "priority" TEXT NOT NULL DEFAULT 'normale',
        "assignee" TEXT,
        "workers" INTEGER NOT NULL DEFAULT 0,
        "equipment" TEXT,
        "startDate" TIMESTAMP(3),
        "dueDate" TIMESTAMP(3),
        "notes" TEXT,
        "position" INTEGER NOT NULL DEFAULT 0,
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id"))`,
      `CREATE INDEX IF NOT EXISTS "ProjectTask_organizationId_status_idx" ON "ProjectTask"("organizationId", "status")`,
      `CREATE INDEX IF NOT EXISTS "ProjectTask_projectId_idx" ON "ProjectTask"("projectId")`,
      fk(`ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`),
      fk(`ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE`),
    ],
  },
];

async function run() {
  for (const m of MIGRATIONS) {
    const [{ exists }] = await prisma.$queryRawUnsafe<Array<{ exists: string | null }>>(
      `SELECT to_regclass('"${m.table}"')::text AS "exists"`
    );
    if (exists) continue;
    for (const stmt of m.sql) await prisma.$executeRawUnsafe(stmt);
    const [{ reg }] = await prisma.$queryRawUnsafe<Array<{ reg: string | null }>>(
      `SELECT to_regclass('"_prisma_migrations"')::text AS "reg"`
    );
    if (reg) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","started_at","applied_steps_count")
         SELECT $1, $2, now(), $3, now(), 1
         WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $3 AND "rolled_back_at" IS NULL)`,
        randomUUID(),
        m.checksum,
        m.name
      );
    }
    console.warn(`Table « ${m.table} » créée au démarrage (migration ${m.name}).`);
  }
}

let ready: Promise<void> | null = null;

/** Une seule vérification par démarrage du serveur ; un échec est journalisé et retenté au prochain appel. */
export function ensureAppSchema(): Promise<void> {
  ready ??= run().catch((e) => {
    console.error("Vérification du schéma impossible :", e);
    ready = null;
  });
  return ready;
}
