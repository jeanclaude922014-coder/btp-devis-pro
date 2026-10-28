-- CreateTable
CREATE TABLE "DalotStudy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seriesName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'non_verifie',
    "spec" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DalotStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DalotStudy_organizationId_seriesName_idx" ON "DalotStudy"("organizationId", "seriesName");

-- AddForeignKey
ALTER TABLE "DalotStudy" ADD CONSTRAINT "DalotStudy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
