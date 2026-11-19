-- CreateTable
CREATE TABLE "ReferencePlayer" (
    "id" TEXT NOT NULL,
    "appProfileId" TEXT NOT NULL DEFAULT 'default',
    "playerId" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "championIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "matchCount" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferencePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferencePlayer_appProfileId_idx" ON "ReferencePlayer"("appProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferencePlayer_appProfileId_playerId_key" ON "ReferencePlayer"("appProfileId", "playerId");

-- AddForeignKey
ALTER TABLE "ReferencePlayer" ADD CONSTRAINT "ReferencePlayer_appProfileId_fkey" FOREIGN KEY ("appProfileId") REFERENCES "AppProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferencePlayer" ADD CONSTRAINT "ReferencePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
