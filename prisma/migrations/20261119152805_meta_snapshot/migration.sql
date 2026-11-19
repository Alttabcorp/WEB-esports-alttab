-- CreateTable
CREATE TABLE "MetaSnapshot" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "tier" TEXT,
    "division" TEXT,
    "samplePlayers" INTEGER NOT NULL,
    "sampleGames" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaSnapshot_platform_championId_band_createdAt_idx" ON "MetaSnapshot"("platform", "championId", "band", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MetaSnapshot_platform_championId_band_tier_division_key" ON "MetaSnapshot"("platform", "championId", "band", "tier", "division");
