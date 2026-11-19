-- AlterTable
ALTER TABLE "PlayerMatch" ADD COLUMN     "enemyChampionId" INTEGER,
ADD COLUMN     "keystone" INTEGER,
ADD COLUMN     "perkIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "primaryStyle" INTEGER,
ADD COLUMN     "runeFingerprint" TEXT,
ADD COLUMN     "subStyle" INTEGER;

-- CreateTable
CREATE TABLE "RuneStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "primaryStyle" INTEGER NOT NULL,
    "keystone" INTEGER NOT NULL,
    "subStyle" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "RuneStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuneStat_analysisRunId_championId_role_wilsonLower_idx" ON "RuneStat"("analysisRunId", "championId", "role", "wilsonLower" DESC);

-- CreateIndex
CREATE INDEX "PlayerMatch_playerId_role_idx" ON "PlayerMatch"("playerId", "role");

-- CreateIndex
CREATE INDEX "PlayerMatch_playerId_championId_role_idx" ON "PlayerMatch"("playerId", "championId", "role");

-- CreateIndex
CREATE INDEX "PlayerMatch_playerId_enemyChampionId_idx" ON "PlayerMatch"("playerId", "enemyChampionId");

-- AddForeignKey
ALTER TABLE "RuneStat" ADD CONSTRAINT "RuneStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
