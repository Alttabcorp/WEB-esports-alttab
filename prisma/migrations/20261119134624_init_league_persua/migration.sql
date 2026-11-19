-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileIconId" INTEGER,
    "summonerLevel" INTEGER,
    "rankedJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "gameCreation" BIGINT NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMatch" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "win" BOOLEAN NOT NULL,
    "role" TEXT NOT NULL,
    "items" INTEGER[],

    CONSTRAINT "PlayerMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "analyzedGames" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "overallWr" DOUBLE PRECISION NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "kda" DOUBLE PRECISION NOT NULL,
    "csPerMin" DOUBLE PRECISION NOT NULL,
    "avgDamage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ChampionStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "items" INTEGER[],
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "BuildStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "myChampionId" INTEGER NOT NULL,
    "enemyChampionId" INTEGER NOT NULL,
    "enemyChampionName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "MatchupStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleStat" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "wr" DOUBLE PRECISION NOT NULL,
    "wilsonLower" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "kda" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RoleStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_puuid_key" ON "Player"("puuid");

-- CreateIndex
CREATE INDEX "Player_platform_gameName_tagLine_idx" ON "Player"("platform", "gameName", "tagLine");

-- CreateIndex
CREATE UNIQUE INDEX "Match_matchId_key" ON "Match"("matchId");

-- CreateIndex
CREATE INDEX "PlayerMatch_playerId_championId_idx" ON "PlayerMatch"("playerId", "championId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatch_playerId_matchId_key" ON "PlayerMatch"("playerId", "matchId");

-- CreateIndex
CREATE INDEX "AnalysisRun_playerId_queue_count_createdAt_idx" ON "AnalysisRun"("playerId", "queue", "count", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ChampionStat_analysisRunId_wilsonLower_idx" ON "ChampionStat"("analysisRunId", "wilsonLower" DESC);

-- CreateIndex
CREATE INDEX "ChampionStat_championId_idx" ON "ChampionStat"("championId");

-- CreateIndex
CREATE INDEX "BuildStat_analysisRunId_championId_wilsonLower_idx" ON "BuildStat"("analysisRunId", "championId", "wilsonLower" DESC);

-- CreateIndex
CREATE INDEX "MatchupStat_analysisRunId_wilsonLower_idx" ON "MatchupStat"("analysisRunId", "wilsonLower" DESC);

-- CreateIndex
CREATE INDEX "RoleStat_analysisRunId_role_idx" ON "RoleStat"("analysisRunId", "role");

-- AddForeignKey
ALTER TABLE "PlayerMatch" ADD CONSTRAINT "PlayerMatch_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatch" ADD CONSTRAINT "PlayerMatch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionStat" ADD CONSTRAINT "ChampionStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildStat" ADD CONSTRAINT "BuildStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupStat" ADD CONSTRAINT "MatchupStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleStat" ADD CONSTRAINT "RoleStat_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
