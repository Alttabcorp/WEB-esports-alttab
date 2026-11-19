-- AlterTable
ALTER TABLE "PlayerMatch" ADD COLUMN     "allyChampionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "spellFingerprint" TEXT,
ADD COLUMN     "summoner1Id" INTEGER,
ADD COLUMN     "summoner2Id" INTEGER;

-- CreateTable
CREATE TABLE "AllySynergyStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "myChampionId" INTEGER NOT NULL,
    "allyChampionId" INTEGER NOT NULL,
    "allyChampionName" TEXT NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "AllySynergyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupBuildStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "myChampionId" INTEGER NOT NULL,
    "enemyChampionId" INTEGER NOT NULL,
    "enemyChampionName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "items" INTEGER[],
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "MatchupBuildStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupRuneStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "myChampionId" INTEGER NOT NULL,
    "enemyChampionId" INTEGER NOT NULL,
    "enemyChampionName" TEXT NOT NULL,
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

    CONSTRAINT "MatchupRuneStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupSpellStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "myChampionId" INTEGER NOT NULL,
    "enemyChampionId" INTEGER NOT NULL,
    "enemyChampionName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "spellIds" INTEGER[],
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "MatchupSpellStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllySynergyStat_analysisRunId_wilsonLower_idx" ON "AllySynergyStat"("analysisRunId", "wilsonLower" DESC);

-- CreateIndex
CREATE INDEX "AllySynergyStat_analysisRunId_allyChampionId_idx" ON "AllySynergyStat"("analysisRunId", "allyChampionId");

-- CreateIndex
CREATE INDEX "MatchupBuildStat_analysisRunId_myChampionId_enemyChampionId_idx" ON "MatchupBuildStat"("analysisRunId", "myChampionId", "enemyChampionId", "wilsonLower" DESC);

-- CreateIndex
CREATE INDEX "MatchupRuneStat_analysisRunId_myChampionId_enemyChampionId__idx" ON "MatchupRuneStat"("analysisRunId", "myChampionId", "enemyChampionId", "wilsonLower" DESC);

-- CreateIndex
CREATE INDEX "MatchupSpellStat_analysisRunId_myChampionId_enemyChampionId_idx" ON "MatchupSpellStat"("analysisRunId", "myChampionId", "enemyChampionId", "wilsonLower" DESC);

-- AddForeignKey
ALTER TABLE "AllySynergyStat" ADD CONSTRAINT "AllySynergyStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupBuildStat" ADD CONSTRAINT "MatchupBuildStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupRuneStat" ADD CONSTRAINT "MatchupRuneStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupSpellStat" ADD CONSTRAINT "MatchupSpellStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
