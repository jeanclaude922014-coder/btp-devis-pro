-- CreateTable
CREATE TABLE "DqeImport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DqeImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DqeImport_organizationId_idx" ON "DqeImport"("organizationId");

-- AddForeignKey
ALTER TABLE "DqeImport" ADD CONSTRAINT "DqeImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
