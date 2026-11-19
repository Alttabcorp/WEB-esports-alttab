-- CreateTable
CREATE TABLE "AppProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "playerId" TEXT NOT NULL,
    "preferredRole" TEXT NOT NULL DEFAULT 'MIDDLE',
    "queue" TEXT NOT NULL DEFAULT 'ranked',
    "matchCount" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppProfile_playerId_key" ON "AppProfile"("playerId");

-- AddForeignKey
ALTER TABLE "AppProfile" ADD CONSTRAINT "AppProfile_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
