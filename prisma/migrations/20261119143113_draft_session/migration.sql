-- CreateTable
CREATE TABLE "DraftSession" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "allyChampionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "enemyChampionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "bannedChampionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recommendedChampionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "pickedChampionId" INTEGER,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftSession_playerId_createdAt_idx" ON "DraftSession"("playerId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "DraftSession" ADD CONSTRAINT "DraftSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
